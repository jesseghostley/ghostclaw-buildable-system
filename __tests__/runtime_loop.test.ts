import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';

// Reset all module-level singletons before each test to avoid cross-test contamination.
beforeEach(() => {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
});

describe('processSignal', () => {
  it('creates a signal, plan, jobs and artifacts for keyword_opportunity_detected', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected', payload: { topic: 'AI' } });

    expect(result.signal.name).toBe('keyword_opportunity_detected');
    expect(result.plan.action).toBe('generate_content_cluster');
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].jobType).toBe('draft_cluster_outline');
    expect(result.jobs[0].status).toBe('completed');
    expect(result.artifacts).toHaveLength(1);
    expect(result.skillInvocations).toHaveLength(1);
    expect(result.skillInvocations[0].skillId).toBe('draft_cluster_outline');
    expect(result.skillInvocations[0].status).toBe('completed');
  });

  it('handles runtime_error_detected end-to-end', () => {
    const result = processSignal({ name: 'runtime_error_detected' });

    expect(result.plan.action).toBe('handle_runtime_error');
    expect(result.jobs[0].jobType).toBe('run_diagnostics');
    expect(result.jobs[0].assignedAgent).toBe('DiagnosticsAgent');
    expect(result.jobs[0].status).toBe('completed');
    expect(result.skillInvocations[0].agentId).toBe('DiagnosticsAgent');
  });

  it('handles marketplace_gap_detected end-to-end', () => {
    const result = processSignal({ name: 'marketplace_gap_detected' });

    expect(result.plan.action).toBe('create_new_skill');
    expect(result.jobs[0].jobType).toBe('scaffold_skill_package');
    expect(result.jobs[0].status).toBe('completed');
  });

  it('handles ranking_loss_detected end-to-end', () => {
    const result = processSignal({ name: 'ranking_loss_detected' });

    expect(result.plan.action).toBe('optimize_existing_page');
    expect(result.jobs[0].jobType).toBe('refresh_page_sections');
    expect(result.jobs[0].status).toBe('completed');
  });

  it('throws for an unknown signal name', () => {
    expect(() => processSignal({ name: 'not_a_real_signal' })).toThrow(
      'Unsupported signal name: not_a_real_signal',
    );
  });

  it('increments runtimeStore counts on each call', () => {
    processSignal({ name: 'keyword_opportunity_detected' });
    processSignal({ name: 'runtime_error_detected' });

    expect(runtimeStore.signals).toHaveLength(2);
    expect(runtimeStore.plans).toHaveLength(2);
    expect(runtimeStore.artifacts).toHaveLength(2);
    expect(runtimeStore.skillInvocations).toHaveLength(2);
  });

  it('populates runtimeStore.skillInvocations', () => {
    processSignal({ name: 'ranking_loss_detected' });
    expect(runtimeStore.skillInvocations).toHaveLength(1);
    expect(runtimeStore.skillInvocations[0].skillId).toBe('refresh_page_sections');
  });

  it('links artifact skillInvocationId to the invocation', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected' });
    const artifact = result.artifacts[0];
    const invocation = result.skillInvocations[0];
    expect(artifact.skillInvocationId).toBe(invocation.id);
  });
});
