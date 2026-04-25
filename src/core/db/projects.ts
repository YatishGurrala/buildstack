import { PrismaClient } from "@/generated/core";

import { env } from "@/lib/env";

const globalForProjects = globalThis as unknown as { projectsPrisma?: PrismaClient };

export const projectsDb =
  globalForProjects.projectsPrisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.PROJECTS_DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForProjects.projectsPrisma = projectsDb;
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

  await projectsDb.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await projectsDb.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.app_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await projectsDb.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.app_sessions (
      id TEXT PRIMARY KEY,
      app_user_id TEXT NOT NULL REFERENCES ${schema}.app_users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP(3) NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP(3)
    )
  `);
  await projectsDb.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${schema}.records (
      id TEXT PRIMARY KEY,
      collection TEXT NOT NULL,
      owner_id TEXT,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await projectsDb.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS ${schemaName}_records_collection_idx ON ${schema}.records(collection)`,
  );
  await projectsDb.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS ${schemaName}_records_owner_idx ON ${schema}.records(owner_id)`,
  );
}

export async function getProjectStorageUsage(schemaName: string) {
  const rows = await projectsDb.$queryRawUnsafe<Array<{ storageBytes: bigint | number | string | null }>>(
    `
      SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0) AS "storageBytes"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = $1
        AND c.relkind = 'r'
    `,
    schemaName,
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
  created_at: Date;
  updated_at: Date;
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

  return projectsDb.$queryRawUnsafe<ProjectRecordRow[]>(
    `
      SELECT id, collection, owner_id, data, created_at, updated_at
      FROM ${recordTable(schemaName)}
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    ...values,
  );
}

export async function createProjectRecord(
  schemaName: string,
  input: { id: string; collection: string; ownerId: string | null; data: Record<string, unknown> },
) {
  const rows = await projectsDb.$queryRawUnsafe<ProjectRecordRow[]>(
    `
      INSERT INTO ${recordTable(schemaName)} (id, collection, owner_id, data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, collection, owner_id, data, created_at, updated_at
    `,
    input.id,
    input.collection,
    input.ownerId,
    JSON.stringify(input.data),
  );

  return rows[0];
}

export async function getProjectRecordById(schemaName: string, recordId: string) {
  const rows = await projectsDb.$queryRawUnsafe<ProjectRecordRow[]>(
    `
      SELECT id, collection, owner_id, data, created_at, updated_at
      FROM ${recordTable(schemaName)}
      WHERE id = $1
      LIMIT 1
    `,
    recordId,
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

  const rows = await projectsDb.$queryRawUnsafe<ProjectRecordRow[]>(
    `
      UPDATE ${recordTable(schemaName)}
      SET ${assignments.join(", ")}
      WHERE id = $${values.length}
      RETURNING id, collection, owner_id, data, created_at, updated_at
    `,
    ...values,
  );

  return rows[0] ?? null;
}

export async function deleteProjectRecord(schemaName: string, recordId: string) {
  const rows = await projectsDb.$queryRawUnsafe<Array<{ id: string }>>(
    `
      DELETE FROM ${recordTable(schemaName)}
      WHERE id = $1
      RETURNING id
    `,
    recordId,
  );

  return rows.length > 0;
}