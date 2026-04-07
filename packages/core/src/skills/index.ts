export type JobHandler = (inputPayload: Record<string, unknown>) => Record<string, unknown>;

export type SkillModule = {
  skillId: string;
  execute: JobHandler;
};

import buildSitePageSkill from './build_site_page';
import draftClusterOutlineSkill from './draft_cluster_outline';
import refreshPageSectionsSkill from './refresh_page_sections';
import scaffoldSkillPackageSkill from './scaffold_skill_package';
import runDiagnosticsSkill from './run_diagnostics';

const skillRegistry = new Map<string, SkillModule>();

function registerSkill(skill: SkillModule): void {
  skillRegistry.set(skill.skillId, skill);
}

registerSkill(buildSitePageSkill);
registerSkill(draftClusterOutlineSkill);
registerSkill(refreshPageSectionsSkill);
registerSkill(scaffoldSkillPackageSkill);
registerSkill(runDiagnosticsSkill);

export function getSkill(skillId: string): SkillModule | undefined {
  return skillRegistry.get(skillId);
}

export function listSkills(): SkillModule[] {
  return Array.from(skillRegistry.values());
}

export { skillRegistry };
