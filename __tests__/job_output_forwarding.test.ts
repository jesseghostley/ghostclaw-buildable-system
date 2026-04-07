import { processSignal, runtimeStore } from '../packages/core/src/runtime_loop';
import { jobQueue } from '../packages/core/src/job_queue';
import { skillInvocationStore } from '../packages/core/src/skill_invocation';
import { assignmentStore } from '../packages/core/src/assignment';

beforeEach(() => {
  runtimeStore.signals.length = 0;
  runtimeStore.plans.length = 0;
  runtimeStore.jobs.length = 0;
  runtimeStore.artifacts.length = 0;
  runtimeStore.skillInvocations.length = 0;
  runtimeStore.assignments.length = 0;
  jobQueue.reset();
  skillInvocationStore.reset();
  assignmentStore.reset();
});

describe('Job output forwarding', () => {
  it('single-step workflows do not include stepContext', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected', payload: { topic: 'AI' } });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].inputPayload).toEqual({
      signalName: 'keyword_opportunity_detected',
      signalPayload: { topic: 'AI' },
    });
    // No stepContext key should be present for single-step
    expect(result.jobs[0].inputPayload).not.toHaveProperty('stepContext');
  });

  it('single-step contractor site workflow still produces correct output', () => {
    const result = processSignal({
      name: 'contractor_site_requested',
      payload: {
        sites: [
          { businessName: 'Summit HVAC', trade: 'hvac', location: 'Denver, CO', phone: '303-555-1234', email: 'info@summithvac.com' },
        ],
      },
    });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].status).toBe('completed');
    expect(result.artifacts).toHaveLength(1);

    const content = JSON.parse(result.artifacts[0].content);
    expect(content.handoffReady).toBe(true);
    expect(content.sites[0].slug).toBe('summit-hvac');
  });

  it('preserves signal payload through the chain', () => {
    const payload = { topic: 'testing', extra: 42 };
    const result = processSignal({ name: 'keyword_opportunity_detected', payload });

    expect(result.jobs[0].inputPayload.signalPayload).toEqual(payload);
  });

  it('completed job has outputPayload set', () => {
    const result = processSignal({ name: 'keyword_opportunity_detected' });

    expect(result.jobs[0].outputPayload).toBeDefined();
    expect(result.jobs[0].outputPayload).toHaveProperty('result');
  });

  it('all signal types still produce completed jobs with artifacts', () => {
    const signals = [
      'keyword_opportunity_detected',
      'ranking_loss_detected',
      'marketplace_gap_detected',
      'runtime_error_detected',
      'contractor_site_requested',
    ];

    for (const signalName of signals) {
      // Reset between signals
      runtimeStore.signals.length = 0;
      runtimeStore.plans.length = 0;
      runtimeStore.jobs.length = 0;
      runtimeStore.artifacts.length = 0;
      runtimeStore.skillInvocations.length = 0;
      runtimeStore.assignments.length = 0;
      jobQueue.reset();
      skillInvocationStore.reset();
      assignmentStore.reset();

      const payload = signalName === 'contractor_site_requested'
        ? { sites: [{ businessName: 'Test Co', trade: 'test', location: 'Test, TX' }] }
        : undefined;

      const result = processSignal({ name: signalName, payload });
      expect(result.jobs.length).toBeGreaterThan(0);
      expect(result.jobs[0].status).toBe('completed');
      expect(result.artifacts.length).toBeGreaterThan(0);
    }
  });
});
