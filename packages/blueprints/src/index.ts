export type { Blueprint, BlueprintJobStep, BlueprintApprovalGate, BlueprintInput, BlueprintOutput, BlueprintStatus } from './types';
export { blueprintRegistry } from './registry';
export { contractorWebsiteFactory } from './contractor_website_factory';

import { blueprintRegistry } from './registry';
import { contractorWebsiteFactory } from './contractor_website_factory';

// Seed the registry with built-in blueprints.
blueprintRegistry.register(contractorWebsiteFactory);
