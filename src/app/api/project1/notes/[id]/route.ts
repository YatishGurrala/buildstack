import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { project1Service } from "@/modules/project1/project1.service";
import { NoteUpdateSchema } from "@/modules/project1/project1.schemas";

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
    const note = await project1Service.getNoteById(id, user.sub);

    if (!note) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Note not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    const response = jsonResponse(request, { data: note });
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

    // Verify note exists and belongs to user
    const existingNote = await project1Service.getNoteById(id, user.sub);
    if (!existingNote) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Note not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    const body = await request.json();
    const input = NoteUpdateSchema.parse(body);

    await project1Service.updateNote(id, user.sub, input);
    const updatedNote = await project1Service.getNoteById(id, user.sub);

    const response = jsonResponse(request, { data: updatedNote });
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

    // Verify note exists and belongs to user
    const existingNote = await project1Service.getNoteById(id, user.sub);
    if (!existingNote) {
      const response = jsonResponse(
        request,
        { error: { code: "NOT_FOUND", message: "Note not found" } },
        404
      );
      applyCors(request, response);
      return response;
    }

    await project1Service.deleteNote(id, user.sub);
    const response = jsonResponse(request, { data: { id } });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
