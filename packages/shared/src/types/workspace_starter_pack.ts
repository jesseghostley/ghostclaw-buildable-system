export type WorkspaceStarterPackStatus = 'active' | 'inactive';

export type StarterSignalTemplate = {
  name: string;
  payload?: Record<string, unknown>;
};

export type StarterArtifactTemplate = {
  type: string;
  title: string;
  content: string;
  status?: 'draft' | 'waiting_review' | 'approved' | 'rejected' | 'published';
};

export type StarterWorkflowTemplate = {
  name: string;
  jobTypes: string[];
  notes?: string;
};

export type WorkspaceStarterPack = {
  blueprintId: string;
  starterSignals: StarterSignalTemplate[];
  starterArtifacts: StarterArtifactTemplate[];
  starterWorkflowTemplates: StarterWorkflowTemplate[];
  starterNotes: string[];
  status: WorkspaceStarterPackStatus;
};
