/**
 * Skill — a discrete, reusable unit of work that an agent can execute.
 *
 * Skills are pure functions: input payload in, output payload out.
 * They are registered in the skill registry and referenced by ID
 * in blueprints and agent configs.
 */

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  version: string;
  /** Agent capabilities required to execute this skill. */
  requiredCapabilities: string[];
  /** Input schema description. */
  inputSchema: SkillFieldDef[];
  /** Output schema description. */
  outputSchema: SkillFieldDef[];
  /** The handler function. */
  handler: SkillHandler;
};

export type SkillFieldDef = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
};

export type SkillHandler = (input: Record<string, unknown>) => Record<string, unknown>;
