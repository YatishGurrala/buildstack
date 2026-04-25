import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse } from "@/lib/http";
import { projectAuthService } from "@/modules/project-auth/auth.service";
import { RegisterSchema } from "@/modules/project-auth/auth.schemas";

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
    const body = await request.json();
    const input = RegisterSchema.parse(body);

    const result = await projectAuthService.register(access.schemaName, projectKey, input);
    const response = jsonResponse(request, result, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
