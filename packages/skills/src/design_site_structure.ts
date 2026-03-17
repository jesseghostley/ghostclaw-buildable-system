import type { SkillDefinition } from './types';

export const designSiteStructure: SkillDefinition = {
  id: 'design_site_structure',
  name: 'Design Site Structure',
  description: 'Produces a page hierarchy, navigation structure, and per-page section layout for a contractor website.',
  version: '1.0.0',
  requiredCapabilities: ['design_site_structure'],

  inputSchema: [
    { name: 'businessName', type: 'string', required: true, description: 'Company name' },
    { name: 'trade', type: 'string', required: true, description: 'Type of trade' },
    { name: 'location', type: 'string', required: false, description: 'Service area' },
  ],

  outputSchema: [
    { name: 'siteStructure', type: 'object', required: true, description: 'Complete site structure object' },
    { name: 'result', type: 'string', required: true, description: 'Human-readable summary' },
  ],

  handler: (input: Record<string, unknown>): Record<string, unknown> => {
    const payload = input.signalPayload as Record<string, unknown> | null;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    const trade = String(payload?.trade ?? 'general');

    return {
      result: `Site structure designed for ${businessName}`,
      siteStructure: {
        businessName,
        trade,
        pages: ['home', 'services', 'about', 'gallery', 'contact'],
        sections: {
          home: ['hero', 'services_overview', 'testimonials', 'cta'],
          services: ['service_list', 'pricing', 'faq'],
          about: ['story', 'team', 'certifications'],
          gallery: ['project_gallery', 'before_after'],
          contact: ['form', 'map', 'hours'],
        },
        navigation: {
          primary: ['Home', 'Services', 'About', 'Gallery', 'Contact'],
          footer: ['Privacy Policy', 'Terms of Service', 'Sitemap'],
        },
        metadata: {
          estimatedPages: 5,
          estimatedSections: 14,
          hasCTA: true,
          hasContactForm: true,
        },
      },
    };
  },
};
