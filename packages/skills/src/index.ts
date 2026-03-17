export type { SkillDefinition, SkillFieldDef, SkillHandler } from './types';
export { skillRegistry } from './registry';
export { designSiteStructure } from './design_site_structure';
export { generatePageContent } from './generate_page_content';

import { skillRegistry } from './registry';
import { designSiteStructure } from './design_site_structure';
import { generatePageContent } from './generate_page_content';

// Seed the registry with built-in skills.
skillRegistry.register(designSiteStructure);
skillRegistry.register(generatePageContent);
