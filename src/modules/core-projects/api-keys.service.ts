import { randomBytes } from "node:crypto";

import { coreDb } from "@/core/db/core";
import { assertProjectPermission } from "@/core/rbac/rbac";
import { sha256 } from "@/lib/hash";
import { HttpError } from "@/lib/http";
import { auditLogService } from "@/modules/audit-log/audit-log.service";

import type { ApiKeyCreateResult, ApiKeySummary } from "./api-keys.schemas";

function mapApiKey(item: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes?: Array<{ scope: string }>;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): ApiKeySummary {
  return {
    id: item.id,
    name: item.name,
    keyPrefix: item.keyPrefix,
    scopes: item.scopes?.map((scope) => scope.scope) ?? [],
    createdAt: item.createdAt.toISOString(),
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    revokedAt: item.revokedAt?.toISOString() ?? null,
  };
}

async function requireProjectMembership(userId: string, projectId: string) {
  // 1. Direct project membership — fast path (existing behavior).
  const directMembership = await coreDb.projectMembership.findFirst({
    where: { userId, projectId },
    include: { project: true },
  });

  if (directMembership) {
    assertProjectPermission(directMembership.role, "manage_api_keys");
    return { role: directMembership.role, project: directMembership.project };
  }

  // 2. Org membership fallback: if the project belongs to an org and the user
  //    is a member of that org, grant access under their org role.
  const projectWithOrg = await coreDb.project.findFirst({
    where: { id: projectId, organizationId: { not: null } },
    include: {
      organization: {
        include: {
          members: { where: { userId }, take: 1 },
        },
      },
    },
  });

  const orgMember = projectWithOrg?.organization?.members[0];
  if (!orgMember || !projectWithOrg) {
    throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");
  }

  assertProjectPermission(orgMember.role, "manage_api_keys");
  return { role: orgMember.role, project: projectWithOrg };
}

export const projectApiKeysService = {
  async listForUserProject(userId: string, projectId: string): Promise<ApiKeySummary[]> {
    await requireProjectMembership(userId, projectId);

    const keys = await coreDb.apiKey.findMany({
      where: { projectId, revokedAt: null },
      include: {
        scopes: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return keys.map(mapApiKey);
  },

  async createForUserProject(
    userId: string,
    projectId: string,
    name: string,
    scopes?: string[],
  ): Promise<ApiKeyCreateResult> {
    const membership = await requireProjectMembership(userId, projectId);
    const token = randomBytes(24).toString("hex");
    const secret = `bs_${membership.project.key}_${token}`;
    const dedupedScopes = Array.from(new Set(scopes ?? []));
    const apiKey = await coreDb.apiKey.create({
      data: {
        projectId,
        createdByUserId: userId,
        name,
        keyPrefix: secret.slice(0, 16),
        keyHash: sha256(secret),
        scopes: dedupedScopes.length
          ? {
              createMany: {
                data: dedupedScopes.map((scope) => ({ scope })),
              },
            }
          : undefined,
      },
      include: {
        scopes: true,
      },
    });

    await auditLogService.log({
      action: "CREATE_API_KEY",
      status: "success",
      actorUserId: userId,
      projectId,
      resourceType: "api_key",
      resourceId: apiKey.id,
      metadata: {
        name,
        scopes: dedupedScopes,
      },
    });

    return {
      apiKey: mapApiKey(apiKey),
      secret,
    };
  },

  async revokeForUserProject(userId: string, projectId: string, keyId: string): Promise<void> {
    await requireProjectMembership(userId, projectId);

    const apiKey = await coreDb.apiKey.findFirst({
      where: {
        id: keyId,
        projectId,
        revokedAt: null,
      },
    });

    if (!apiKey) {
      throw new HttpError(404, "API key not found", "API_KEY_NOT_FOUND");
    }

    await coreDb.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    await auditLogService.log({
      action: "REVOKE_API_KEY",
      status: "success",
      actorUserId: userId,
      projectId,
      resourceType: "api_key",
      resourceId: keyId,
    });
  },

  async deleteForUserProject(userId: string, projectId: string, keyId: string): Promise<void> {
    await requireProjectMembership(userId, projectId);

    const apiKey = await coreDb.apiKey.findFirst({
      where: {
        id: keyId,
        projectId,
      },
    });

    if (!apiKey) {
      throw new HttpError(404, "API key not found", "API_KEY_NOT_FOUND");
    }

    if (!apiKey.revokedAt) {
      throw new HttpError(400, "Revoke API key before deleting", "API_KEY_MUST_BE_REVOKED");
    }

    await coreDb.apiKey.delete({
      where: { id: keyId },
    });

    await auditLogService.log({
      action: "REVOKE_API_KEY",
      status: "success",
      actorUserId: userId,
      projectId,
      resourceType: "api_key",
      resourceId: keyId,
      metadata: { mode: "delete" },
    });
  },
};