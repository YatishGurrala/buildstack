import { Pool } from "pg";

import { env } from "@/lib/env";

const globalForProjects = globalThis as unknown as { projectsPool?: Pool };

export const projectsDb =
  globalForProjects.projectsPool ??
  new Pool({
    connectionString: env.PROJECTS_DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForProjects.projectsPool = projectsDb;
}

async function queryRows<T>(sql: string, values: unknown[] = []) {
  const result = await projectsDb.query(sql, values);
  return result.rows as T[];
}

async function execute(sql: string, values: unknown[] = []) {
  await projectsDb.query(sql, values);
}

export function toProjectSchemaName(projectKey: string) {
  const sanitized = projectKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  return `proj_${sanitized || "app"}`;
}

function quoteIdentifier(value: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return `"${value}"`;
}

export async function provisionProjectSchema(schemaName: string) {
  const schema = quoteIdentifier(schemaName);

  await execute(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await execute(`
    CREATE TABLE IF NOT EXISTS ${schema}.app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execute(`
    CREATE TABLE IF NOT EXISTS ${schema}.app_sessions (
      id TEXT PRIMARY KEY,
      app_user_id TEXT NOT NULL REFERENCES ${schema}.app_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP(3) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP(3)
    )
  `);
  await execute(`
    CREATE TABLE IF NOT EXISTS ${schema}.records (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      owner_id TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await execute(
    `CREATE INDEX IF NOT EXISTS ${schemaName}_records_collection_idx ON ${schema}.records(collection)`,
  );
  await execute(
    `CREATE INDEX IF NOT EXISTS ${schemaName}_records_owner_idx ON ${schema}.records(owner_id)`,
  );
}

export async function getProjectStorageUsage(schemaName: string) {
  const rows = await queryRows<{ storageBytes: bigint | number | string | null }>(
    `
      SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0) AS "storageBytes"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relkind = 'r'
    `,
    [schemaName],
  );

  const value = rows[0]?.storageBytes ?? 0;

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value;
}

type ProjectRecordRow = {
  id: string;
  collection: string;
  owner_id: string | null;
  data: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProjectRecordFilters = {
  collection?: string;
  ownerId?: string;
  limit: number;
};

function recordTable(schemaName: string) {
  return `${quoteIdentifier(schemaName)}.records`;
}

export async function listProjectRecords(schemaName: string, filters: ProjectRecordFilters) {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.collection) {
    values.push(filters.collection);
    conditions.push(`collection = $${values.length}`);
  }

  if (filters.ownerId) {
    values.push(filters.ownerId);
    conditions.push(`owner_id = $${values.length}`);
  }

  values.push(filters.limit);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return queryRows<ProjectRecordRow>(
    `
      SELECT id, collection, owner_id, data, created_at, updated_at
      FROM ${recordTable(schemaName)}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values,
  );
}

export async function createProjectRecord(
  schemaName: string,
  input: { id: string; collection: string; ownerId: string | null; data: Record<string, unknown> },
) {
  const rows = await queryRows<ProjectRecordRow>(
    `
      INSERT INTO ${recordTable(schemaName)} (id, collection, owner_id, data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, collection, owner_id, data, created_at, updated_at
    `,
    [input.id, input.collection, input.ownerId, JSON.stringify(input.data)],
  );

  return rows[0];
}

export async function getProjectRecordById(schemaName: string, recordId: string) {
  const rows = await queryRows<ProjectRecordRow>(
    `
      SELECT id, collection, owner_id, data, created_at, updated_at
      FROM ${recordTable(schemaName)}
      WHERE id = $1
      LIMIT 1
    `,
    [recordId],
  );

  return rows[0] ?? null;
}

export async function updateProjectRecord(
  schemaName: string,
  recordId: string,
  input: { ownerId?: string | null; data?: Record<string, unknown> },
) {
  const assignments = ["updated_at = CURRENT_TIMESTAMP"];
  const values: unknown[] = [];

  if (Object.prototype.hasOwnProperty.call(input, "ownerId")) {
    values.push(input.ownerId ?? null);
    assignments.push(`owner_id = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(input, "data")) {
    values.push(JSON.stringify(input.data ?? {}));
    assignments.push(`data = $${values.length}::jsonb`);
  }

  values.push(recordId);

  const rows = await queryRows<ProjectRecordRow>(
    `
      UPDATE ${recordTable(schemaName)}
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, collection, owner_id, data, created_at, updated_at
    `,
    values,
  );

  return rows[0] ?? null;
}

export async function deleteProjectRecord(schemaName: string, recordId: string) {
  const rows = await queryRows<{ id: string }>(
    `
      DELETE FROM ${recordTable(schemaName)}
      WHERE id = $1
      RETURNING id
    `,
    [recordId],
  );

  return rows.length > 0;
}

// ─── App users & sessions ────────────────────────────────────────────────────

type AppUserRow = {
  id: string;
  email: string;
  password_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: Date | string;
  updated_at: Date | string;
};

type AppSessionRow = {
  id: string;
  app_user_id: string;
  token_hash: string;
  expires_at: Date | string;
  created_at: Date | string;
  revoked_at: Date | string | null;
};

function userTable(schemaName: string) {
  return `${quoteIdentifier(schemaName)}.app_users`;
}

function sessionTable(schemaName: string) {
  return `${quoteIdentifier(schemaName)}.app_sessions`;
}

export async function getProjectAuthSummary(schemaName: string) {
  const [userCountRows, activeSessionRows, totalSessionRows, recentUsers] = await Promise.all([
    queryRows<{ count: string | number }>(`SELECT COUNT(*)::int AS count FROM ${userTable(schemaName)}`),
    queryRows<{ count: string | number }>(
      `SELECT COUNT(*)::int AS count
       FROM ${sessionTable(schemaName)}
       WHERE revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    ),
    queryRows<{ count: string | number }>(`SELECT COUNT(*)::int AS count FROM ${sessionTable(schemaName)}`),
    queryRows<{ id: string; email: string; created_at: Date | string }>(
      `SELECT id, email, created_at
       FROM ${userTable(schemaName)}
       ORDER BY created_at DESC
       LIMIT 10`,
    ),
  ]);

  return {
    totalUsers: Number(userCountRows[0]?.count ?? 0),
    activeSessions: Number(activeSessionRows[0]?.count ?? 0),
    totalSessions: Number(totalSessionRows[0]?.count ?? 0),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      email: user.email,
      createdAt: new Date(user.created_at).toISOString(),
    })),
  };
}

export async function getProjectDatabaseSummary(schemaName: string) {
  const [recordCountRows, collectionCountRows, collections] = await Promise.all([
    queryRows<{ count: string | number }>(`SELECT COUNT(*)::int AS count FROM ${recordTable(schemaName)}`),
    queryRows<{ count: string | number }>(
      `SELECT COUNT(DISTINCT collection)::int AS count FROM ${recordTable(schemaName)}`,
    ),
    queryRows<{ name: string; count: string | number }>(
      `SELECT collection AS name, COUNT(*)::int AS count
       FROM ${recordTable(schemaName)}
       GROUP BY collection
       ORDER BY COUNT(*) DESC, collection ASC
       LIMIT 10`,
    ),
  ]);

  return {
    totalRecords: Number(recordCountRows[0]?.count ?? 0),
    totalCollections: Number(collectionCountRows[0]?.count ?? 0),
    collections: collections.map((collection) => ({
      name: collection.name,
      count: Number(collection.count),
    })),
  };
}

export async function findAppUserByEmail(schemaName: string, email: string) {
  const rows = await queryRows<AppUserRow>(
    `SELECT id, email, password_hash, metadata, created_at, updated_at
     FROM ${userTable(schemaName)}
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findAppUserById(schemaName: string, id: string) {
  const rows = await queryRows<AppUserRow>(
    `SELECT id, email, password_hash, metadata, created_at, updated_at
     FROM ${userTable(schemaName)}
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createAppUser(
  schemaName: string,
  input: { id: string; email: string; passwordHash: string; metadata: Record<string, unknown> },
) {
  const rows = await queryRows<AppUserRow>(
    `INSERT INTO ${userTable(schemaName)} (id, email, password_hash, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id, email, password_hash, metadata, created_at, updated_at`,
    [input.id, input.email, input.passwordHash, JSON.stringify(input.metadata)],
  );
  return rows[0];
}

export async function createAppSession(
  schemaName: string,
  input: { id: string; appUserId: string; tokenHash: string; expiresAt: Date },
) {
  const rows = await queryRows<AppSessionRow>(
    `INSERT INTO ${sessionTable(schemaName)} (id, app_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, app_user_id, token_hash, expires_at, created_at, revoked_at`,
    [input.id, input.appUserId, input.tokenHash, input.expiresAt],
  );
  return rows[0];
}

export async function findActiveAppSession(schemaName: string, tokenHash: string) {
  const rows = await queryRows<AppSessionRow>(
    `SELECT id, app_user_id, token_hash, expires_at, created_at, revoked_at
     FROM ${sessionTable(schemaName)}
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > CURRENT_TIMESTAMP
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revokeAppSession(schemaName: string, sessionId: string) {
  await execute(
    `UPDATE ${sessionTable(schemaName)}
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sessionId],
  );
}

export async function revokeAllAppSessionsForUser(schemaName: string, appUserId: string) {
  await execute(
    `UPDATE ${sessionTable(schemaName)}
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE app_user_id = $1 AND revoked_at IS NULL`,
    [appUserId],
  );
}