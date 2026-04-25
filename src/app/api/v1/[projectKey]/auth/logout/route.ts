import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse } from "@/lib/http";
import { HttpError } from "@/lib/http";
import { projectAuthService } from "@/modules/project-auth/auth.service";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectKey: string }> },
) {
  try {
    const { projectKey } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);

    // The user's session token comes in via Authorization: Bearer <token>
    const authHeader = request.headers.get("x-user-token") ?? request.headers.get("authorization") ?? "";
    const userToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!userToken) {
      throw new HttpError(400, "User token required (X-User-Token or Authorization: Bearer)", "TOKEN_REQUIRED");
    }

    const { sessionId } = await projectAuthService.verifyToken(access.schemaName, userToken);
    await projectAuthService.logout(access.schemaName, sessionId);

    const response = jsonResponse(request, { success: true });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
