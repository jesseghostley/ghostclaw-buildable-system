import { scanSlaBreaches, type SlaObservation, type SlaRule } from '../sla';
import type { SkillModule } from './index';

const skill: SkillModule = {
  skillId: 'scan_sla_transitions',
  execute(inputPayload) {
    const rules = Array.isArray(inputPayload.rules) ? inputPayload.rules as SlaRule[] : [];
    const observations = Array.isArray(inputPayload.observations) ? inputPayload.observations as SlaObservation[] : [];
    const now = typeof inputPayload.now === 'string' ? new Date(inputPayload.now) : new Date();
    const evaluations = scanSlaBreaches(rules, observations, now);
    return {
      status: 'completed',
      evaluations,
      breached: evaluations.filter((item) => item.status === 'breached').length,
      completedAfterSla: evaluations.filter((item) => item.status === 'completed_after_sla').length,
      withinSla: evaluations.filter((item) => item.status === 'within_sla' || item.status === 'completed_within_sla').length,
    };
  },
};

export default skill;
