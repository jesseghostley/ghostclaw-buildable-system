import * as fs from 'fs';
import * as path from 'path';
import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';
import { auditLog } from '../packages/core/src/audit_log';
import { publishEventStore } from '../packages/core/src/publish_event';
import { eventBus } from '../packages/core/src/event_bus';
import {
  registerRuntimeSubscribers,
  resetSubscriberState,
} from '../packages/core/src/runtime_subscribers';
import {
  createBatch,
  getBatch,
  updateSiteEntry,
} from '../packages/core/src/batch_store';
import { exportBatch } from '../packages/core/src/batch_export';
import { generateSite } from '../packages/core/src/site_generator';

const OUTPUT_ROOT = path.resolve(__dirname, '..', 'output');

function resetAll() {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
  assignmentStore.reset();
  auditLog.reset();
  publishEventStore.reset();
  eventBus.reset();
  resetSubscriberState();
  registerRuntimeSubscribers();
}

function cleanupExportDir(batchId: string) {
  const dir = path.join(OUTPUT_ROOT, 'batches', batchId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

beforeEach(resetAll);

describe('Batch Export', () => {
  it('returns error for non-existent batch', () => {
    const result = exportBatch('batch_nonexistent');
    expect(result.error).toMatch(/not found/);
    expect(result.archiveCount).toBe(0);
  });

  it('exports a batch with no published sites (all skipped)', () => {
    const batch = createBatch([
      { businessName: 'Test Plumbing', trade: 'plumbing', location: 'Austin, TX' },
    ]);

    const result = exportBatch(batch.id);
    expect(result.error).toBeUndefined();
    expect(result.manifest.batchId).toBe(batch.id);
    expect(result.manifest.totalSites).toBe(1);
    expect(result.manifest.exported).toBe(0);
    expect(result.manifest.skipped).toBe(1);
    expect(result.manifest.sites).toHaveLength(1);
    expect(result.manifest.sites[0].domain).toBe('test-plumbing');
    expect(result.manifest.sites[0].status).toBe('queued');

    // CSV should exist with header + 1 data row
    expect(fs.existsSync(result.csvPath)).toBe(true);
    const csv = fs.readFileSync(result.csvPath, 'utf-8');
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[0]).toContain('index,businessName,trade,location,status,domain,publishEventId,archiveName,exportedAt');

    // Manifest should exist
    expect(fs.existsSync(result.manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf-8'));
    expect(manifest.batchId).toBe(batch.id);

    cleanupExportDir(batch.id);
  });

  it('exports a batch with published sites including archives', () => {
    // Process a signal through the full pipeline
    const signalResult = processSignal({
      name: 'contractor_website',
      payload: {
        businessName: 'Summit HVAC',
        trade: 'hvac',
        location: 'Denver, CO',
        phone: '303-555-0100',
        email: 'info@summithvac.example.com',
      },
    });

    // Get the pending publish events created by the pipeline
    const pendingEvents = publishEventStore.listByStatus('pending');
    expect(pendingEvents.length).toBeGreaterThan(0);

    const pe = pendingEvents[0];

    // Approve the publish event
    publishEventStore.updateStatus(pe.id, 'approved', {
      approvedBy: 'test-operator',
      approvedAt: Date.now(),
    });

    // Publish — generate the site
    const siteResult = generateSite(pe.id, pe.artifactId);
    expect(siteResult.error).toBeUndefined();

    // Mark as published
    publishEventStore.updateStatus(pe.id, 'published', {
      externalUrl: `/sites/${pe.id}/public_html/`,
    });

    // Create a batch that references this signal
    const batch = createBatch([
      { businessName: 'Summit HVAC', trade: 'hvac', location: 'Denver, CO' },
    ]);

    // Update the batch entry with the publish event ID
    updateSiteEntry(batch.id, 0, {
      signalId: signalResult.signal.id,
      publishEventIds: [pe.id],
      status: 'published',
    });

    // Export the batch
    const result = exportBatch(batch.id);
    expect(result.error).toBeUndefined();
    expect(result.manifest.exported).toBe(1);
    expect(result.manifest.skipped).toBe(0);
    expect(result.archiveCount).toBe(1);

    // Verify archive was copied
    const archivesDir = path.join(result.exportDir, 'archives');
    expect(fs.existsSync(archivesDir)).toBe(true);
    const archives = fs.readdirSync(archivesDir);
    expect(archives).toHaveLength(1);
    expect(archives[0]).toBe('summit-hvac.tar.gz');

    // Verify CSV columns
    const csv = fs.readFileSync(result.csvPath, 'utf-8');
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(2);
    const header = lines[0];
    expect(header).toBe('index,businessName,trade,location,status,domain,publishEventId,archiveName,exportedAt');
    const dataLine = lines[1];
    // Location contains comma so it's quoted — verify key fields are present
    expect(dataLine).toMatch(/^0,Summit HVAC,hvac,"Denver, CO",published,summit-hvac,/);

    // Verify manifest.json fields
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf-8'));
    expect(manifest.batchId).toBe(batch.id);
    expect(manifest.exportedAt).toBeDefined();
    expect(manifest.sites[0].domain).toBe('summit-hvac');
    expect(manifest.sites[0].businessName).toBe('Summit HVAC');
    expect(manifest.sites[0].location).toBe('Denver, CO');
    expect(manifest.sites[0].trade).toBe('hvac');
    expect(manifest.sites[0].publishEventId).toBe(pe.id);
    expect(manifest.sites[0].sourceOutputPath).toBeDefined();
    expect(manifest.sites[0].exportedArchivePath).toBe('archives/summit-hvac.tar.gz');
    expect(manifest.sites[0].status).toBe('published');
    expect(manifest.sites[0].exportedAt).toBeDefined();

    cleanupExportDir(batch.id);
  });

  it('is idempotent — re-exporting overwrites cleanly', () => {
    const batch = createBatch([
      { businessName: 'Quick Fix Plumbing', trade: 'plumbing', location: 'Miami, FL' },
    ]);

    const result1 = exportBatch(batch.id);
    expect(fs.existsSync(result1.csvPath)).toBe(true);

    const result2 = exportBatch(batch.id);
    expect(fs.existsSync(result2.csvPath)).toBe(true);
    expect(result2.manifest.batchId).toBe(batch.id);

    cleanupExportDir(batch.id);
  });

  it('CSV properly escapes fields containing commas', () => {
    const batch = createBatch([
      { businessName: 'Smith, Jones & Co', trade: 'roofing', location: 'Portland, OR' },
    ]);

    const result = exportBatch(batch.id);
    const csv = fs.readFileSync(result.csvPath, 'utf-8');
    const dataLine = csv.trim().split('\n')[1];

    // businessName and location should be quoted because they contain commas
    expect(dataLine).toContain('"Smith, Jones & Co"');
    expect(dataLine).toContain('"Portland, OR"');

    cleanupExportDir(batch.id);
  });
});
