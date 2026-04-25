import { coreDb } from "@/core/db/core";

import type { ProjectService, ProjectSummary } from "./projects.schemas";

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
  project: { id: string; key: string; displayName: string; createdAt: Date };
}): ProjectSummary {
  return {
    id: item.project.id,
    key: item.project.key,
    displayName: item.project.displayName,
    role: item.role,
    createdAt: item.project.createdAt.toISOString(),
  };
}

export const coreProjectsService = {
  async listForUser(userId: string): Promise<ProjectSummary[]> {
    const memberships = await coreDb.projectMembership.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map(mapProject);
  },

  async createForUser(userId: string, displayName: string): Promise<ProjectSummary> {
    const baseKey = toKey(displayName);
    const key = await ensureUniqueKey(baseKey);

    const project = await coreDb.project.create({
      data: {
        key,
        displayName,
      },
    });

    const membership = await coreDb.projectMembership.create({
      data: {
        role: "owner",
        userId,
        projectId: project.id,
      },
    });

    return mapProject({
      role: membership.role,
      project,
    });
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
        description: "Isolated Postgres-backed data with Prisma migrations.",
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
};
