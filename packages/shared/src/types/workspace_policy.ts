export type WorkspacePolicyStatus = 'active' | 'inactive';

export type WorkspacePolicy = {
  workspaceId: string;
  requireReviewBeforePublish: boolean;
  allowedPublishTargets: string[];
  allowDirectPublish: boolean;
  autoApproveArtifacts: boolean;
  status: WorkspacePolicyStatus;
};
