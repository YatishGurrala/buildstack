import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse } from "@/lib/http";
import { projectRecordsService } from "@/modules/project-records/records.service";
import { RecordUpdateSchema } from "@/modules/project-records/records.schemas";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectKey: string; recordId: string }> },
) {
  try {
    const { projectKey, recordId } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);
    const record = await projectRecordsService.getById(access.schemaName, recordId);
    const response = jsonResponse(request, { data: record });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectKey: string; recordId: string }> },
) {
  try {
    const { projectKey, recordId } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);
    const body = await request.json();
    const input = RecordUpdateSchema.parse(body);
    const record = await projectRecordsService.update(access.schemaName, recordId, input);
    const response = jsonResponse(request, { data: record });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectKey: string; recordId: string }> },
) {
  try {
    const { projectKey, recordId } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);
    await projectRecordsService.delete(access.schemaName, recordId);
    const response = jsonResponse(request, { ok: true });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}