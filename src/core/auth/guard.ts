import { NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@/core/auth/session";
import { coreDb } from "@/core/db/core";
import { verifyAccessToken } from "@/core/auth/tokens";
import { sha256 } from "@/lib/hash";
import { HttpError } from "@/lib/http";

function extractBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(request: NextRequest) {
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

  return {
    id: record.id,
    projectId: record.projectId,
    projectKey: record.project.key,
    schemaName: record.project.schemaName,
  };
}
