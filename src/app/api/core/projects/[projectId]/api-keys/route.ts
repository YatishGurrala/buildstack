import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { projectApiKeysService } from "@/modules/core-projects/api-keys.service";
import { ApiKeyCreateSchema } from "@/modules/core-projects/api-keys.schemas";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireUser(request);
    const { projectId } = await context.params;
    const keys = await projectApiKeysService.listForUserProject(user.sub, projectId);
    const response = jsonResponse(request, { data: keys });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    await validateCsrfToken(request);
    const user = await requireUser(request);
    const { projectId } = await context.params;
    const body = await request.json();
    const input = ApiKeyCreateSchema.parse(body);
    const apiKey = await projectApiKeysService.createForUserProject(user.sub, projectId, input.name);
    const response = jsonResponse(request, { data: apiKey }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}