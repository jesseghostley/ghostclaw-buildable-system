import { createAgent, agentStore } from '../agent';

export const qaReviewAgent = createAgent({
  id: 'QAReviewAgent',
  name: 'QA Reviewer',
  description: 'Validates site structure completeness, content quality, SEO metadata, and triggers operator approval before publishing.',
  capabilities: ['review_and_approve'],
  skillIds: ['review_and_approve'],
  workspaceId: 'default',
  maxConcurrentJobs: 1,
  policies: ['require_approval_before_publish'],
});

agentStore.register(qaReviewAgent);
