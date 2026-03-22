/**
 * Copy Variation — deterministic content diversification for same-trade sites.
 *
 * Provides trade-keyed pools of hero lines, CTAs, service descriptions, and
 * section layout variants.  A stable string hash of `businessName` selects
 * which variant a given business receives, guaranteeing:
 *
 *   1. Same business → same copy on every run
 *   2. Different businesses in the same trade → different copy (high probability)
 *   3. Unknown trade → falls back to `general` pool
 *
 * All pools belong to the same "Type A" design family — the page structure,
 * navigation, and visual hierarchy are identical across variants.  Only the
 * interpolated copy and section ordering differ.
 */

// ── Deterministic hash ──────────────────────────────────────────────────────

/**
 * djb2 string hash — fast, deterministic, good distribution for short strings.
 * Returns a non-negative integer.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick a variant from a pool using a deterministic hash of `businessName`.
 * Same businessName always returns the same index.
 */
export function pickVariant<T>(pool: T[], businessName: string): T {
  return pool[hashString(businessName) % pool.length];
}

// ── Copy Pools ──────────────────────────────────────────────────────────────

export type CopyPool = {
  heroes: string[];
  ctas: string[];
  serviceDescriptions: string[];
  contactDescriptions: string[];
};

const roofing: CopyPool = {
  heroes: [
    'Protecting {location} homes with expert roofing — built to last through every season.',
    'Your roof is your first line of defense. {businessName} delivers craftsmanship you can count on.',
    'From repairs to full replacements, {businessName} keeps {location} covered.',
    'Storm damage? Aging shingles? {businessName} has been the trusted roofer in {location} for years.',
    'Quality roofing that stands up to {location} weather — guaranteed.',
  ],
  ctas: [
    'Get Your Free Roof Inspection',
    'Schedule a No-Cost Estimate',
    'Request Your Roofing Quote',
    'Book a Free Consultation Today',
    'Claim Your Free Assessment',
  ],
  serviceDescriptions: [
    'Complete roofing services including shingle replacement, flat roof repair, storm damage restoration, and new roof installation for homes and businesses in {location}.',
    'Residential and commercial roofing solutions — from leak detection and emergency tarping to full tear-off and re-roof projects across {location}.',
    'Expert roof repair, replacement, and maintenance for {location} properties. We work with asphalt, metal, tile, and flat roofing systems.',
    'Trusted by {location} homeowners for roof inspections, insurance claims support, gutter installation, and long-lasting roof replacements.',
  ],
  contactDescriptions: [
    'Ready to protect your home? Reach out for a free roof inspection and honest quote.',
    'Get in touch today — we offer same-day estimates and flexible scheduling for {location} homeowners.',
    'Have a roofing question? Contact {businessName} for fast, friendly service.',
    'Schedule your free consultation. We respond to every inquiry within 24 hours.',
  ],
};

const plumbing: CopyPool = {
  heroes: [
    'Fast, reliable plumbing for {location} homes — no job too big or small.',
    '{businessName} keeps {location} flowing with honest, dependable plumbing service.',
    'Leaks, clogs, and installations handled right the first time by {businessName}.',
    'Licensed plumbers serving {location} — available when you need us most.',
    'From dripping faucets to full re-pipes, {businessName} is {location}\'s plumbing expert.',
  ],
  ctas: [
    'Call for Same-Day Service',
    'Get Your Free Plumbing Estimate',
    'Schedule Your Service Call',
    'Book a Plumber Today',
    'Request a Free Quote Now',
  ],
  serviceDescriptions: [
    'Full-service plumbing for {location} — drain cleaning, water heater installation, pipe repair, fixture upgrades, and emergency service.',
    'Residential and commercial plumbing solutions including leak detection, sewer line repair, bathroom remodeling, and 24/7 emergency calls in {location}.',
    'Expert plumbing repair and installation for {location} homes. We handle water heaters, garbage disposals, sump pumps, and whole-house re-piping.',
    'Trusted {location} plumbers providing honest pricing, clean work, and lasting repairs for kitchens, bathrooms, and utility systems.',
  ],
  contactDescriptions: [
    'Plumbing emergency? Call {businessName} now — we offer fast response times across {location}.',
    'Need a plumber? Contact us for upfront pricing and same-day availability.',
    'Reach out to {businessName} for reliable plumbing service in {location}.',
    'Schedule your plumbing service today — free estimates on all major work.',
  ],
};

