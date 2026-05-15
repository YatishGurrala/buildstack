import { NextRequest, NextResponse } from "next/server";

import { requireProjectApiKey } from "@/core/auth/guard";
import { assertApiKeyScope } from "@/core/rbac/rbac";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { auditLogService } from "@/modules/audit-log/audit-log.service";
import { usageLogService } from "@/modules/usage-log/usage-log.service";
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
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const access = await requireProjectApiKey(request, projectKey);
    assertApiKeyScope(access.scopes, "records:read");
    const record = await projectRecordsService.getById(access.schemaName, recordId);
    await usageLogService.record({
      metric: "records.read",
      projectId: access.projectId,
      metadata: {
        route: "GET /api/v1/:projectKey/records/:recordId",
        requestId,
      },
    });
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
    validateCsrfToken(request, "token");
    const { projectKey, recordId } = await context.params;
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const access = await requireProjectApiKey(request, projectKey);
    assertApiKeyScope(access.scopes, "records:write");
    const body = await request.json();
    const input = RecordUpdateSchema.parse(body);
    const record = await projectRecordsService.update(access.schemaName, recordId, input);
    await usageLogService.record({
      metric: "records.write",
      projectId: access.projectId,
      metadata: {
        route: "PATCH /api/v1/:projectKey/records/:recordId",
        requestId,
      },
    });
    await auditLogService.log({
      action: "UPDATE_RECORD",
      status: "success",
      projectId: access.projectId,
      resourceType: "record",
      resourceId: recordId,
      metadata: {
        projectKey,
        recordId,
        collection: record.collection,
        requestId,
      },
    });
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
    validateCsrfToken(request, "token");
    const { projectKey, recordId } = await context.params;
    const requestId = request.headers.get("x-request-id") ?? undefined;
    const access = await requireProjectApiKey(request, projectKey);
    assertApiKeyScope(access.scopes, "records:delete");
    await projectRecordsService.delete(access.schemaName, recordId);
    await usageLogService.record({
      metric: "records.delete",
      projectId: access.projectId,
      metadata: {
        route: "DELETE /api/v1/:projectKey/records/:recordId",
        requestId,
      },
    });
    await auditLogService.log({
      action: "DELETE_RECORD",
      status: "success",
      projectId: access.projectId,
      resourceType: "record",
      resourceId: recordId,
      metadata: {
        projectKey,
        recordId,
        requestId,
      },
    });
    const response = jsonResponse(request, { ok: true });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}