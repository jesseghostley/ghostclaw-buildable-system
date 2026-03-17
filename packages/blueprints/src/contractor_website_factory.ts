import type { Blueprint } from './types';

export const contractorWebsiteFactory: Blueprint = {
  id: 'bp_contractor_website_factory',
  name: 'Contractor Website Factory',
  version: '1.0.0',
  description: 'Generates a complete contractor website from business details through site architecture, content generation, and QA review with operator approval.',
  status: 'active',

  triggerSignal: 'contractor_website_requested',
  plannerAction: 'build_contractor_website',
  strategyId: 'rule_contractor_website_strategy',

  steps: [
    {
      order: 1,
      jobType: 'design_site_structure',
      agentId: 'SiteArchitectAgent',
      skillId: 'design_site_structure',
      description: 'Design page layout, navigation structure, and section hierarchy for the contractor website.',
      passOutputForward: true,
    },
    {
      order: 2,
      jobType: 'generate_page_content',
      agentId: 'PageContentAgent',
      skillId: 'generate_page_content',
      description: 'Generate page titles, hero text, service descriptions, and CTAs from business details.',
      passOutputForward: true,
    },
    {
      order: 3,
      jobType: 'review_and_approve',
      agentId: 'QAReviewAgent',
      skillId: 'review_and_approve',
      description: 'Validate site structure completeness, content quality, SEO readiness, and trigger operator approval.',
      passOutputForward: false,
    },
  ],

  inputs: [
    { name: 'businessName', type: 'string', required: true, description: 'Company name' },
    { name: 'trade', type: 'string', required: true, description: 'Type of trade (roofing, plumbing, electrical, etc.)' },
    { name: 'location', type: 'string', required: true, description: 'Service area' },
    { name: 'phone', type: 'string', required: false, description: 'Business phone number' },
    { name: 'email', type: 'string', required: false, description: 'Business email' },
  ],

  outputs: [
    { name: 'site_structure', artifactType: 'design_site_structure', description: 'Page list, sections, and navigation hierarchy' },
    { name: 'page_content', artifactType: 'generate_page_content', description: 'Per-page copy including titles, hero, descriptions, CTAs' },
    { name: 'qa_report', artifactType: 'review_and_approve', description: 'Quality validation checklist and approval status' },
  ],

  approvalGates: [
    {
      afterStep: 3,
      type: 'operator',
      description: 'Operator must approve before publishing contractor website to CMS.',
      destination: 'website_cms',
    },
  ],

  requiredAgents: ['SiteArchitectAgent', 'PageContentAgent', 'QAReviewAgent'],
  requiredSkills: ['design_site_structure', 'generate_page_content', 'review_and_approve'],

  queueType: 'sequential',

  auditEvents: [
    'signal.received',
    'plan.created',
    'job.completed',
    'skill_invocation.started',
    'skill_invocation.completed',
    'artifact.created',
    'publish_event.initiated',
    'publish_event.approved',
    'publish_event.published',
  ],

  memoryKeys: [
    'site_structure',
    'page_content',
    'qa_report',
    'approval_status',
  ],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};
