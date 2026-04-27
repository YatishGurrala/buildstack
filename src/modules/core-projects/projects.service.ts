import { coreDb } from "@/core/db/core";
import {
  getProjectAuthSummary,
  getProjectDatabaseSummary,
  getProjectStorageUsage,
  provisionProjectSchema,
  toProjectSchemaName,
} from "@/core/db/projects";

import type { ProjectService, ProjectServiceDetails, ProjectSummary } from "./projects.schemas";

function toKey(displayName: string) {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

async function ensureUniqueKey(base: string) {
  let candidate = base || "project";
  let i = 1;

  while (true) {
    const exists = await coreDb.project.findUnique({ where: { key: candidate } });
    if (!exists) return candidate;
    i += 1;
    candidate = `${base}-${i}`.slice(0, 40);
  }
}

function mapProject(item: {
  role: "owner" | "admin" | "member";
  project: { id: string; key: string; schemaName: string; displayName: string; createdAt: Date };
}, storageBytes: number): ProjectSummary {
  return {
    id: item.project.id,
    key: item.project.key,
    schemaName: item.project.schemaName,
    displayName: item.project.displayName,
    role: item.role,
    createdAt: item.project.createdAt.toISOString(),
    usage: {
      storageBytes,
    },
  };
}

export const coreProjectsService = {
  async listForUser(userId: string): Promise<ProjectSummary[]> {
    const memberships = await coreDb.projectMembership.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });

    return Promise.all(
      memberships.map(async (membership) => {
        const storageBytes = await getProjectStorageUsage(membership.project.schemaName);
        return mapProject(membership, storageBytes);
      }),
    );
  },

  async createForUser(userId: string, displayName: string): Promise<ProjectSummary> {
    const baseKey = toKey(displayName);
    const key = await ensureUniqueKey(baseKey);
    const schemaName = toProjectSchemaName(key);

    const { membership, project } = await coreDb.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          key,
          schemaName,
          displayName,
        },
      });

      const createdMembership = await tx.projectMembership.create({
        data: {
          role: "owner",
          userId,
          projectId: createdProject.id,
        },
      });

      return {
        membership: createdMembership,
        project: createdProject,
      };
    });

    try {
      await provisionProjectSchema(schemaName);
    } catch (error) {
      await coreDb.project.delete({ where: { id: project.id } });
      throw error;
    }

    return mapProject({
      role: membership.role,
      project,
    }, 0);
  },

  async getServicesForUserProject(userId: string, projectId: string): Promise<ProjectService[]> {
    const membership = await coreDb.projectMembership.findFirst({
      where: {
        userId,
        projectId,
      },
      include: {
        project: true,
      },
    });

    if (!membership) {
      return [];
    }

    const base: ProjectService[] = [
      {
        id: "auth",
        name: "Authentication",
        description: "Google sign-in, session refresh, secure cookie auth.",
        status: "available",
      },
      {
        id: "database",
        name: "Database",
        description: "Isolated Postgres schema-backed data with usage tracking.",
        status: "available",
      },
      {
        id: "api",
        name: "REST API",
        description: "Route handlers, CSRF protection, rate limits, request IDs.",
        status: "available",
      },
      {
        id: "analytics",
        name: "Analytics",
        description: "Built-in metrics endpoint and error-rate monitoring.",
        status: "available",
      },
      {
        id: "storage",
        name: "Storage",
        description: "Planned managed file storage for project assets.",
        status: "coming-soon",
      },
    ];

    return base;
  },

  async getServiceDetailsForUserProject(
    userId: string,
    projectId: string,
    service: "auth" | "database" | "api",
  ): Promise<ProjectServiceDetails | null> {
    const membership = await coreDb.projectMembership.findFirst({
      where: {
        userId,
        projectId,
      },
      include: {
        project: true,
      },
    });

    if (!membership) {
      return null;
    }

    if (service === "auth") {
      const auth = await getProjectAuthSummary(membership.project.schemaName);
      return { service, auth };
    }

    if (service === "database") {
      const database = await getProjectDatabaseSummary(membership.project.schemaName);
      return { service, database };
    }

    const activeApiKeys = await coreDb.apiKey.count({
      where: {
        projectId,
        revokedAt: null,
      },
    });

    return {
      service,
      api: {
        activeApiKeys,
      },
    };
  },
};
