import type { SkillModule } from './index';
import { scanExecutionIntegrity, type ExecutionRecord } from '../execution';

function execute(inputPayload: Record<string, unknown>): Record<string, unknown> {
  const payload = (inputPayload.signalPayload ?? inputPayload) as Record<string, unknown>;
  const records = payload.records;
  if (!Array.isArray(records)) throw new Error('scan_execution_integrity requires records[]');

  const nowValue = payload.now;
  const now = typeof nowValue === 'string' ? new Date(nowValue) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error('scan_execution_integrity now must be an ISO date string');

  const report = scanExecutionIntegrity(records as ExecutionRecord[], now);
  return {
    status: report.findings.length === 0 ? 'healthy' : 'attention_required',
    report,
  };
}

const scanExecutionIntegritySkill: SkillModule = {
  skillId: 'scan_execution_integrity',
  execute,
};

export default scanExecutionIntegritySkill;
