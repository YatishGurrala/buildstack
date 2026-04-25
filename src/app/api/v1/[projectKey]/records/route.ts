import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse } from "@/lib/http";
import { projectRecordsService } from "@/modules/project-records/records.service";
import { RecordCreateSchema, RecordListQuerySchema } from "@/modules/project-records/records.schemas";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectKey: string }> },
) {
  try {
    const { projectKey } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);
    const query = RecordListQuerySchema.parse({
      collection: request.nextUrl.searchParams.get("collection") ?? undefined,
      ownerId: request.nextUrl.searchParams.get("ownerId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const records = await projectRecordsService.list(access.schemaName, query);
    const response = jsonResponse(request, { data: records });
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
  context: { params: Promise<{ projectKey: string }> },
) {
  try {
    const { projectKey } = await context.params;
    const access = await requireProjectApiKey(request, projectKey);
    const body = await request.json();
    const input = RecordCreateSchema.parse(body);
    const record = await projectRecordsService.create(access.schemaName, input);
    const response = jsonResponse(request, { data: record }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}