import { transformCsv } from '../tools/csv-to-ghostclaw';

describe('CSV → GhostClaw ingestion', () => {
  const sampleCsv = `businessName,trade,location,phone,email
Apex Roofing,roofing,"Denver, CO",303-555-0101,info@apex.com
Summit Plumbing,plumbing,"Boulder, Colorado",303-555-0202,
Apex Roofing,roofing,"Denver, CO",303-555-9999,dupe@apex.com
,electrical,"Austin, TX",,
Green Valley Landscaping,landscaping,"Portland, OR",,
Missing Location Co,plumbing,,,
Reliable HVAC,hvac,Dallas Texas,214-555-0505,`;

  it('processes valid rows and produces correct site count', () => {
    const result = transformCsv(sampleCsv);
    // Apex Roofing (1), Summit Plumbing (1), Green Valley (1), Reliable HVAC (1) = 4
    // Skipped: Apex dupe, missing businessName, missing location
    expect(result.sites.length).toBe(4);
    expect(result.stats.processed).toBe(4);
  });

  it('skips rows missing businessName', () => {
    const result = transformCsv(sampleCsv);
    const missing = result.stats.skipReasons.find((r) => r.reason === 'missing businessName');
    expect(missing).toBeDefined();
  });

  it('skips rows missing location', () => {
    const result = transformCsv(sampleCsv);
    const missing = result.stats.skipReasons.find((r) => r.reason === 'missing location');
    expect(missing).toBeDefined();
  });

  it('deduplicates by domain (businessName + location)', () => {
    const result = transformCsv(sampleCsv);
    expect(result.stats.duplicatesRemoved).toBe(1);
    const dupeReason = result.stats.skipReasons.find((r) => r.reason.includes('duplicate'));
    expect(dupeReason).toBeDefined();
  });

  it('normalizes "Boulder, Colorado" to "Boulder, CO"', () => {
    const result = transformCsv(sampleCsv);
    const summit = result.sites.find((s) => s.businessName === 'Summit Plumbing');
    expect(summit).toBeDefined();
    expect(summit!.city).toBe('Boulder');
    expect(summit!.state).toBe('CO');
    expect(summit!.location).toBe('Boulder, CO');
  });

  it('normalizes "Dallas Texas" (no comma) to "Dallas, TX"', () => {
    const result = transformCsv(sampleCsv);
    const hvac = result.sites.find((s) => s.businessName === 'Reliable HVAC');
    expect(hvac).toBeDefined();
    expect(hvac!.city).toBe('Dallas');
    expect(hvac!.state).toBe('TX');
  });

  it('assigns row_id for traceability', () => {
    const result = transformCsv(sampleCsv);
    expect(result.sites[0].row_id).toBe(1); // first data row
    // Summit is row 2 in source
    const summit = result.sites.find((s) => s.businessName === 'Summit Plumbing');
    expect(summit!.row_id).toBe(2);
  });

  it('generates tags including trade and category', () => {
    const result = transformCsv(sampleCsv);
    const apex = result.sites.find((s) => s.businessName === 'Apex Roofing');
    expect(apex!.tags).toContain('roofing');
    expect(apex!.tags).toContain('construction');
    expect(apex!.tags).toContain('contractor-site');
  });

  it('appends extra tags when provided', () => {
    const result = transformCsv(sampleCsv, ['priority', 'q1-2026']);
    const apex = result.sites.find((s) => s.businessName === 'Apex Roofing');
    expect(apex!.tags).toContain('priority');
    expect(apex!.tags).toContain('q1-2026');
  });

  it('produces output compatible with /api/batches/contractor-sites', () => {
    const result = transformCsv(sampleCsv);
    for (const site of result.sites) {
      // Required fields for the endpoint
      expect(typeof site.businessName).toBe('string');
      expect(site.businessName.length).toBeGreaterThan(0);
      expect(typeof site.trade).toBe('string');
      expect(site.trade.length).toBeGreaterThan(0);
      expect(typeof site.location).toBe('string');
      expect(site.location.length).toBeGreaterThan(0);
    }
  });

  it('handles CSV with only a header row', () => {
    const result = transformCsv('businessName,trade,location,phone,email\n');
    expect(result.sites.length).toBe(0);
    expect(result.stats.totalRows).toBe(0);
  });

  it('handles quoted fields with commas inside', () => {
    const csv = `businessName,trade,location,phone,email
"Smith & Sons, LLC",plumbing,"Salt Lake City, UT",801-555-0001,`;
    const result = transformCsv(csv);
    expect(result.sites.length).toBe(1);
    expect(result.sites[0].businessName).toBe('Smith & Sons, LLC');
    expect(result.sites[0].city).toBe('Salt Lake City');
    expect(result.sites[0].state).toBe('UT');
  });

  it('defaults trade to "general" when missing', () => {
    const csv = `businessName,trade,location
Some Company,,"Miami, FL"`;
    const result = transformCsv(csv);
    expect(result.sites[0].trade).toBe('general');
  });
});
