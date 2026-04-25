import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { ProjectCreateSchema } from "@/modules/core-projects/projects.schemas";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const projects = await coreProjectsService.listForUser(user.sub);
    const response = jsonResponse(request, { data: projects });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    await validateCsrfToken(request);
    const user = await requireUser(request);
    const body = await request.json();
    const input = ProjectCreateSchema.parse(body);

    const project = await coreProjectsService.createForUser(user.sub, input.displayName);
    const response = jsonResponse(request, { data: project }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
