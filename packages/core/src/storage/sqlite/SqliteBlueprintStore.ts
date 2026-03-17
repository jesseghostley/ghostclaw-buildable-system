import Database from 'better-sqlite3';
import type { IBlueprintStore } from '../interfaces/IBlueprintStore';
import type { Blueprint, BlueprintStatus } from '../../../../blueprints/src/types';

export class SqliteBlueprintStore implements IBlueprintStore {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blueprints (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        triggerSignal TEXT NOT NULL,
        plannerAction TEXT NOT NULL,
        strategyId TEXT NOT NULL,
        steps TEXT NOT NULL,
        inputs TEXT NOT NULL,
        outputs TEXT NOT NULL,
        approvalGates TEXT NOT NULL,
        requiredAgents TEXT NOT NULL,
        requiredSkills TEXT NOT NULL,
        queueType TEXT NOT NULL,
        auditEvents TEXT NOT NULL,
        memoryKeys TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);
  }

  private rowToBlueprint(row: Record<string, unknown>): Blueprint {
    return {
      id: row.id as string,
      name: row.name as string,
      version: row.version as string,
      description: row.description as string,
      status: row.status as BlueprintStatus,
      triggerSignal: row.triggerSignal as string,
      plannerAction: row.plannerAction as string,
      strategyId: row.strategyId as string,
      steps: JSON.parse(row.steps as string),
      inputs: JSON.parse(row.inputs as string),
      outputs: JSON.parse(row.outputs as string),
      approvalGates: JSON.parse(row.approvalGates as string),
      requiredAgents: JSON.parse(row.requiredAgents as string),
      requiredSkills: JSON.parse(row.requiredSkills as string),
      queueType: row.queueType as Blueprint['queueType'],
      auditEvents: JSON.parse(row.auditEvents as string),
      memoryKeys: JSON.parse(row.memoryKeys as string),
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    };
  }

  create(blueprint: Blueprint): Blueprint {
    this.db.prepare(`
      INSERT INTO blueprints (id, name, version, description, status, triggerSignal, plannerAction,
        strategyId, steps, inputs, outputs, approvalGates, requiredAgents, requiredSkills,
        queueType, auditEvents, memoryKeys, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      blueprint.id,
      blueprint.name,
      blueprint.version,
      blueprint.description,
      blueprint.status,
      blueprint.triggerSignal,
      blueprint.plannerAction,
      blueprint.strategyId,
      JSON.stringify(blueprint.steps),
      JSON.stringify(blueprint.inputs),
      JSON.stringify(blueprint.outputs),
      JSON.stringify(blueprint.approvalGates),
      JSON.stringify(blueprint.requiredAgents),
      JSON.stringify(blueprint.requiredSkills),
      blueprint.queueType,
      JSON.stringify(blueprint.auditEvents),
      JSON.stringify(blueprint.memoryKeys),
      blueprint.createdAt,
      blueprint.updatedAt,
    );
    return blueprint;
  }

  getById(id: string): Blueprint | undefined {
    const row = this.db.prepare('SELECT * FROM blueprints WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToBlueprint(row) : undefined;
  }

  getBySignal(signalName: string): Blueprint | undefined {
    const row = this.db.prepare("SELECT * FROM blueprints WHERE triggerSignal = ? AND status = 'active' LIMIT 1").get(signalName) as Record<string, unknown> | undefined;
    return row ? this.rowToBlueprint(row) : undefined;
  }

  listAll(): Blueprint[] {
    const rows = this.db.prepare('SELECT * FROM blueprints ORDER BY createdAt ASC').all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToBlueprint(r));
  }

  listActive(): Blueprint[] {
    const rows = this.db.prepare("SELECT * FROM blueprints WHERE status = 'active' ORDER BY createdAt ASC").all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToBlueprint(r));
  }

  deactivate(id: string): Blueprint | undefined {
    const existing = this.db.prepare('SELECT * FROM blueprints WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return undefined;
    const now = Date.now();
    this.db.prepare("UPDATE blueprints SET status = 'archived', updatedAt = ? WHERE id = ?").run(now, id);
    return this.getById(id);
  }

  reset(): void {
    this.db.prepare('DELETE FROM blueprints').run();
  }
}
