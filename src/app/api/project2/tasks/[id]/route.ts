import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { project2Service } from "@/modules/project2/project2.service";
import { TaskUpdateSchema } from "@/modules/project2/project2.schemas";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const task = await project2Service.getTaskById(id, user.sub);

    if (!task) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    const response = jsonResponse(request, { data: task });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await validateCsrfToken(request);
    const { id } = await params;
    const user = await requireUser(request);

    // Verify task exists and belongs to user
    const existingTask = await project2Service.getTaskById(id, user.sub);
    if (!existingTask) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    const body = await request.json();
    const input = TaskUpdateSchema.parse(body);

    await project2Service.updateTask(id, user.sub, input);
    const updatedTask = await project2Service.getTaskById(id, user.sub);

    const response = jsonResponse(request, { data: updatedTask });
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await validateCsrfToken(request);
    const { id } = await params;
    const user = await requireUser(request);

    // Verify task exists and belongs to user
    const existingTask = await project2Service.getTaskById(id, user.sub);
    if (!existingTask) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Task not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    await project2Service.deleteTask(id, user.sub);
    const response = jsonResponse(request, { data: { id } });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
