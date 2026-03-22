import { createAgent, agentStore } from '../agent';

export const siteArchitectAgent = createAgent({
  id: 'SiteArchitectAgent',
  name: 'Site Architect',
  description: 'Designs website structure, page hierarchy, navigation, and section layout for contractor websites.',
  capabilities: ['design_site_structure'],
  skillIds: ['design_site_structure'],
  workspaceId: 'default',
  maxConcurrentJobs: 1,
  policies: ['require_business_name', 'require_trade'],
});

agentStore.register(siteArchitectAgent);
