import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { assertApiKeyScope } from "@/core/rbac/rbac";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { auditLogService } from "@/modules/audit-log/audit-log.service";
import { usageLogService } from "@/modules/usage-log/usage-log.service";
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
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const access = await requireProjectApiKey(request, projectKey);
    assertApiKeyScope(access.scopes, "records:read");
    const query = RecordListQuerySchema.parse({
      collection: request.nextUrl.searchParams.get("collection") ?? undefined,
      ownerId: request.nextUrl.searchParams.get("ownerId") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const records = await projectRecordsService.list(access.schemaName, query);
    await usageLogService.record({
      metric: "records.read",
      projectId: access.projectId,
      metadata: {
        route: "GET /api/v1/:projectKey/records",
        count: records.length,
        requestId,
      },
    });
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
    validateCsrfToken(request, "token");
    const { projectKey } = await context.params;
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const access = await requireProjectApiKey(request, projectKey);
    assertApiKeyScope(access.scopes, "records:write");
    const body = await request.json();
    const input = RecordCreateSchema.parse(body);
    const record = await projectRecordsService.create(access.schemaName, input);
    await usageLogService.record({
      metric: "records.write",
      projectId: access.projectId,
      metadata: {
        route: "POST /api/v1/:projectKey/records",
        collection: input.collection,
        requestId,
      },
    });
    await auditLogService.log({
      action: "CREATE_RECORD",
      status: "success",
      projectId: access.projectId,
      resourceType: "record",
      resourceId: record.id,
      metadata: {
        projectKey,
        collection: input.collection,
        requestId,
      },
    });
    const response = jsonResponse(request, { data: record }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}