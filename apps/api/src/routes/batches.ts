import { Router } from 'express';
import { processSignal } from '../../../../packages/core/src/runtime_loop';
import { publishEventStore } from '../../../../packages/core/src/publish_event';
import {
  createBatch,
  getBatch,
  listBatches,
  updateSiteEntry,
  incrementProcessed,
  resolveSiteStatus,
  getBatchSummary,
  SiteRequest,
} from '../../../../packages/core/src/batch_store';
import { exportBatch } from '../../../../packages/core/src/batch_export';

const router = Router();

// POST /api/batches/contractor-sites — submit a batch of contractor site requests
router.post('/contractor-sites', (req, res) => {
  const sites: SiteRequest[] = req.body?.sites;

  if (!Array.isArray(sites) || sites.length === 0) {
    res.status(400).json({ error: '"sites" array is required and must not be empty.' });
    return;
  }

  for (let i = 0; i < sites.length; i++) {
    if (!sites[i].businessName || !sites[i].trade || !sites[i].location) {
      res.status(400).json({ error: `Site at index ${i} missing required fields (businessName, trade, location).` });
      return;
    }
  }

  const batch = createBatch(sites);

  // Process sequentially (V1.2 — synchronous pipeline)
  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    updateSiteEntry(batch.id, i, { status: 'processing' });

    try {
      // Snapshot publish event IDs before processing
      const allBefore = new Set(publishEventStore.listAll().map((pe) => pe.id));

      const result = processSignal({
        name: 'contractor_website',
        payload: {
          businessName: site.businessName,
          trade: site.trade,
          location: site.location,
          phone: site.phone || '',
          email: site.email || '',
        },
      });

      // Find new publish events created by this signal's artifacts
      const newPublishEventIds = publishEventStore
        .listAll()
        .filter((pe) => !allBefore.has(pe.id))
        .map((pe) => pe.id);

      updateSiteEntry(batch.id, i, {
        signalId: result.signal.id,
        publishEventIds: newPublishEventIds,
        status: 'awaiting_approval',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateSiteEntry(batch.id, i, { status: 'failed', error: message });
    }

    incrementProcessed(batch.id);
  }

  const updated = getBatch(batch.id)!;
  const summary = getBatchSummary(updated);

  res.status(201).json({
    message: `Batch created. ${updated.processed}/${updated.totalSites} sites processed.`,
    batch: summary,
    sites: updated.sites.map((s) => ({
      index: s.index,
      businessName: s.businessName,
      status: resolveSiteStatus(s),
      signalId: s.signalId,
      publishEventIds: s.publishEventIds,
      error: s.error,
    })),
  });
});

// GET /api/batches — list all batches
router.get('/', (_req, res) => {
  const batches = listBatches().map(getBatchSummary);
  res.json({ batches, count: batches.length });
});

// GET /api/batches/:id — get batch detail with live per-site status
router.get('/:id', (req, res) => {
  const batch = getBatch(req.params.id);
  if (!batch) {
    res.status(404).json({ error: `Batch "${req.params.id}" not found.` });
    return;
  }

  const summary = getBatchSummary(batch);
  const sites = batch.sites.map((s) => {
    const liveStatus = resolveSiteStatus(s);

    // Find externalUrl from published publish events
    let externalUrl: string | null = null;
    for (const peId of s.publishEventIds) {
      const pe = publishEventStore.getById(peId);
      if (pe?.status === 'published' && pe.externalUrl) {
        externalUrl = pe.externalUrl;
        break;
      }
    }

    return {
      index: s.index,
      businessName: s.businessName,
      trade: s.trade,
      location: s.location,
      status: liveStatus,
      signalId: s.signalId,
      publishEventIds: s.publishEventIds,
      externalUrl,
      error: s.error,
    };
  });

  res.json({ ...summary, sites });
});

// GET /api/batches/:id/export — export batch for VA handoff
router.get('/:id/export', (req, res) => {
  const batch = getBatch(req.params.id);
  if (!batch) {
    res.status(404).json({ error: `Batch "${req.params.id}" not found.` });
    return;
  }

  const result = exportBatch(req.params.id);

  if (result.error) {
    res.status(500).json({ error: result.error });
    return;
  }

  res.json(result.manifest);
});

export default router;
