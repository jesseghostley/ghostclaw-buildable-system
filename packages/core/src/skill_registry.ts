import type { Skill } from '../../shared/src/types/skill';

class InMemorySkillRegistry {
  private readonly skills = new Map<string, Skill>();

  registerSkill(skill: Skill): Skill {
    this.skills.set(skill.id, skill);
    return skill;
  }

  getSkill(id: string): Skill | undefined {
    return this.skills.get(id);
  }

  listSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  findSkillsForJobType(jobType: string): Skill[] {
    return this.listSkills().filter(
      (skill) => skill.status === 'active' && skill.supportedJobTypes.includes(jobType),
    );
  }
}

export const skillRegistry = new InMemorySkillRegistry();

skillRegistry.registerSkill({
  id: 'keyword_research',
  name: 'Keyword Research',
  category: 'seo',
  description: 'Find and structure keyword opportunities.',
  supportedJobTypes: ['research_keyword_cluster'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'content_brief_generation',
  name: 'Content Brief Generation',
  category: 'content',
  description: 'Generate outlines and briefs for content production.',
  supportedJobTypes: ['draft_cluster_outline'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'article_writing',
  name: 'Article Writing',
  category: 'content',
  description: 'Write complete article drafts.',
  supportedJobTypes: ['write_article', 'write_service_page'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'metadata_generation',
  name: 'Metadata Generation',
  category: 'technical_seo',
  description: 'Generate SEO metadata for pages.',
  supportedJobTypes: ['refresh_page_sections', 'generate_metadata'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'schema_generation',
  name: 'Schema Generation',
  category: 'technical_seo',
  description: 'Generate structured schema markup.',
  supportedJobTypes: ['generate_schema'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'runtime_diagnostics',
  name: 'Runtime Diagnostics',
  category: 'ops',
  description: 'Diagnose runtime and queue behavior.',
  supportedJobTypes: ['monitor_runtime_health'],
  status: 'active',
});
skillRegistry.registerSkill({
  id: 'skill_spec_generation',
  name: 'Skill Spec Generation',
  category: 'platform',
  description: 'Generate skill spec/scaffold packages.',
  supportedJobTypes: ['scaffold_skill_package'],
  status: 'active',
});
