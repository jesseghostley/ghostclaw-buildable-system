import type { Signal } from '../../core/src/runtime_loop';

export type PlannerAction =
  | 'generate_content_cluster'
  | 'optimize_existing_page'
  | 'create_new_skill';

const SIGNAL_TO_ACTION_MAP: Record<string, PlannerAction> = {
  keyword_opportunity_detected: 'generate_content_cluster',
  ranking_loss_detected: 'optimize_existing_page',
  marketplace_gap_detected: 'create_new_skill',
};

export function routeSignalToPlannerAction(signal: Signal): PlannerAction {
  const action = SIGNAL_TO_ACTION_MAP[signal.name];

  if (!action) {
    throw new Error(`Unsupported signal name: ${signal.name}`);
  }

  return action;
}
