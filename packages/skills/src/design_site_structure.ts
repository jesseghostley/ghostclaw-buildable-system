import type { SkillDefinition } from './types';
import { getLayoutVariant } from '../../../packages/core/src/copy_variation';

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

    // Deterministic layout variation — same businessName always gets same layout
    const layout = getLayoutVariant(trade, businessName);
    const totalSections = Object.values(layout).reduce((sum, arr) => sum + arr.length, 0);

    return {
      result: `Site structure designed for ${businessName}`,
      siteStructure: {
        businessName,
        trade,
        pages: ['home', 'services', 'about', 'gallery', 'contact'],
        sections: layout,
        navigation: {
          primary: ['Home', 'Services', 'About', 'Gallery', 'Contact'],
          footer: ['Privacy Policy', 'Terms of Service', 'Sitemap'],
        },
        metadata: {
          estimatedPages: 5,
          estimatedSections: totalSections,
          hasCTA: true,
          hasContactForm: true,
        },
      },
    };
  },
};
