import { publishEventStore } from './publish_event';

export type SiteRequest = {
  businessName: string;
  trade: string;
  location: string;
  phone?: string;
  email?: string;
  workspaceId?: string;
};

export type BatchSiteStatus = 'queued' | 'processing' | 'awaiting_approval' | 'approved' | 'published' | 'failed';

export type BatchSiteEntry = {
  index: number;
  businessName: string;
  trade: string;
  location: string;
  status: BatchSiteStatus;
  signalId: string | null;
  publishEventIds: string[];
  error?: string;
};

export type Batch = {
  id: string;
  createdAt: number;
  sites: BatchSiteEntry[];
  totalSites: number;
  processed: number;
};

const batches: Map<string, Batch> = new Map();
let batchCounter = 0;

export function createBatch(sites: SiteRequest[]): Batch {
  batchCounter++;
  const id = `batch_${batchCounter}_${Date.now()}`;
  const batch: Batch = {
    id,
    createdAt: Date.now(),
    sites: sites.map((s, i) => ({
      index: i,
      businessName: s.businessName,
      trade: s.trade,
      location: s.location,
      status: 'queued' as BatchSiteStatus,
      signalId: null,
      publishEventIds: [],
    })),
    totalSites: sites.length,
    processed: 0,
  };
  batches.set(id, batch);
  return batch;
}

export function getBatch(id: string): Batch | undefined {
  return batches.get(id);
}

export function listBatches(): Batch[] {
  return Array.from(batches.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function updateSiteEntry(
  batchId: string,
  index: number,
  update: Partial<BatchSiteEntry>,
): void {
  const batch = batches.get(batchId);
  if (!batch || !batch.sites[index]) return;
  Object.assign(batch.sites[index], update);
}

export function incrementProcessed(batchId: string): void {
  const batch = batches.get(batchId);
  if (batch) batch.processed++;
}

/** Resolve live per-site status from publish event store. */
export function resolveSiteStatus(entry: BatchSiteEntry): BatchSiteStatus {
  if (entry.status === 'failed') return 'failed';
  if (entry.publishEventIds.length === 0) return entry.status;

  // Check publish events for the most advanced status
  let hasPublished = false;
  let hasApproved = false;
  let hasPending = false;

  for (const peId of entry.publishEventIds) {
    const pe = publishEventStore.getById(peId);
    if (!pe) continue;
    if (pe.status === 'published') hasPublished = true;
    else if (pe.status === 'approved') hasApproved = true;
    else if (pe.status === 'pending') hasPending = true;
  }

  if (hasPublished) return 'published';
  if (hasApproved) return 'approved';
  if (hasPending) return 'awaiting_approval';
  return entry.status;
}

export function getBatchSummary(batch: Batch): {
  id: string;
  createdAt: number;
  totalSites: number;
  processed: number;
  statusCounts: Record<BatchSiteStatus, number>;
} {
  const statusCounts: Record<BatchSiteStatus, number> = {
    queued: 0, processing: 0, awaiting_approval: 0, approved: 0, published: 0, failed: 0,
  };
  for (const site of batch.sites) {
    statusCounts[resolveSiteStatus(site)]++;
  }
  return { id: batch.id, createdAt: batch.createdAt, totalSites: batch.totalSites, processed: batch.processed, statusCounts };
}
