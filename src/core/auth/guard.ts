import { NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@/core/auth/session";
import { coreDb } from "@/core/db/core";
import { provisionProjectSchema } from "@/core/db/projects";
import { verifyAccessToken } from "@/core/auth/tokens";
import { sha256 } from "@/lib/hash";
import { HttpError } from "@/lib/http";
import { env } from "@/lib/env";

function extractBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(request: NextRequest) {
  // TODO: remove before showcasing — SKIP_AUTH bypasses all session auth
  if (env.SKIP_AUTH) {
    const admin = await coreDb.user.upsert({
      where: { googleSub: "__admin__" },
      create: { googleSub: "__admin__", email: env.ADMIN_EMAIL ?? "admin@localhost", name: "Admin" },
      update: {},
    });
    return { sub: admin.id, email: admin.email };
  }

  const bearer = extractBearerToken(request);
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const token = bearer ?? cookieToken;

  if (!token) {
    throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
  }

  return verifyAccessToken(token);
}

export async function requireProjectApiKey(request: NextRequest, projectKey: string) {
  const apiKey = request.headers.get("x-api-key")?.trim();

  if (!apiKey) {
    throw new HttpError(401, "API key is required", "API_KEY_REQUIRED");
  }

  const apiKeyHash = sha256(apiKey);
  const record = await coreDb.apiKey.findFirst({
    where: {
      keyHash: apiKeyHash,
      revokedAt: null,
      project: {
        key: projectKey,
      },
    },
    include: {
      project: true,
    },
  });

  if (!record) {
    throw new HttpError(401, "Invalid API key", "INVALID_API_KEY");
  }

  await coreDb.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  // Backfill safety: ensure legacy projects created before schema provisioning still work.
  await provisionProjectSchema(record.project.schemaName);

  return {
    id: record.id,
    projectId: record.projectId,
    projectKey: record.project.key,
    schemaName: record.project.schemaName,
  };
}
