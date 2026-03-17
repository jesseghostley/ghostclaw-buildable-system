/**
 * Agent — identity + state + skills + queue access.
 *
 * Agents are NOT always-on chatbots. They are stateful workers that:
 * - Have a defined identity and role
 * - Own a set of skills they can execute
 * - Pull jobs from queues
 * - Maintain state across invocations via memory
 * - Operate under policies
 */

export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';

export type AgentConfig = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  skillIds: string[];
  workspaceId: string;
  maxConcurrentJobs: number;
  policies: string[];
};

export type AgentState = {
  status: AgentStatus;
  currentJobId: string | null;
  completedJobs: number;
  failedJobs: number;
  lastActiveAt: number | null;
  memoryKeys: string[];
};

export type Agent = {
  config: AgentConfig;
  state: AgentState;
};

export function createAgent(config: AgentConfig): Agent {
  return {
    config,
    state: {
      status: 'idle',
      currentJobId: null,
      completedJobs: 0,
      failedJobs: 0,
      lastActiveAt: null,
      memoryKeys: [],
    },
  };
}

class AgentStore {
  private readonly agents = new Map<string, Agent>();

  register(agent: Agent): Agent {
    this.agents.set(agent.config.id, agent);
    return agent;
  }

  getById(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  findByCapability(capability: string): Agent | undefined {
    return Array.from(this.agents.values()).find(
      (a) => a.config.capabilities.includes(capability) && a.state.status === 'idle',
    );
  }

  listAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  listByWorkspace(workspaceId: string): Agent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.config.workspaceId === workspaceId,
    );
  }

  markBusy(id: string, jobId: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.state.status = 'busy';
    agent.state.currentJobId = jobId;
    agent.state.lastActiveAt = Date.now();
  }

  markIdle(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.state.status = 'idle';
    agent.state.currentJobId = null;
    agent.state.completedJobs += 1;
    agent.state.lastActiveAt = Date.now();
  }

  markFailed(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    agent.state.status = 'idle';
    agent.state.currentJobId = null;
    agent.state.failedJobs += 1;
    agent.state.lastActiveAt = Date.now();
  }

  reset(): void {
    this.agents.clear();
  }
}

export const agentStore = new AgentStore();
