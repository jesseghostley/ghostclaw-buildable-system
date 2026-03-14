export type PublishTargetStatus = 'active' | 'inactive';

export type PublishTarget = {
  id: string;
  name: string;
  category: string;
  description: string;
  status: PublishTargetStatus;
};
