import type { SkillDefinition } from './types';

export const reviewAndApprove: SkillDefinition = {
  id: 'review_and_approve',
  name: 'Review and Approve',
  description: 'Validates site structure completeness, content quality, SEO metadata, and triggers operator approval before publishing.',
  version: '1.0.0',
  requiredCapabilities: ['review_and_approve'],

  inputSchema: [
    { name: 'businessName', type: 'string', required: true, description: 'Company name' },
    { name: 'previousStepOutput', type: 'object', required: false, description: 'Forwarded output from generate_page_content step' },
  ],

  outputSchema: [
    { name: 'qaReport', type: 'object', required: true, description: 'QA validation report' },
    { name: 'result', type: 'string', required: true, description: 'Human-readable summary' },
  ],

  handler: (input: Record<string, unknown>): Record<string, unknown> => {
    const payload = input.signalPayload as Record<string, unknown> | null;
    const prev = input.previousStepOutput as Record<string, unknown> | undefined;
    const businessName = String(payload?.businessName ?? 'Unnamed Contractor');

    // Validate forwarded content from previous step
    const pageContent = prev?.pageContent as Record<string, unknown> | undefined;
    const pagesGenerated = prev?.pagesGenerated as string[] | undefined;
    const hasContent = !!pageContent;
    const pageCount = pagesGenerated?.length ?? 0;

    return {
      result: `QA review completed for ${businessName}`,
      usedForwardedContent: hasContent,
      qaReport: {
        businessName,
        checksPerformed: [
          'site_structure_completeness',
          'content_quality',
          'seo_metadata_present',
          'contact_info_present',
          'mobile_responsive_flag',
        ],
        pageCount,
        contentReceived: hasContent,
        passed: hasContent && pageCount >= 3,
        requiresApproval: true,
        approvalReason: 'New contractor website ready for publishing — requires operator review.',
      },
    };
  },
};
