export type SlaSeverity = 'info' | 'warning' | 'critical';

export type SlaRule = {
  id: string;
  objectType: string;
  transition: string;
  targetMinutes: number;
  escalationOwner?: string;
  recoveryAction?: string;
  severity?: SlaSeverity;
};

export type SlaObservation = {
  objectId: string;
  objectType: string;
  transition: string;
  startedAt: string;
  completedAt?: string;
  currentOwner?: string;
};

export type SlaEvaluation = {
  ruleId: string;
  objectId: string;
  status: 'within_sla' | 'breached' | 'completed_within_sla' | 'completed_after_sla';
  elapsedMinutes: number;
  targetMinutes: number;
  breachMinutes: number;
  escalationOwner?: string;
  recoveryAction?: string;
  severity: SlaSeverity;
};

function toMs(value: string): number {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) throw new Error(`Invalid timestamp: ${value}`);
  return ms;
}

export function evaluateSla(
  rule: SlaRule,
  observation: SlaObservation,
  now = new Date(),
): SlaEvaluation {
  if (rule.targetMinutes < 0 || !Number.isFinite(rule.targetMinutes)) {
    throw new Error('sla.targetMinutes must be a non-negative finite number');
  }
  if (rule.objectType !== observation.objectType) {
    throw new Error('sla objectType does not match observation');
  }
  if (rule.transition !== observation.transition) {
    throw new Error('sla transition does not match observation');
  }

  const started = toMs(observation.startedAt);
  const end = observation.completedAt ? toMs(observation.completedAt) : now.getTime();
  const elapsedMinutes = Math.max(0, Math.floor((end - started) / 60000));
  const breachMinutes = Math.max(0, elapsedMinutes - rule.targetMinutes);
  const breached = elapsedMinutes > rule.targetMinutes;

  let status: SlaEvaluation['status'];
  if (observation.completedAt) {
    status = breached ? 'completed_after_sla' : 'completed_within_sla';
  } else {
    status = breached ? 'breached' : 'within_sla';
  }

  return {
    ruleId: rule.id,
    objectId: observation.objectId,
    status,
    elapsedMinutes,
    targetMinutes: rule.targetMinutes,
    breachMinutes,
    escalationOwner: rule.escalationOwner,
    recoveryAction: rule.recoveryAction,
    severity: rule.severity ?? 'warning',
  };
}

export function scanSlaBreaches(
  rules: SlaRule[],
  observations: SlaObservation[],
  now = new Date(),
): SlaEvaluation[] {
  const ruleMap = new Map(rules.map((rule) => [`${rule.objectType}:${rule.transition}`, rule]));
  return observations
    .map((observation) => {
      const rule = ruleMap.get(`${observation.objectType}:${observation.transition}`);
      if (!rule) return null;
      return evaluateSla(rule, observation, now);
    })
    .filter((result): result is SlaEvaluation => Boolean(result));
}
