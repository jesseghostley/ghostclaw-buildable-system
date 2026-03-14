export type SkillStatus = 'active' | 'inactive';

export type Skill = {
  id: string;
  name: string;
  category: string;
  description: string;
  supportedJobTypes: string[];
  status: SkillStatus;
};
