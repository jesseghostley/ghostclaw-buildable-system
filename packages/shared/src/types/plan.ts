export type PlanStatus = 'draft' | 'ready' | 'running' | 'completed' | 'failed';

export type Plan = {
  id: string;
  signalId: string;
  workspaceId: string;
  plannerAction: string;
  priority: 'low' | 'normal' | 'high';
  requiredAgents: string[];
  expectedOutputs: string[];
  createdAt: number;
  status: PlanStatus;
  workflowId?: string;
  jobIds?: string[];
};
