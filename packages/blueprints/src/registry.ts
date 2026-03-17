import type { Blueprint } from './types';

class BlueprintRegistry {
  private readonly blueprints = new Map<string, Blueprint>();

  register(blueprint: Blueprint): Blueprint {
    this.blueprints.set(blueprint.id, blueprint);
    return blueprint;
  }

  getById(id: string): Blueprint | undefined {
    return this.blueprints.get(id);
  }

  getBySignal(signalName: string): Blueprint | undefined {
    return Array.from(this.blueprints.values()).find(
      (bp) => bp.triggerSignal === signalName && bp.status === 'active',
    );
  }

  listAll(): Blueprint[] {
    return Array.from(this.blueprints.values());
  }

  listActive(): Blueprint[] {
    return Array.from(this.blueprints.values()).filter(
      (bp) => bp.status === 'active',
    );
  }

  deactivate(id: string): Blueprint | undefined {
    const bp = this.blueprints.get(id);
    if (!bp) return undefined;
    bp.status = 'archived';
    bp.updatedAt = Date.now();
    return bp;
  }

  reset(): void {
    this.blueprints.clear();
  }
}

export const blueprintRegistry = new BlueprintRegistry();