const electrical: CopyPool = {
  heroes: [
    'Safe, code-compliant electrical work for {location} homes and businesses.',
    '{businessName} — licensed electricians {location} trusts for every project.',
    'From panel upgrades to smart home wiring, {businessName} powers {location} right.',
    'Electrical problems solved fast and safely by {businessName} in {location}.',
    'Reliable electrical service for {location} — fully licensed, bonded, and insured.',
  ],
  ctas: [
    'Schedule Your Electrical Inspection',
    'Get a Free Wiring Estimate',
    'Book an Electrician Today',
    'Request Your Free Quote',
    'Call for a Safety Inspection',
  ],
  serviceDescriptions: [
    'Licensed electrical services for {location} — panel upgrades, outlet installation, lighting design, EV charger hookups, and code compliance inspections.',
    'Residential and commercial electrical work including rewiring, generator installation, surge protection, and smart home integration in {location}.',
    'Expert electricians serving {location} with ceiling fan installation, circuit breaker replacement, whole-house surge protection, and emergency repairs.',
    'Full-service electrical contractor for {location} properties — from troubleshooting flickering lights to complete electrical system overhauls.',
  ],
  contactDescriptions: [
    'Need an electrician? Contact {businessName} for safe, professional service in {location}.',
    'Schedule your electrical work today — licensed professionals, honest estimates.',
    'Reach out for a free consultation on your electrical project in {location}.',
    'Call {businessName} for prompt, code-compliant electrical service.',
  ],
};

const hvac: CopyPool = {
  heroes: [
    'Keep your {location} home comfortable year-round with {businessName}.',
    '{businessName} — heating and cooling experts serving {location} families.',
    'AC down? Furnace acting up? {businessName} gets {location} homes comfortable fast.',
    'Energy-efficient HVAC solutions designed for {location}\'s climate by {businessName}.',
    'Trust {businessName} for reliable heating, cooling, and indoor air quality in {location}.',
  ],
  ctas: [
    'Schedule Your HVAC Tune-Up',
    'Get a Free Comfort Assessment',
    'Book Your AC or Heating Service',
    'Request a Free HVAC Quote',
    'Claim Your Seasonal Maintenance Deal',
  ],
  serviceDescriptions: [
    'Complete HVAC services for {location} — AC repair, furnace installation, duct cleaning, heat pump service, and seasonal maintenance plans.',
    'Residential and light commercial heating and cooling for {location}. We install, repair, and maintain all major brands and system types.',
    'Expert HVAC technicians serving {location} with air conditioning repair, furnace replacement, thermostat upgrades, and indoor air quality solutions.',
    'Trusted {location} HVAC contractor providing energy audits, system replacements, preventive maintenance, and 24/7 emergency heating and cooling service.',
  ],
  contactDescriptions: [
    'Need heating or cooling service? Contact {businessName} for fast response in {location}.',
    'Schedule your HVAC service today — we offer flexible appointments and upfront pricing.',
    'Reach out to {businessName} for a free estimate on your heating and cooling needs.',
    'Call us for seasonal tune-ups, emergency repairs, or new system installation in {location}.',
  ],
};

const painting: CopyPool = {
  heroes: [
    'Transform your {location} home with professional painting by {businessName}.',
    '{businessName} brings color and craftsmanship to every {location} project.',
    'Interior and exterior painting that makes {location} homes look their best.',
    'Fresh paint, flawless finish — {businessName} is {location}\'s painting professional.',
    'Boost your curb appeal with expert painting services from {businessName} in {location}.',
  ],
  ctas: [
    'Get Your Free Color Consultation',
    'Request a Painting Estimate',
    'Book Your Free Quote Today',
    'Schedule Your Painting Project',
    'Claim Your Free Estimate',
  ],
  serviceDescriptions: [
    'Professional interior and exterior painting for {location} homes — color consultation, surface prep, premium paints, and meticulous finishing.',
    'Full-service residential painting in {location} including cabinet refinishing, deck staining, drywall repair, and accent walls.',
    'Expert painters serving {location} with whole-house repaints, trim work, texture matching, and commercial painting projects.',
    'Trusted painting contractor for {location} — we handle prep, priming, painting, and cleanup so you don\'t have to lift a brush.',
  ],
  contactDescriptions: [
    'Ready to refresh your home? Contact {businessName} for a free painting estimate.',
    'Get in touch for a color consultation and no-obligation quote in {location}.',
    'Reach out to {businessName} — we bring the samples to you for a free on-site estimate.',
    'Schedule your painting project today. Fast turnaround, clean results, happy homeowners.',
  ],
};

const general: CopyPool = {
  heroes: [
    'Professional contractor services for {location} — quality work, fair pricing.',
    '{businessName} delivers reliable service to {location} homes and businesses.',
    'Experienced contractors serving {location} with skilled workmanship you can trust.',
    'From small repairs to major projects, {businessName} gets the job done right in {location}.',
    '{location}\'s dependable contractor — licensed, insured, and committed to quality.',
  ],
  ctas: [
    'Get Your Free Estimate',
    'Request a Quote Today',
    'Schedule a Consultation',
    'Book Your Free Assessment',
    'Contact Us for a Quote',
  ],
  serviceDescriptions: [
    'Full-service contracting for {location} — residential and commercial projects handled with professionalism and attention to detail.',
    'Trusted contractor serving {location} with skilled trades, honest pricing, and reliable scheduling for projects of any size.',
    'Expert contractor services for {location} homes and businesses — from renovations and repairs to new construction and maintenance.',
    'Dependable contracting solutions for {location} properties. Licensed, bonded, and insured with a commitment to doing the job right.',
  ],
  contactDescriptions: [
    'Ready to start your project? Contact {businessName} for a free estimate.',
    'Get in touch today — honest quotes and reliable service in {location}.',
    'Reach out to {businessName} for professional contracting service in {location}.',
    'Schedule your free consultation. We respond to every inquiry promptly.',
  ],
};

