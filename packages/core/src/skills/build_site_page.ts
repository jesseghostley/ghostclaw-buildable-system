import type { SkillModule } from './index';

type LegacySiteInput = {
  businessName?: string;
  trade?: string;
  location?: string;
  phone?: string;
  email?: string;
};

type SiteConfigInput = {
  _business?: {
    business_name?: string;
    phone?: string;
    email?: string;
    address?: {
      city?: string;
      state?: string;
    };
  };
  _services?: Array<{
    name?: string;
  }>;
};

type NormalizedSiteInput = {
  businessName: string;
  trade: string;
  location: string;
  phone?: string;
  email?: string;
  serviceNames: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeSiteFromSiteConfig(config: SiteConfigInput): NormalizedSiteInput {
  const businessName = config._business?.business_name?.trim() ?? '';
  const city = config._business?.address?.city?.trim() ?? '';
  const state = config._business?.address?.state?.trim() ?? '';
  const location = [city, state].filter(Boolean).join(', ');
  const serviceNames = (config._services ?? [])
    .map((s) => s.name?.trim() ?? '')
    .filter(Boolean);

  if (!businessName || !location || serviceNames.length === 0) {
    throw new Error(
      'SITE_CONFIG input must include _business.business_name, _business.address.city/state, and at least one _services[].name.',
    );
  }

  return {
    businessName,
    trade: serviceNames[0],
    location,
    phone: config._business?.phone?.trim() || undefined,
    email: config._business?.email?.trim() || undefined,
    serviceNames,
  };
}

function normalizeLegacySite(site: LegacySiteInput): NormalizedSiteInput {
  const businessName = site.businessName?.trim() ?? '';
  const trade = site.trade?.trim() ?? '';
  const location = site.location?.trim() ?? '';

  if (!businessName || !trade || !location) {
    throw new Error('Legacy site input requires businessName, trade, and location.');
  }

  return {
    businessName,
    trade,
    location,
    phone: site.phone?.trim() || undefined,
    email: site.email?.trim() || undefined,
    serviceNames: [trade],
  };
}

function normalizeSitesPayload(payload: Record<string, unknown>): NormalizedSiteInput[] {
  const siteConfigs = payload.siteConfigs;
  if (Array.isArray(siteConfigs)) {
    return siteConfigs.map((cfg) => normalizeSiteFromSiteConfig((cfg ?? {}) as SiteConfigInput));
  }

  const siteConfig = payload.siteConfig;
  if (isRecord(siteConfig)) {
    return [normalizeSiteFromSiteConfig(siteConfig as SiteConfigInput)];
  }

  if ('_business' in payload || '_services' in payload) {
    return [normalizeSiteFromSiteConfig(payload as SiteConfigInput)];
  }

  const sites = (Array.isArray(payload.sites) ? payload.sites : [payload]) as LegacySiteInput[];
  return sites.map(normalizeLegacySite);
}

function execute(inputPayload: Record<string, unknown>): Record<string, unknown> {
  const payload = (inputPayload.signalPayload ?? {}) as Record<string, unknown>;
  const sites = normalizeSitesPayload(payload);

  const builtSites = sites.map((site) => {
    const name = site.businessName;
    const trade = site.trade;
    const location = site.location;
    const phone = site.phone || '';
    const email = site.email || '';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const nav = [
      '<nav style="background:#1e293b;padding:12px 24px;display:flex;gap:24px">',
      `<a href="index.html" style="color:#93c5fd;text-decoration:none;font-weight:bold">${name}</a>`,
      '<a href="services.html" style="color:#cbd5e1;text-decoration:none">Services</a>',
      '<a href="contact.html" style="color:#cbd5e1;text-decoration:none">Contact</a>',
      '</nav>',
    ].join('\n');

    const footer = [
      '<footer style="background:#1e293b;padding:24px;text-align:center;color:#94a3b8;margin-top:48px">',
      `<p>&copy; ${new Date().getFullYear()} ${name}. ${trade} services in ${location}.</p>`,
      '</footer>',
    ].join('\n');

    function page(title: string, desc: string, body: string): string {
      return [
        '<!doctype html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="UTF-8"/>',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>',
        `<title>${title}</title>`,
        `<meta name="description" content="${desc}"/>`,
        '<style>body{font-family:Arial,sans-serif;margin:0;color:#e2e8f0;background:#0f172a}',
        'main{max-width:800px;margin:0 auto;padding:24px}h1{margin:0 0 16px}p{line-height:1.6}</style>',
        '</head>',
        '<body>',
        nav,
        '<main>',
        body,
        '</main>',
        footer,
        '</body>',
        '</html>',
      ].join('\n');
    }

    const indexTitle = `${name} \u2013 ${trade} in ${location}`;
    const indexDesc = `${name} provides professional ${trade} services in ${location}.`;
    const indexBody = [
      `<h1>${name}</h1>`,
      `<p>Professional ${trade} services in ${location}.</p>`,
      `<p>${name} delivers reliable, high-quality ${trade} solutions for residential and commercial clients.</p>`,
      '<p><a href="services.html" style="color:#60a5fa">View our services &rarr;</a></p>',
      '<p><a href="contact.html" style="color:#60a5fa">Get in touch &rarr;</a></p>',
    ].join('\n');

    const servicesTitle = `Services \u2013 ${name}`;
    const servicesDesc = `Professional ${trade} services offered by ${name} in ${location}.`;
    const servicesBody = [
      `<h1>${trade.charAt(0).toUpperCase() + trade.slice(1)} Services</h1>`,
      `<p>${name} offers trusted services in the ${location} area:</p>`,
      '<ul>',
      ...site.serviceNames.map((serviceName) => `<li>${serviceName}</li>`),
      '</ul>',
      '<p><a href="contact.html" style="color:#60a5fa">Request a quote &rarr;</a></p>',
    ].join('\n');

    const contactTitle = `Contact \u2013 ${name}`;
    const contactDesc = `Contact ${name} for ${trade} services in ${location}.`;
    const contactBody = [
      '<h1>Contact Us</h1>',
      `<p>Reach out to ${name} for ${trade} services in ${location}.</p>`,
      phone ? `<p><strong>Phone:</strong> ${phone}</p>` : '',
      email ? `<p><strong>Email:</strong> <a href="mailto:${email}" style="color:#60a5fa">${email}</a></p>` : '',
      location ? `<p><strong>Location:</strong> ${location}</p>` : '',
    ].filter(Boolean).join('\n');

    return {
      slug,
      businessName: name,
      manifest: {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        slug,
        businessName: name,
        trade,
        location,
        pages: ['index.html', 'services.html', 'contact.html'],
        content: {
          tagline: `Professional ${trade} services`,
          serviceList: site.serviceNames,
        },
        schema: 'schema.json',
        status: 'ready',
      },
      schema: {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name,
        description: `Professional ${trade} services`,
        address: { '@type': 'PostalAddress', addressLocality: location },
        ...(phone && { telephone: phone }),
        ...(email && { email }),
      },
      files: {
        'manifest.json': '', // populated below
        'schema.json': '', // populated below
        'index.html': page(indexTitle, indexDesc, indexBody),
        'services.html': page(servicesTitle, servicesDesc, servicesBody),
        'contact.html': page(contactTitle, contactDesc, contactBody),
      },
      meta: {
        index: { title: indexTitle, description: indexDesc },
        services: { title: servicesTitle, description: servicesDesc },
        contact: { title: contactTitle, description: contactDesc },
      },
    };
  });

  // Populate self-referencing JSON files after structure is built
  builtSites.forEach((s) => {
    s.files['manifest.json'] = JSON.stringify(s.manifest, null, 2);
    s.files['schema.json'] = JSON.stringify(s.schema, null, 2);
  });

  return { siteCount: builtSites.length, sites: builtSites, handoffReady: true };
}

const buildSitePageSkill: SkillModule = {
  skillId: 'build_site_page',
  execute,
};

export default buildSitePageSkill;
