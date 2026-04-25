import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { HttpError, handleApiError, jsonResponse } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

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

    const services = await coreProjectsService.getServicesForUserProject(user.sub, projectId);
    if (!services.length) {
      throw new HttpError(404, "Project not found", "PROJECT_NOT_FOUND");
    }

    const response = jsonResponse(request, { data: services });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
