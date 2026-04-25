import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { project1Service } from "@/modules/project1/project1.service";
import { NoteCreateSchema } from "@/modules/project1/project1.schemas";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const notes = await project1Service.listNotes(user.sub);
    const response = jsonResponse(request, { data: notes });
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
    const input = NoteCreateSchema.parse(body);

    const note = await project1Service.createNote(user.sub, input);
    const response = jsonResponse(request, { data: note }, 201);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
