export type AgentStatus = 'active' | 'inactive';

export type AgentDefinition = {
  id: string;
  name: string;
  capabilities: string[];
  supportedSkills: string[];
  status: AgentStatus;
};

class InMemoryAgentRegistry {
  private readonly agents = new Map<string, AgentDefinition>();

  registerAgent(agent: AgentDefinition): AgentDefinition {
    this.agents.set(agent.id, agent);
    return agent;
  }

  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  findAgentForJob(jobType: string): AgentDefinition | undefined {
    return this.listAgents().find(
      (agent) => agent.status === 'active' && agent.capabilities.includes(jobType),
    );
  }

  findAgentForJobAndSkill(jobType: string, skillId: string): AgentDefinition | undefined {
    return this.listAgents().find(
      (agent) =>
        agent.status === 'active' &&
        agent.capabilities.includes(jobType) &&
        agent.supportedSkills.includes(skillId),
    );
  }

  listAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = new InMemoryAgentRegistry();

agentRegistry.registerAgent({
  id: 'keyword_research_agent',
  name: 'KeywordResearchAgent',
  capabilities: ['research_keyword_cluster'],
  supportedSkills: ['keyword_research'],
  status: 'active',
});
agentRegistry.registerAgent({
  id: 'content_strategist_agent',
  name: 'ContentStrategistAgent',
  capabilities: ['draft_cluster_outline'],
  supportedSkills: ['content_brief_generation'],
  status: 'active',
});
agentRegistry.registerAgent({
  id: 'content_writer_agent',
  name: 'ContentWriterAgent',
  capabilities: ['write_article', 'write_service_page'],
  supportedSkills: ['article_writing'],
  status: 'active',
});
agentRegistry.registerAgent({
  id: 'website_builder_agent',
  name: 'WebsiteBuilderAgent',
  capabilities: ['generate_metadata', 'generate_schema', 'refresh_page_sections'],
  supportedSkills: ['metadata_generation', 'schema_generation'],
  status: 'active',
});
agentRegistry.registerAgent({
  id: 'runtime_monitor_agent',
  name: 'RuntimeMonitorAgent',
  capabilities: ['monitor_runtime_health'],
  supportedSkills: ['runtime_diagnostics'],
  status: 'active',
});
agentRegistry.registerAgent({
  id: 'skill_builder_agent',
  name: 'SkillBuilderAgent',
  capabilities: ['scaffold_skill_package'],
  supportedSkills: ['skill_spec_generation'],
  status: 'active',
});
