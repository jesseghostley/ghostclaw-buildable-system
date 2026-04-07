import { getSkill } from '../../packages/core/src/skills';

const skill = getSkill('build_site_page')!;

describe('build_site_page skill', () => {
  it('generates a site from legacy input', () => {
    const output = skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: {
        sites: [
          { businessName: 'Summit HVAC', trade: 'hvac', location: 'Denver, CO', phone: '303-555-1234', email: 'info@summithvac.com' },
        ],
      },
    }) as Record<string, unknown>;

    expect(output.handoffReady).toBe(true);
    expect(output.siteCount).toBe(1);

    const sites = output.sites as Array<Record<string, unknown>>;
    const site = sites[0];
    expect(site.slug).toBe('summit-hvac');
    expect(site.businessName).toBe('Summit HVAC');
    expect(Object.keys(site.files as object)).toEqual([
      'manifest.json', 'schema.json', 'index.html', 'services.html', 'contact.html',
    ]);
  });

  it('generates a site from SITE_CONFIG input', () => {
    const output = skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: {
        siteConfig: {
          _business: {
            business_name: 'Evergreen Plumbing Co.',
            phone: '(303) 555-0101',
            email: 'contact@evergreenplumbing.co',
            address: { city: 'Boulder', state: 'CO' },
          },
          _services: [
            { name: 'Drain Cleaning' },
            { name: 'Water Heater Repair' },
          ],
        },
      },
    }) as Record<string, unknown>;

    const sites = output.sites as Array<Record<string, unknown>>;
    const site = sites[0];
    expect(site.businessName).toBe('Evergreen Plumbing Co.');

    const manifest = site.manifest as Record<string, unknown>;
    expect(manifest.location).toBe('Boulder, CO');

    const content = manifest.content as Record<string, unknown>;
    expect(content.serviceList).toEqual(['Drain Cleaning', 'Water Heater Repair']);

    const files = site.files as Record<string, string>;
    expect(files['services.html']).toContain('<li>Drain Cleaning</li>');
    expect(files['services.html']).toContain('<li>Water Heater Repair</li>');
  });

  it('handles multiple sites in a batch', () => {
    const output = skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: {
        sites: [
          { businessName: 'Alpha Roofing', trade: 'roofing', location: 'Austin, TX' },
          { businessName: 'Beta Electric', trade: 'electrical', location: 'Dallas, TX' },
        ],
      },
    }) as Record<string, unknown>;

    expect(output.siteCount).toBe(2);
    const sites = output.sites as Array<Record<string, unknown>>;
    expect(sites[0].slug).toBe('alpha-roofing');
    expect(sites[1].slug).toBe('beta-electric');
  });

  it('throws on missing required legacy fields', () => {
    expect(() => skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: { businessName: 'No Trade' },
    })).toThrow('Legacy site input requires businessName, trade, and location.');
  });

  it('throws on missing SITE_CONFIG fields', () => {
    expect(() => skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: {
        siteConfig: {
          _business: { business_name: 'Test' },
          // missing address and services
        },
      },
    })).toThrow('SITE_CONFIG input must include');
  });

  it('generates valid JSON in manifest.json and schema.json files', () => {
    const output = skill.execute({
      signalName: 'contractor_site_requested',
      signalPayload: {
        sites: [{ businessName: 'Test Co', trade: 'plumbing', location: 'NYC, NY' }],
      },
    }) as Record<string, unknown>;

    const sites = output.sites as Array<Record<string, unknown>>;
    const files = sites[0].files as Record<string, string>;

    const manifest = JSON.parse(files['manifest.json']);
    expect(manifest.slug).toBe('test-co');

    const schema = JSON.parse(files['schema.json']);
    expect(schema['@type']).toBe('LocalBusiness');
  });
});
