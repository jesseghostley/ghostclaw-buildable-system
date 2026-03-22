import type { SkillDefinition } from './types';

class SkillRegistry {
  private readonly skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): SkillDefinition {
    this.skills.set(skill.id, skill);
    return skill;
  }

  getById(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  execute(id: string, input: Record<string, unknown>): Record<string, unknown> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`Skill not found: ${id}`);
    }
    return skill.handler(input);
  }

  listAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  reset(): void {
    this.skills.clear();
  }
}

export const skillRegistry = new SkillRegistry();
