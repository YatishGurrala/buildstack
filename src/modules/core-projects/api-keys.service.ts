import { randomBytes } from "node:crypto";

import { coreDb } from "@/core/db/core";
import { sha256 } from "@/lib/hash";
import { HttpError } from "@/lib/http";

import type { ApiKeyCreateResult, ApiKeySummary } from "./api-keys.schemas";

function mapApiKey(item: {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}): ApiKeySummary {
  return {
    id: item.id,
    name: item.name,
    keyPrefix: item.keyPrefix,
    createdAt: item.createdAt.toISOString(),
    lastUsedAt: item.lastUsedAt?.toISOString() ?? null,
    revokedAt: item.revokedAt?.toISOString() ?? null,
  };
}

async function requireProjectMembership(userId: string, projectId: string) {
  const membership = await coreDb.projectMembership.findFirst({
    where: { userId, projectId },
    include: { project: true },
  });

  if (!membership) {
    throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");
  }

  return membership;
}

export const projectApiKeysService = {
  async listForUserProject(userId: string, projectId: string): Promise<ApiKeySummary[]> {
    await requireProjectMembership(userId, projectId);

    const keys = await coreDb.apiKey.findMany({
      where: { projectId },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
    });

    return keys.map(mapApiKey);
  },

  async createForUserProject(userId: string, projectId: string, name: string): Promise<ApiKeyCreateResult> {
    const membership = await requireProjectMembership(userId, projectId);
    const token = randomBytes(24).toString("hex");
    const secret = `bs_${membership.project.key}_${token}`;
    const apiKey = await coreDb.apiKey.create({
      data: {
        projectId,
        name,
        keyPrefix: secret.slice(0, 16),
        keyHash: sha256(secret),
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
  },
};