// ── Pool Registry ───────────────────────────────────────────────────────────

const COPY_POOLS: Record<string, CopyPool> = {
  roofing,
  plumbing,
  electrical,
  hvac,
  painting,
  general,
};

/**
 * Resolve the copy pool for a trade.  Normalises the trade string and falls
 * back to `general` for unsupported trades.
 */
export function getCopyPool(trade: string): CopyPool {
  const key = trade.toLowerCase().trim();
  return COPY_POOLS[key] ?? COPY_POOLS.general;
}

/**
 * Interpolate `{businessName}`, `{trade}`, and `{location}` placeholders
 * in a copy string.
 */
export function interpolate(
  template: string,
  vars: { businessName: string; trade: string; location: string },
): string {
  return template
    .replace(/\{businessName\}/g, vars.businessName)
    .replace(/\{trade\}/g, vars.trade)
    .replace(/\{location\}/g, vars.location);
}

/**
 * Convenience: pick a variant from a pool and interpolate it in one step.
 */
export function pickCopy(
  pool: string[],
  businessName: string,
  vars: { businessName: string; trade: string; location: string },
): string {
  return interpolate(pickVariant(pool, businessName), vars);
}

// ── Layout Variations ───────────────────────────────────────────────────────

/**
 * Section layout variants for the home page.  All belong to the same
 * "Type A" design family — 5 pages, same nav, same footer.  Only the
 * section ordering and optional bonus sections differ.
 */
export type LayoutVariant = {
  home: string[];
  services: string[];
  about: string[];
  gallery: string[];
  contact: string[];
};

const LAYOUT_VARIANTS: Record<string, LayoutVariant[]> = {
  roofing: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'trust_badges', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'emergency_services', 'faq'],
      about: ['story', 'certifications', 'service_area'],
      gallery: ['before_after', 'project_gallery'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'recent_projects', 'testimonials', 'cta'],
      services: ['service_list', 'seasonal_maintenance', 'pricing'],
      about: ['story', 'team', 'insurance_partners'],
      gallery: ['project_gallery', 'materials_showcase'],
      contact: ['form', 'map', 'hours'],
    },
  ],
  plumbing: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'emergency_banner', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'emergency_services', 'pricing'],
      about: ['story', 'certifications', 'service_area'],
      gallery: ['before_after', 'project_gallery'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'trust_badges', 'testimonials', 'cta'],
      services: ['service_list', 'maintenance_plans', 'faq'],
      about: ['story', 'team', 'warranty_info'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
  ],
  electrical: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'safety_certifications', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'smart_home', 'pricing'],
      about: ['story', 'certifications', 'licensing'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'trust_badges', 'testimonials', 'cta'],
      services: ['service_list', 'ev_charging', 'faq'],
      about: ['story', 'team', 'service_area'],
      gallery: ['before_after', 'project_gallery'],
      contact: ['form', 'map', 'hours'],
    },
  ],
  hvac: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'seasonal_promo', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'maintenance_plans', 'energy_savings'],
      about: ['story', 'certifications', 'brands_serviced'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'comfort_guarantee', 'testimonials', 'cta'],
      services: ['service_list', 'indoor_air_quality', 'pricing'],
      about: ['story', 'team', 'service_area'],
      gallery: ['before_after', 'project_gallery'],
      contact: ['form', 'map', 'hours'],
    },
  ],
  painting: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'color_showcase', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'color_consultation', 'pricing'],
      about: ['story', 'portfolio_highlights', 'certifications'],
      gallery: ['before_after', 'project_gallery', 'color_samples'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'recent_projects', 'testimonials', 'cta'],
      services: ['service_list', 'specialty_finishes', 'faq'],
      about: ['story', 'team', 'eco_friendly'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
  ],
  general: [
    {
      home: ['hero', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'faq'],
      about: ['story', 'team', 'certifications'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
    {
      home: ['hero', 'trust_badges', 'services_overview', 'testimonials', 'cta'],
      services: ['service_list', 'project_types', 'faq'],
      about: ['story', 'certifications', 'service_area'],
      gallery: ['before_after', 'project_gallery'],
      contact: ['form', 'hours', 'map'],
    },
    {
      home: ['hero', 'services_overview', 'recent_projects', 'testimonials', 'cta'],
      services: ['service_list', 'pricing', 'warranty_info'],
      about: ['story', 'team', 'licensing'],
      gallery: ['project_gallery', 'before_after'],
      contact: ['form', 'map', 'hours'],
    },
  ],
};

/**
 * Get the layout variant for a trade + businessName combination.
 * Falls back to `general` for unsupported trades.
 */
export function getLayoutVariant(trade: string, businessName: string): LayoutVariant {
  const key = trade.toLowerCase().trim();
  const variants = LAYOUT_VARIANTS[key] ?? LAYOUT_VARIANTS.general;
  return pickVariant(variants, businessName);
}

// ── Exports for testing ─────────────────────────────────────────────────────

export { COPY_POOLS, LAYOUT_VARIANTS };
