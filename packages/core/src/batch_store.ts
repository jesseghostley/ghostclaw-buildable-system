import { publishEventStore } from './publish_event';
import { getStores } from './store_provider';
import type Database from 'better-sqlite3';

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

// ── In-memory fallback ───────────────────────────────────────────────────────
const batches: Map<string, Batch> = new Map();
let batchCounter = 0;

// ── SQLite helpers ───────────────────────────────────────────────────────────

function getDb(): Database.Database | null {
  return getStores()?.db ?? null;
}

/** Ensure the batches table exists. Called lazily on first write. */
let _tableCreated = false;
function ensureTable(db: Database.Database): void {
  if (_tableCreated) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      createdAt INTEGER NOT NULL,
      totalSites INTEGER NOT NULL,
      processed INTEGER NOT NULL,
      sites TEXT NOT NULL
    )
  `);
  _tableCreated = true;
}

function saveBatch(batch: Batch): void {
  const db = getDb();
  if (!db) {
    batches.set(batch.id, batch);
    return;
  }
  ensureTable(db);
  const existing = db.prepare('SELECT id FROM batches WHERE id = ?').get(batch.id);
  if (existing) {
    db.prepare('UPDATE batches SET processed = ?, sites = ? WHERE id = ?')
      .run(batch.processed, JSON.stringify(batch.sites), batch.id);
  } else {
    db.prepare('INSERT INTO batches (id, createdAt, totalSites, processed, sites) VALUES (?, ?, ?, ?, ?)')
      .run(batch.id, batch.createdAt, batch.totalSites, batch.processed, JSON.stringify(batch.sites));
  }
  // Keep in-memory cache in sync
  batches.set(batch.id, batch);
}

function loadBatch(id: string): Batch | undefined {
  const db = getDb();
  if (!db) return batches.get(id);
  ensureTable(db);
  const row = db.prepare('SELECT * FROM batches WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return batches.get(id);
  return rowToBatch(row);
}

function loadAllBatches(): Batch[] {
  const db = getDb();
  if (!db) return Array.from(batches.values());
  ensureTable(db);
  const rows = db.prepare('SELECT * FROM batches ORDER BY createdAt DESC').all() as Record<string, unknown>[];
  return rows.map(rowToBatch);
}

function rowToBatch(row: Record<string, unknown>): Batch {
  return {
    id: row.id as string,
    createdAt: row.createdAt as number,
    totalSites: row.totalSites as number,
    processed: row.processed as number,
    sites: JSON.parse(row.sites as string) as BatchSiteEntry[],
  };
}

// ── Public API (unchanged signatures) ────────────────────────────────────────

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
  saveBatch(batch);
  return batch;
}

export function getBatch(id: string): Batch | undefined {
  return loadBatch(id);
}

export function listBatches(): Batch[] {
  return loadAllBatches().sort((a, b) => b.createdAt - a.createdAt);
}

export function updateSiteEntry(
  batchId: string,
  index: number,
  update: Partial<BatchSiteEntry>,
): void {
  const batch = loadBatch(batchId);
  if (!batch || !batch.sites[index]) return;
  Object.assign(batch.sites[index], update);
  saveBatch(batch);
}

export function incrementProcessed(batchId: string): void {
  const batch = loadBatch(batchId);
  if (batch) {
    batch.processed++;
    saveBatch(batch);
  }
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
