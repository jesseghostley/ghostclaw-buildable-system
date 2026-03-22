#!/usr/bin/env ts-node
/**
 * CSV → GhostClaw Ingestion Script
 *
 * Reads a CSV of contractor sites and transforms it into the JSON payload
 * expected by POST /api/batches/contractor-sites.
 *
 * Features:
 *   - Deduplication by domain (businessName normalized to a domain key)
 *   - Skips incomplete rows (businessName + location required)
 *   - Normalizes location into city / state fields
 *   - Adds tags array for GhostClaw routing
 *   - Adds row_id for traceability back to source CSV
 *   - --dry-run mode (prints payload without sending)
 *   - Detailed logging (processed / skipped / duplicates)
 *
 * Usage:
 *   ts-node tools/csv-to-ghostclaw.ts <file.csv> [options]
 *
 * Options:
 *   --dry-run           Print JSON output without POSTing to GhostClaw
 *   --endpoint <url>    Override API endpoint (default: http://localhost:3000/api/batches/contractor-sites)
 *   --tags <t1,t2>      Extra tags to attach to every site (comma-separated)
 *   --out <file.json>   Write output JSON to a file
 *
 * CSV columns (header row required):
 *   businessName  (required)
 *   trade
 *   location      (required — "City, ST" or "City, State" or "City State")
 *   phone
 *   email
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';

// ── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  [key: string]: string;
}

interface SitePayload {
  row_id: number;
  businessName: string;
  trade: string;
  location: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  tags: string[];
}

interface IngestionResult {
  sites: SitePayload[];
  stats: {
    totalRows: number;
    processed: number;
    skipped: number;
    duplicatesRemoved: number;
    skipReasons: { row: number; reason: string }[];
  };
}

// ── US State Normalization ───────────────────────────────────────────────────

const STATE_ABBREVS: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY', 'district of columbia': 'DC',
};

const VALID_ABBREVS = new Set(Object.values(STATE_ABBREVS));

// ── CSV Parsing (zero-dependency) ────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: CsvRow = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    row._lineNumber = String(i + 1); // 1-indexed, accounts for header
    rows.push(row);
  }

  return rows;
}

// ── Location Normalization ───────────────────────────────────────────────────

function normalizeLocation(raw: string): { city: string; state: string; normalized: string } {
  const trimmed = raw.trim();

  // Try "City, ST" or "City, State"
  const commaMatch = trimmed.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    const city = commaMatch[1].trim();
    const statePart = commaMatch[2].trim();
    const state = resolveState(statePart);
    return { city: titleCase(city), state, normalized: `${titleCase(city)}, ${state}` };
  }

  // Try "City ST" (last token is a 2-letter state)
  const tokens = trimmed.split(/\s+/);
  if (tokens.length >= 2) {
    const lastToken = tokens[tokens.length - 1];
    if (lastToken.length === 2 && VALID_ABBREVS.has(lastToken.toUpperCase())) {
      const city = tokens.slice(0, -1).join(' ');
      const state = lastToken.toUpperCase();
      return { city: titleCase(city), state, normalized: `${titleCase(city)}, ${state}` };
    }
    // Last token might be a full state name
    const state = resolveState(lastToken);
    if (state !== lastToken) {
      const city = tokens.slice(0, -1).join(' ');
      return { city: titleCase(city), state, normalized: `${titleCase(city)}, ${state}` };
    }
  }

  // Fallback: return as-is with empty state
  return { city: titleCase(trimmed), state: '', normalized: titleCase(trimmed) };
}

function resolveState(input: string): string {
  const upper = input.toUpperCase();
  if (VALID_ABBREVS.has(upper)) return upper;
  const lower = input.toLowerCase();
  if (STATE_ABBREVS[lower]) return STATE_ABBREVS[lower];
  return input;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
}

// ── Deduplication ────────────────────────────────────────────────────────────

function domainKey(businessName: string, location: string): string {
  return `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}::${location.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

// ── Tag Inference ────────────────────────────────────────────────────────────

function inferTags(trade: string, businessName: string): string[] {
  const tags: string[] = [];
  const tradeLower = trade.toLowerCase();
  const nameLower = businessName.toLowerCase();

  // Trade-based tags
  if (tradeLower) tags.push(tradeLower.replace(/\s+/g, '-'));

  // Broad category tags
  const categories: Record<string, string[]> = {
    construction: ['roofing', 'siding', 'framing', 'general contractor', 'remodel', 'renovation', 'addition'],
    'home-services': ['plumbing', 'electrical', 'hvac', 'pest control', 'cleaning', 'painting', 'handyman'],
    landscaping: ['landscaping', 'lawn', 'tree', 'garden', 'irrigation', 'hardscape'],
    specialty: ['solar', 'pool', 'fencing', 'concrete', 'masonry', 'drywall', 'flooring', 'tile'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((kw) => tradeLower.includes(kw) || nameLower.includes(kw))) {
      tags.push(category);
      break;
    }
  }

  tags.push('contractor-site'); // always tag for GhostClaw routing
  return [...new Set(tags)];
}

// ── Core Transform ───────────────────────────────────────────────────────────

export function transformCsv(content: string, extraTags: string[] = []): IngestionResult {
  const rows = parseCsv(content);
  const seen = new Map<string, number>(); // domainKey → row_id of first occurrence
  const sites: SitePayload[] = [];
  const skipReasons: { row: number; reason: string }[] = [];
  let duplicatesRemoved = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = parseInt(row._lineNumber || String(i + 2), 10);
    const rowId = i + 1; // 1-indexed row_id in source CSV (excluding header)

    // Map flexible column names
    const businessName = (row.businessname || row.business || row.name || row.company || '').trim();
    const trade = (row.trade || row.service || row.industry || row.type || '').trim();
    const location = (row.location || row.city || row.address || '').trim();
    const phone = (row.phone || row.telephone || row.tel || '').trim();
    const email = (row.email || row.mail || '').trim();

    // Validate required fields
    if (!businessName) {
      skipReasons.push({ row: lineNum, reason: 'missing businessName' });
      continue;
    }
    if (!location) {
      skipReasons.push({ row: lineNum, reason: 'missing location' });
      continue;
    }

    // Normalize location
    const loc = normalizeLocation(location);

    // Deduplicate by domain key
    const key = domainKey(businessName, loc.normalized);
    if (seen.has(key)) {
      duplicatesRemoved++;
      skipReasons.push({
        row: lineNum,
        reason: `duplicate of row ${seen.get(key)} (${businessName})`,
      });
      continue;
    }
    seen.set(key, rowId);

    // Build tags
    const tags = [...inferTags(trade, businessName), ...extraTags];

    sites.push({
      row_id: rowId,
      businessName,
      trade: trade || 'general',
      location: loc.normalized,
      city: loc.city,
      state: loc.state,
      phone,
      email,
      tags,
    });
  }

  return {
    sites,
    stats: {
      totalRows: rows.length,
      processed: sites.length,
      skipped: skipReasons.filter((r) => !r.reason.startsWith('duplicate')).length,
      duplicatesRemoved,
      skipReasons,
    },
  };
}

// ── HTTP POST Helper ─────────────────────────────────────────────────────────

function postJson(url: string, body: object): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;

    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk: Buffer) => (responseBody += chunk.toString()));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: responseBody }));
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: ts-node tools/csv-to-ghostclaw.ts <file.csv> [options]

Options:
  --dry-run           Print JSON output without POSTing
  --endpoint <url>    Override API endpoint
  --tags <t1,t2>      Extra tags (comma-separated)
  --out <file.json>   Write output to file`);
    process.exit(0);
  }

  // Parse args
  const csvPath = args[0];
  const dryRun = args.includes('--dry-run');
  const endpointIdx = args.indexOf('--endpoint');
  const endpoint =
    endpointIdx >= 0 && args[endpointIdx + 1]
      ? args[endpointIdx + 1]
      : 'http://localhost:3000/api/batches/contractor-sites';
  const tagsIdx = args.indexOf('--tags');
  const extraTags =
    tagsIdx >= 0 && args[tagsIdx + 1] ? args[tagsIdx + 1].split(',').map((t) => t.trim()) : [];
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : null;

  // Read CSV
  const resolved = path.resolve(csvPath);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: File not found: ${resolved}`);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const result = transformCsv(content, extraTags);

  // Log stats
  console.log('\n── CSV Ingestion Report ──────────────────────────');
  console.log(`  Source:              ${resolved}`);
  console.log(`  Total rows:          ${result.stats.totalRows}`);
  console.log(`  Rows processed:      ${result.stats.processed}`);
  console.log(`  Rows skipped:        ${result.stats.skipped}`);
  console.log(`  Duplicates removed:  ${result.stats.duplicatesRemoved}`);
  if (result.stats.skipReasons.length > 0) {
    console.log('\n  Skip details:');
    for (const sr of result.stats.skipReasons) {
      console.log(`    Row ${sr.row}: ${sr.reason}`);
    }
  }
  console.log('──────────────────────────────────────────────────\n');

  // Build the /api/batches/contractor-sites payload
  const payload = {
    sites: result.sites.map((s) => ({
      businessName: s.businessName,
      trade: s.trade,
      location: s.location,
      phone: s.phone || undefined,
      email: s.email || undefined,
      // Extended fields (pass-through; GhostClaw ignores unknown fields)
      row_id: s.row_id,
      city: s.city,
      state: s.state,
      tags: s.tags,
    })),
  };

  // Write output file if requested
  if (outPath) {
    fs.writeFileSync(path.resolve(outPath), JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`Output written to: ${path.resolve(outPath)}`);
  }

  if (dryRun) {
    console.log('DRY RUN — payload that would be sent:\n');
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\n${result.sites.length} site(s) ready for ingestion.`);
    return;
  }

  // POST to GhostClaw
  console.log(`Sending ${result.sites.length} sites to ${endpoint} ...`);
  try {
    const res = await postJson(endpoint, payload);
    console.log(`Response: ${res.status}`);
    console.log(res.body);
  } catch (err) {
    console.error('POST failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// Only run CLI when executed directly (not when imported by tests)
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
