import type { SkillDefinition } from './types';

export const generatePageContent: SkillDefinition = {
  id: 'generate_page_content',
  name: 'Generate Page Content',
  description: 'Produces page-level copy including titles, hero text, service descriptions, and calls-to-action from business details.',
  version: '1.0.0',
  requiredCapabilities: ['generate_page_content'],

  inputSchema: [
    { name: 'businessName', type: 'string', required: true, description: 'Company name' },
    { name: 'trade', type: 'string', required: true, description: 'Type of trade' },
    { name: 'location', type: 'string', required: true, description: 'Service area' },
    { name: 'phone', type: 'string', required: false, description: 'Contact phone' },
    { name: 'email', type: 'string', required: false, description: 'Contact email' },
  ],

  outputSchema: [
    { name: 'pageContent', type: 'object', required: true, description: 'Per-page content object' },
    { name: 'result', type: 'string', required: true, description: 'Human-readable summary' },
  ],

  handler: (input: Record<string, unknown>): Record<string, unknown> => {
    const payload = input.signalPayload as Record<string, unknown> | null;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');
    const trade = String(payload?.trade ?? 'general');
    const location = String(payload?.location ?? 'your area');
    const phone = String(payload?.phone ?? '');
    const email = String(payload?.email ?? '');

    return {
      result: `Page content generated for ${businessName}`,
      pageContent: {
        home: {
          title: `${businessName} — Professional ${trade} Services in ${location}`,
          hero: `Trusted ${trade} contractor serving ${location} with quality workmanship and reliable service.`,
          servicesOverview: `We offer comprehensive ${trade} solutions for residential and commercial properties.`,
          cta: 'Get Your Free Estimate Today',
        },
        services: {
          title: `Our ${trade} Services`,
          description: `Full-service ${trade} solutions for residential and commercial properties in ${location}.`,
          cta: 'Request a Quote',
        },
        about: {
          title: `About ${businessName}`,
          story: `${businessName} has been providing professional ${trade} services in ${location}. Our team is committed to quality, reliability, and customer satisfaction.`,
        },
        gallery: {
          title: 'Our Work',
          description: `Browse our portfolio of completed ${trade} projects.`,
        },
        contact: {
          title: 'Contact Us',
          description: `Ready to start your ${trade} project? Get in touch for a free consultation.`,
          phone: phone || undefined,
          email: email || undefined,
          cta: 'Send Message',
        },
        seo: {
          metaTitle: `${businessName} | ${trade} Services in ${location}`,
          metaDescription: `Professional ${trade} contractor in ${location}. Quality workmanship, free estimates. Contact ${businessName} today.`,
          ogTitle: `${businessName} — ${trade} Services`,
        },
      },
    };
  },
};
