import type { SkillDefinition } from './types';
import { getCopyPool, pickCopy } from '../../../packages/core/src/copy_variation';

export const generatePageContent: SkillDefinition = {
  id: 'generate_page_content',
  name: 'Generate Page Content',
  description: 'Produces page-level copy including titles, hero text, service descriptions, and calls-to-action from business details and forwarded site structure.',
  version: '1.0.0',
  requiredCapabilities: ['generate_page_content'],

  inputSchema: [
    { name: 'businessName', type: 'string', required: true, description: 'Company name' },
    { name: 'trade', type: 'string', required: true, description: 'Type of trade' },
    { name: 'location', type: 'string', required: true, description: 'Service area' },
    { name: 'phone', type: 'string', required: false, description: 'Contact phone' },
    { name: 'email', type: 'string', required: false, description: 'Contact email' },
    { name: 'previousStepOutput', type: 'object', required: false, description: 'Forwarded output from design_site_structure step' },
  ],

  outputSchema: [
    { name: 'pageContent', type: 'object', required: true, description: 'Per-page content object' },
    { name: 'result', type: 'string', required: true, description: 'Human-readable summary' },
    { name: 'usedForwardedStructure', type: 'boolean', required: true, description: 'Whether forwarded site structure was used' },
    { name: 'pagesGenerated', type: 'array', required: true, description: 'List of page names generated' },
  ],

  handler: (input: Record<string, unknown>): Record<string, unknown> => {
    const payload = input.signalPayload as Record<string, unknown> | null;
    const prev = input.previousStepOutput as Record<string, unknown> | undefined;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    const trade = String(payload?.trade ?? 'general');
    const location = String(payload?.location ?? 'your area');

    // Use site structure from previous step if available
    const siteStructure = prev?.siteStructure as Record<string, unknown> | undefined;
    const pages = (siteStructure?.pages as string[] | undefined) ?? ['home', 'services', 'about', 'gallery', 'contact'];
    const sections = (siteStructure?.sections as Record<string, string[]> | undefined) ?? {};

    // Deterministic copy variation — same businessName always gets same copy
    const pool = getCopyPool(trade);
    const vars = { businessName, trade, location };

    return {
      result: `Page content generated for ${businessName}`,
      usedForwardedStructure: !!siteStructure,
      pageContent: {
        home: {
          title: `${businessName} — Professional ${trade} Services in ${location}`,
          hero: pickCopy(pool.heroes, businessName, vars),
          sections: sections.home ?? ['hero', 'services_overview', 'testimonials', 'cta'],
          cta: pickCopy(pool.ctas, businessName, vars),
        },
        services: {
          title: `Our ${trade} Services`,
          description: pickCopy(pool.serviceDescriptions, businessName, vars),
          sections: sections.services ?? ['service_list', 'pricing', 'faq'],
        },
        about: {
          title: `About ${businessName}`,
          sections: sections.about ?? ['story', 'team', 'certifications'],
        },
        gallery: {
          title: 'Our Work',
          sections: sections.gallery ?? ['project_gallery', 'before_after'],
        },
        contact: {
          title: 'Contact Us',
          description: pickCopy(pool.contactDescriptions, businessName, vars),
          sections: sections.contact ?? ['form', 'map', 'hours'],
        },
      },
      siteStructure: siteStructure ?? null,
      pagesGenerated: pages,
    };
  },
};
