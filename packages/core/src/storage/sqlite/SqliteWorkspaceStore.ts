import Database from 'better-sqlite3';
import type { IWorkspaceStore } from '../interfaces/IWorkspaceStore';
import type { Workspace, WorkspaceStatus } from '../../../../workspaces/src/types';

export class SqliteWorkspaceStore implements IWorkspaceStore {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        blueprintIds TEXT NOT NULL,
        agentIds TEXT NOT NULL,
        policyIds TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )
    `);
  }

  private rowToWorkspace(row: Record<string, unknown>): Workspace {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      status: row.status as WorkspaceStatus,
      blueprintIds: JSON.parse(row.blueprintIds as string),
      agentIds: JSON.parse(row.agentIds as string),
      policyIds: JSON.parse(row.policyIds as string),
      createdAt: row.createdAt as number,
      updatedAt: row.updatedAt as number,
    };
  }

  create(workspace: Workspace): Workspace {
    this.db.prepare(`
      INSERT INTO workspaces (id, name, description, status, blueprintIds, agentIds, policyIds, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      workspace.id,
      workspace.name,
      workspace.description,
      workspace.status,
      JSON.stringify(workspace.blueprintIds),
      JSON.stringify(workspace.agentIds),
      JSON.stringify(workspace.policyIds),
      workspace.createdAt,
      workspace.updatedAt,
    );
    return workspace;
  }

  getById(id: string): Workspace | undefined {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToWorkspace(row) : undefined;
  }

  listAll(): Workspace[] {
    const rows = this.db.prepare('SELECT * FROM workspaces ORDER BY createdAt ASC').all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToWorkspace(r));
  }

  listActive(): Workspace[] {
    const rows = this.db.prepare("SELECT * FROM workspaces WHERE status = 'active' ORDER BY createdAt ASC").all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToWorkspace(r));
  }

  update(id: string, updates: Partial<Pick<Workspace, 'name' | 'description' | 'status' | 'blueprintIds' | 'agentIds' | 'policyIds'>>): Workspace | undefined {
    const existing = this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) return undefined;

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) { setClauses.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { setClauses.push('description = ?'); params.push(updates.description); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); params.push(updates.status); }
    if (updates.blueprintIds !== undefined) { setClauses.push('blueprintIds = ?'); params.push(JSON.stringify(updates.blueprintIds)); }
    if (updates.agentIds !== undefined) { setClauses.push('agentIds = ?'); params.push(JSON.stringify(updates.agentIds)); }
    if (updates.policyIds !== undefined) { setClauses.push('policyIds = ?'); params.push(JSON.stringify(updates.policyIds)); }

    if (setClauses.length === 0) return this.getById(id);

    setClauses.push('updatedAt = ?');
    params.push(Date.now());
    params.push(id);

    this.db.prepare(`UPDATE workspaces SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  }

  reset(): void {
    this.db.prepare('DELETE FROM workspaces').run();
  }
}
