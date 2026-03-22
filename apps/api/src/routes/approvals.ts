import { Router } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { publishEventStore } from '../../../../packages/core/src/publish_event';
import { auditLog } from '../../../../packages/core/src/audit_log';
import { eventBus } from '../../../../packages/core/src/event_bus';
import { generateSite } from '../../../../packages/core/src/site_generator';
import { uniqueId } from '../../../../packages/core/src/unique_id';

const router = Router();

// GET /api/approvals/pending — list all pending publish events awaiting approval
router.get('/pending', (_req, res) => {
  const pending = publishEventStore.listByStatus('pending');
  res.json({ pending, count: pending.length });
});

// GET /api/approvals/history — list approved, published, and rejected events
router.get('/history', (_req, res) => {
  const approved = publishEventStore.listByStatus('approved');
  const published = publishEventStore.listByStatus('published');
  const rejected = publishEventStore.listByStatus('rejected');
  const items = [...approved, ...published, ...rejected].sort((a, b) => b.publishedAt - a.publishedAt);
  res.json({ items, count: items.length });
});

// GET /api/approvals/:id — get a specific publish event
router.get('/:id', (req, res) => {
  const event = publishEventStore.getById(req.params.id);
  if (!event) {
    res.status(404).json({ error: `Publish event "${req.params.id}" not found.` });
    return;
  }
  res.json(event);
});

// POST /api/approvals/:id/approve — operator approves a pending publish event
router.post('/:id/approve', (req, res) => {
  const event = publishEventStore.getById(req.params.id);
  if (!event) {
    res.status(404).json({ error: `Publish event "${req.params.id}" not found.` });
    return;
  }
  if (event.status !== 'pending') {
    res.status(409).json({ error: `Cannot approve event in "${event.status}" state. Must be "pending".` });
    return;
  }

  const approvedBy = req.body?.approvedBy ?? 'operator:unknown';
  const now = Date.now();

  publishEventStore.updateStatus(event.id, 'approved', {
    approvedBy,
    approvedAt: now,
  });

  auditLog.append({
    id: uniqueId('audit'),
    eventType: 'publish_event.approved',
    objectType: 'PublishEvent',
    objectId: event.id,
    actorId: approvedBy,
    timestamp: now,
    summary: `Publish event "${event.id}" approved by ${approvedBy}.`,
    workspaceId: 'default',
  });

  res.json(publishEventStore.getById(event.id));
});

// POST /api/approvals/:id/reject — operator rejects a pending publish event
router.post('/:id/reject', (req, res) => {
  const event = publishEventStore.getById(req.params.id);
  if (!event) {
    res.status(404).json({ error: `Publish event "${req.params.id}" not found.` });
    return;
  }
  if (event.status !== 'pending') {
    res.status(409).json({ error: `Cannot reject event in "${event.status}" state. Must be "pending".` });
    return;
  }

  const rejectedBy = req.body?.rejectedBy ?? 'operator:unknown';
  const reason = req.body?.reason ?? 'No reason provided.';
  const now = Date.now();

  publishEventStore.updateStatus(event.id, 'rejected', {
    failureReason: reason,
  });

  auditLog.append({
    id: uniqueId('audit'),
    eventType: 'publish_event.rejected',
    objectType: 'PublishEvent',
    objectId: event.id,
    actorId: rejectedBy,
    timestamp: now,
    summary: `Publish event "${event.id}" rejected by ${rejectedBy}: ${reason}`,
    workspaceId: 'default',
  });

  res.json(publishEventStore.getById(event.id));
});

// POST /api/approvals/:id/publish — publish an approved event
router.post('/:id/publish', (req, res) => {
  const event = publishEventStore.getById(req.params.id);
  if (!event) {
    res.status(404).json({ error: `Publish event "${req.params.id}" not found.` });
    return;
  }
  if (event.status !== 'approved') {
    res.status(409).json({ error: `Cannot publish event in "${event.status}" state. Must be "approved".` });
    return;
  }

  const now = Date.now();

  // Generate static site from artifacts
  const siteResult = generateSite(event.id, event.artifactId);
  const externalUrl = siteResult.error
    ? (req.body?.externalUrl ?? '')
    : siteResult.siteUrl;

  publishEventStore.updateStatus(event.id, 'published', {
    externalUrl,
  });

  const published = publishEventStore.getById(event.id)!;
  eventBus.emit('publish.completed', published);

  auditLog.append({
    id: uniqueId('audit'),
    eventType: 'publish_event.published',
    objectType: 'PublishEvent',
    objectId: event.id,
    actorId: event.approvedBy ?? 'runtime',
    timestamp: now,
    summary: `Publish event "${event.id}" published to ${event.destination}.`,
    workspaceId: 'default',
    metadata: {
      externalUrl,
      outputDir: siteResult.outputDir,
      files: siteResult.files,
      businessSlug: siteResult.businessSlug,
    },
  });

  res.json({
    ...published,
    site: siteResult.error
      ? { error: siteResult.error }
      : {
          outputDir: siteResult.outputDir,
          files: siteResult.files,
          siteUrl: siteResult.siteUrl,
          businessSlug: siteResult.businessSlug,
          zipPath: siteResult.zipPath,
        },
  });
});

// GET /api/approvals/:id/export — download the cPanel-ready .tar.gz archive
router.get('/:id/export', (req, res) => {
  const event = publishEventStore.getById(req.params.id);
  if (!event) {
    res.status(404).json({ error: `Publish event "${req.params.id}" not found.` });
    return;
  }
  if (event.status !== 'published') {
    res.status(409).json({ error: `Cannot export event in "${event.status}" state. Must be "published".` });
    return;
  }

  const siteRoot = path.resolve(__dirname, '..', '..', '..', '..', 'output', 'sites', event.id);
  // Find the .tar.gz file in the site root
  let archivePath: string | null = null;
  if (fs.existsSync(siteRoot)) {
    const files = fs.readdirSync(siteRoot);
    const archive = files.find((f) => f.endsWith('.tar.gz'));
    if (archive) archivePath = path.join(siteRoot, archive);
  }

  if (!archivePath || !fs.existsSync(archivePath)) {
    res.status(404).json({ error: 'Export archive not found. Re-publish to regenerate.' });
    return;
  }

  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(archivePath)}"`);
  fs.createReadStream(archivePath).pipe(res);
});

export default router;
