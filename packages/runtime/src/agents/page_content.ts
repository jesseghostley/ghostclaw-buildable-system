import { createAgent, agentStore } from '../agent';

export const pageContentAgent = createAgent({
  id: 'PageContentAgent',
  name: 'Page Content Generator',
  description: 'Generates page copy including titles, hero text, service descriptions, and calls-to-action from business details and site structure.',
  capabilities: ['generate_page_content'],
  skillIds: ['generate_page_content'],
  workspaceId: 'default',
  maxConcurrentJobs: 1,
  policies: ['content_quality_check'],
});

agentStore.register(pageContentAgent);
