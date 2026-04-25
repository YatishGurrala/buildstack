import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { projectApiKeysService } from "@/modules/core-projects/api-keys.service";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; keyId: string }> },
) {
  try {
    await validateCsrfToken(request);
    const user = await requireUser(request);
    const { projectId, keyId } = await context.params;
    await projectApiKeysService.revokeForUserProject(user.sub, projectId, keyId);
    const response = jsonResponse(request, { ok: true });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}