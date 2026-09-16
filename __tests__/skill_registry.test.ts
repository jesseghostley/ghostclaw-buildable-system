import { getSkill, listSkills, skillRegistry } from '../packages/core/src/skills';

describe('Skill Registry', () => {
  it('has all nine registered skills', () => {
    expect(skillRegistry.size).toBe(9);
  });

  it('returns a skill by id', () => {
    const skill = getSkill('build_site_page');
    expect(skill).toBeDefined();
    expect(skill!.skillId).toBe('build_site_page');
    expect(typeof skill!.execute).toBe('function');
  });

  it('returns the EmDash homepage renderer by id', () => {
    const skill = getSkill('render_emdash_homepage');
    expect(skill).toBeDefined();
    expect(skill!.skillId).toBe('render_emdash_homepage');
    expect(typeof skill!.execute).toBe('function');
  });

  it('returns the EmDash site bundle renderer by id', () => {
    const skill = getSkill('render_emdash_site_bundle');
    expect(skill).toBeDefined();
    expect(skill!.skillId).toBe('render_emdash_site_bundle');
    expect(typeof skill!.execute).toBe('function');
  });

  it('returns the execution integrity scanner by id', () => {
    const skill = getSkill('scan_execution_integrity');
    expect(skill).toBeDefined();
    expect(skill!.skillId).toBe('scan_execution_integrity');
    expect(typeof skill!.execute).toBe('function');
  });

  it('returns the SLA transition scanner by id', () => {
    const skill = getSkill('scan_sla_transitions');
    expect(skill).toBeDefined();
    expect(skill!.skillId).toBe('scan_sla_transitions');
    expect(typeof skill!.execute).toBe('function');
  });

  it('returns undefined for unknown skill', () => {
    expect(getSkill('nonexistent_skill')).toBeUndefined();
  });

  it('lists all registered skills', () => {
    const skills = listSkills();
    const ids = skills.map((s) => s.skillId).sort();
    expect(ids).toEqual([
      'build_site_page',
      'draft_cluster_outline',
      'refresh_page_sections',
      'render_emdash_homepage',
      'render_emdash_site_bundle',
      'run_diagnostics',
      'scaffold_skill_package',
      'scan_execution_integrity',
      'scan_sla_transitions',
    ]);
  });

  it('each skill has a callable execute function', () => {
    for (const skill of listSkills()) {
      expect(typeof skill.execute).toBe('function');
    }
  });
});

describe('Stub skills produce expected output', () => {
  it('draft_cluster_outline returns result string', () => {
    const skill = getSkill('draft_cluster_outline')!;
    const output = skill.execute({ signalName: 'test_signal' });
    expect(output.result).toBe('Cluster outline generated for test_signal');
  });

  it('refresh_page_sections returns result string', () => {
    const skill = getSkill('refresh_page_sections')!;
    const output = skill.execute({ signalName: 'test_signal' });
    expect(output.result).toBe('Page sections refreshed for test_signal');
  });

  it('scaffold_skill_package returns result string', () => {
    const skill = getSkill('scaffold_skill_package')!;
    const output = skill.execute({ signalName: 'test_signal' });
    expect(output.result).toBe('Skill package scaffolded for test_signal');
  });

  it('run_diagnostics returns result string', () => {
    const skill = getSkill('run_diagnostics')!;
    const output = skill.execute({ signalName: 'test_signal' });
    expect(output.result).toBe('Diagnostics run for test_signal');
  });

  it('stub skills default to unknown_signal when signalName is missing', () => {
    const skill = getSkill('draft_cluster_outline')!;
    const output = skill.execute({});
    expect(output.result).toBe('Cluster outline generated for unknown_signal');
  });
});
