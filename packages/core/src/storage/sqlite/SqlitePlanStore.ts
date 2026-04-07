import Database from 'better-sqlite3';
import type { IPlanStore } from '../interfaces/IPlanStore';
import type { Plan } from '../../runtime_loop';

export class SqlitePlanStore implements IPlanStore {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        signalId TEXT NOT NULL,
        action TEXT NOT NULL,
        strategyId TEXT NOT NULL,
        strategyType TEXT NOT NULL,
        priority INTEGER,
        requiredAgents TEXT,
        expectedOutputs TEXT,
        createdAt INTEGER NOT NULL
      )
    `);
  }

  private rowToPlan(row: Record<string, unknown>): Plan {
    return {
      id: row.id as string,
      signalId: row.signalId as string,
      action: row.action as Plan['action'],
      strategyId: row.strategyId as string,
      strategyType: row.strategyType as Plan['strategyType'],
      priority: row.priority != null ? (row.priority as number) : undefined,
      requiredAgents: row.requiredAgents
        ? (JSON.parse(row.requiredAgents as string) as string[])
        : undefined,
      expectedOutputs: row.expectedOutputs
        ? (JSON.parse(row.expectedOutputs as string) as string[])
        : undefined,
      createdAt: row.createdAt as number,
    };
  }

  create(plan: Plan): Plan {
    const existing = this.db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(plan.id) as Record<string, unknown> | undefined;
    if (existing) {
      return this.rowToPlan(existing);
    }

    this.db.prepare(`
      INSERT INTO plans (id, signalId, action, strategyId, strategyType, priority, requiredAgents, expectedOutputs, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id,
      plan.signalId,
      plan.action,
      plan.strategyId,
      plan.strategyType,
      plan.priority ?? null,
      plan.requiredAgents ? JSON.stringify(plan.requiredAgents) : null,
      plan.expectedOutputs ? JSON.stringify(plan.expectedOutputs) : null,
      plan.createdAt,
    );

    return plan;
  }

  getById(id: string): Plan | undefined {
    const row = this.db
      .prepare('SELECT * FROM plans WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToPlan(row) : undefined;
  }

  listAll(): Plan[] {
    const rows = this.db.prepare('SELECT * FROM plans').all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToPlan(r));
  }

  listBySignalId(signalId: string): Plan[] {
    const rows = this.db
      .prepare('SELECT * FROM plans WHERE signalId = ?')
      .all(signalId) as Record<string, unknown>[];
    return rows.map((r) => this.rowToPlan(r));
  }

  reset(): void {
    this.db.prepare('DELETE FROM plans').run();
  }
}
