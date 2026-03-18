import type { Blueprint, BlueprintStatus } from '../../../../blueprints/src/types';

export interface IBlueprintStore {
  create(blueprint: Blueprint): Blueprint;
  getById(id: string): Blueprint | undefined;
  getBySignal(signalName: string): Blueprint | undefined;
  listAll(): Blueprint[];
  listActive(): Blueprint[];
  deactivate(id: string): Blueprint | undefined;
  reset(): void;
}
