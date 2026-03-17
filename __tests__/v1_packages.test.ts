import { blueprintRegistry } from '../packages/blueprints/src/registry';
import { contractorWebsiteFactory } from '../packages/blueprints/src/contractor_website_factory';
import { skillRegistry } from '../packages/skills/src/registry';
import { designSiteStructure } from '../packages/skills/src/design_site_structure';
import { generatePageContent } from '../packages/skills/src/generate_page_content';
import { agentStore, createAgent } from '../packages/runtime/src/agent';
import { workspaceStore } from '../packages/workspaces/src/store';

beforeEach(() => {
  blueprintRegistry.reset();
  skillRegistry.reset();
  agentStore.reset();
});

// ── Blueprint Registry ──────────────────────────────────────────────────────

describe('Blueprint Registry', () => {
  it('registers and retrieves the contractor website factory', () => {
    blueprintRegistry.register(contractorWebsiteFactory);
    const bp = blueprintRegistry.getById('bp_contractor_website_factory');
    expect(bp).toBeDefined();
    expect(bp!.name).toBe('Contractor Website Factory');
    expect(bp!.steps).toHaveLength(3);
    expect(bp!.triggerSignal).toBe('contractor_website_requested');
  });

  it('finds blueprint by signal name', () => {
    blueprintRegistry.register(contractorWebsiteFactory);
    const bp = blueprintRegistry.getBySignal('contractor_website_requested');
    expect(bp).toBeDefined();
    expect(bp!.id).toBe('bp_contractor_website_factory');
  });

  it('blueprint steps match runtime job types', () => {
    blueprintRegistry.register(contractorWebsiteFactory);
    const bp = blueprintRegistry.getById('bp_contractor_website_factory')!;
    expect(bp.steps.map((s) => s.jobType)).toEqual([
      'design_site_structure',
      'generate_page_content',
      'review_and_approve',
    ]);
  });

  it('blueprint agents match registered runtime agents', () => {
    const bp = contractorWebsiteFactory;
    expect(bp.requiredAgents).toEqual([
      'SiteArchitectAgent',
      'PageContentAgent',
      'QAReviewAgent',
    ]);
  });

  it('blueprint has exactly one approval gate after step 3', () => {
    const bp = contractorWebsiteFactory;
    expect(bp.approvalGates).toHaveLength(1);
    expect(bp.approvalGates[0].afterStep).toBe(3);
    expect(bp.approvalGates[0].type).toBe('operator');
    expect(bp.approvalGates[0].destination).toBe('website_cms');
  });
});

// ── Skill Registry ──────────────────────────────────────────────────────────

describe('Skill Registry', () => {
  it('registers and executes design_site_structure', () => {
    skillRegistry.register(designSiteStructure);
    const result = skillRegistry.execute('design_site_structure', {
      signalPayload: { businessName: 'Test Co', trade: 'plumbing' },
    });
    expect(result.siteStructure).toBeDefined();
    const structure = result.siteStructure as Record<string, unknown>;
    expect(structure.businessName).toBe('Test Co');
    expect(structure.trade).toBe('plumbing');
  });

  it('registers and executes generate_page_content', () => {
    skillRegistry.register(generatePageContent);
    const result = skillRegistry.execute('generate_page_content', {
      signalPayload: { businessName: 'Test Co', trade: 'plumbing', location: 'NYC' },
    });
    expect(result.pageContent).toBeDefined();
    const content = result.pageContent as Record<string, Record<string, string>>;
    expect(content.home.title).toContain('Test Co');
    expect(content.home.title).toContain('plumbing');
    expect(content.home.title).toContain('NYC');
  });

  it('throws on unknown skill', () => {
    expect(() => skillRegistry.execute('nonexistent', {})).toThrow('Skill not found: nonexistent');
  });
});

// ── Agent Store ─────────────────────────────────────────────────────────────

describe('Agent Store', () => {
  it('creates agent with idle state', () => {
    const agent = createAgent({
      id: 'TestAgent',
      name: 'Test',
      description: 'A test agent',
      capabilities: ['test_skill'],
      skillIds: ['test_skill'],
      workspaceId: 'default',
      maxConcurrentJobs: 1,
      policies: [],
    });
    expect(agent.state.status).toBe('idle');
    expect(agent.state.completedJobs).toBe(0);
  });

  it('tracks busy/idle state transitions', () => {
    const agent = createAgent({
      id: 'TestAgent',
      name: 'Test',
      description: 'Test',
      capabilities: ['test'],
      skillIds: ['test'],
      workspaceId: 'default',
      maxConcurrentJobs: 1,
      policies: [],
    });
    agentStore.register(agent);

    agentStore.markBusy('TestAgent', 'job_1');
    expect(agentStore.getById('TestAgent')!.state.status).toBe('busy');
    expect(agentStore.getById('TestAgent')!.state.currentJobId).toBe('job_1');

    agentStore.markIdle('TestAgent');
    expect(agentStore.getById('TestAgent')!.state.status).toBe('idle');
    expect(agentStore.getById('TestAgent')!.state.completedJobs).toBe(1);
  });

  it('finds agent by capability', () => {
    const agent = createAgent({
      id: 'FindMe',
      name: 'Findable',
      description: 'Test',
      capabilities: ['special_skill'],
      skillIds: ['special_skill'],
      workspaceId: 'default',
      maxConcurrentJobs: 1,
      policies: [],
    });
    agentStore.register(agent);
    const found = agentStore.findByCapability('special_skill');
    expect(found).toBeDefined();
    expect(found!.config.id).toBe('FindMe');
  });
});

// ── Workspace Store ─────────────────────────────────────────────────────────

describe('Workspace Store', () => {
  it('has default workspace seeded', () => {
    const ws = workspaceStore.getById('default');
    expect(ws).toBeDefined();
    expect(ws!.name).toBe('Default Workspace');
    expect(ws!.status).toBe('active');
  });

  it('default workspace references contractor blueprint and agents', () => {
    const ws = workspaceStore.getById('default')!;
    expect(ws.blueprintIds).toContain('bp_contractor_website_factory');
    expect(ws.agentIds).toContain('SiteArchitectAgent');
    expect(ws.agentIds).toContain('PageContentAgent');
    expect(ws.agentIds).toContain('QAReviewAgent');
  });
});
