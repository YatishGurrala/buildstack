import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { project2Service } from "@/modules/project2/project2.service";
import { TaskCreateSchema } from "@/modules/project2/project2.schemas";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const tasks = await project2Service.listTasks(user.sub);
    const response = jsonResponse(request, { data: tasks });
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
    const input = TaskCreateSchema.parse(body);

    const task = await project2Service.createTask(user.sub, input);
    const response = jsonResponse(request, { data: task }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}