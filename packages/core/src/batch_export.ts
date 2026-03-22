/**
 * batch_export.ts — Batch export layer for VA handoff.
 *
 * Produces a self-contained export directory for a contractor batch:
 *   output/batches/<batch-id>/
 *     ├── archives/       (domain-named .tar.gz files)
 *     ├── handoff.csv
 *     └── manifest.json
 *
 * This module reads from the existing batch store and publish event store
 * (source of truth) and copies published site archives into the export dir.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getBatch, resolveSiteStatus } from './batch_store';
import type { Batch, BatchSiteEntry } from './batch_store';
import { publishEventStore } from './publish_event';
import type { PublishEvent } from './publish_event';
import { slugify } from './site_generator';

// ── Types ───────────────────────────────────────────────────────────────────

export interface BatchExportManifestSite {
  domain: string;
  businessName: string;
  location: string;
  trade: string;
  publishEventId: string | null;
  sourceOutputPath: string | null;
  exportedArchivePath: string | null;
  status: string;
  exportedAt: string;
}

export interface BatchExportManifest {
  batchId: string;
  createdAt: number;
  exportedAt: string;
  totalSites: number;
  exported: number;
  skipped: number;
  sites: BatchExportManifestSite[];
}

export interface BatchExportResult {
  manifest: BatchExportManifest;
  exportDir: string;
  csvPath: string;
  manifestPath: string;
  archiveCount: number;
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const OUTPUT_ROOT = path.resolve(__dirname, '..', '..', '..', 'output');

function sitesDir(): string {
  return path.join(OUTPUT_ROOT, 'sites');
}

function batchesDir(): string {
  return path.join(OUTPUT_ROOT, 'batches');
}

/**
 * Derive the domain slug for a site entry.
 * Matches the slugify() convention used by site_generator.
 */
function domainSlug(entry: BatchSiteEntry): string {
  return slugify(entry.businessName);
}

/**
 * Find the published archive (.tar.gz) for a publish event.
 * Returns the absolute path if found, null otherwise.
 */
function findSiteArchive(publishEventId: string): string | null {
  const siteDir = path.join(sitesDir(), publishEventId);
  if (!fs.existsSync(siteDir)) return null;

  // Look for any .tar.gz in the site directory
  const files = fs.readdirSync(siteDir);
  const archive = files.find((f) => f.endsWith('.tar.gz'));
  return archive ? path.join(siteDir, archive) : null;
}

/**
 * Find the first published publish event ID for a batch site entry.
 */
function findPublishedEventId(entry: BatchSiteEntry): string | null {
  for (const peId of entry.publishEventIds) {
    const pe = publishEventStore.getById(peId);
    if (pe && pe.status === 'published') return peId;
  }
  return null;
}

/**
 * Escape a CSV field value. Wraps in quotes if it contains commas,
 * quotes, or newlines.
 */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── Main Export Function ────────────────────────────────────────────────────

/**
 * Export a batch for VA handoff.
 *
 * Creates the export directory structure, copies archives, and generates
 * handoff.csv and manifest.json.
 *
 * This function is idempotent — calling it again overwrites previous export.
 */
export function exportBatch(batchId: string): BatchExportResult {
  const batch = getBatch(batchId);
  if (!batch) {
    return {
      manifest: {
        batchId,
        createdAt: 0,
        exportedAt: new Date().toISOString(),
        totalSites: 0,
        exported: 0,
        skipped: 0,
        sites: [],
      },
      exportDir: '',
      csvPath: '',
      manifestPath: '',
      archiveCount: 0,
      error: `Batch "${batchId}" not found.`,
    };
  }

  const exportDir = path.join(batchesDir(), batchId);
  const archivesDir = path.join(exportDir, 'archives');
  fs.mkdirSync(archivesDir, { recursive: true });

  const now = new Date().toISOString();
  const manifestSites: BatchExportManifestSite[] = [];
  const csvRows: string[] = [];

  // CSV header
  csvRows.push('index,businessName,trade,location,status,domain,publishEventId,archiveName,exportedAt');

  let exported = 0;
  let skipped = 0;

  for (const entry of batch.sites) {
    const liveStatus = resolveSiteStatus(entry);
    const domain = domainSlug(entry);
    const publishEventId = findPublishedEventId(entry);

    let sourceArchivePath: string | null = null;
    let exportedArchivePath: string | null = null;
    let archiveName = '';

    if (publishEventId && liveStatus === 'published') {
      sourceArchivePath = findSiteArchive(publishEventId);

      if (sourceArchivePath && fs.existsSync(sourceArchivePath)) {
        archiveName = `${domain}.tar.gz`;
        const destPath = path.join(archivesDir, archiveName);
        fs.copyFileSync(sourceArchivePath, destPath);
        exportedArchivePath = `archives/${archiveName}`;
        exported++;
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }

    // CSV row
    csvRows.push([
      String(entry.index),
      csvEscape(entry.businessName),
      csvEscape(entry.trade),
      csvEscape(entry.location),
      liveStatus,
      domain,
      publishEventId || '',
      archiveName,
      now,
    ].join(','));

    // Manifest entry
    manifestSites.push({
      domain,
      businessName: entry.businessName,
      location: entry.location,
      trade: entry.trade,
      publishEventId,
      sourceOutputPath: sourceArchivePath ? path.relative(OUTPUT_ROOT, sourceArchivePath) : null,
      exportedArchivePath,
      status: liveStatus,
      exportedAt: now,
    });
  }

  const manifest: BatchExportManifest = {
    batchId: batch.id,
    createdAt: batch.createdAt,
    exportedAt: now,
    totalSites: batch.totalSites,
    exported,
    skipped,
    sites: manifestSites,
  };

  // Write files
  const csvPath = path.join(exportDir, 'handoff.csv');
  const manifestPath = path.join(exportDir, 'manifest.json');

  fs.writeFileSync(csvPath, csvRows.join('\n') + '\n');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return {
    manifest,
    exportDir,
    csvPath,
    manifestPath,
    archiveCount: exported,
  };
}
