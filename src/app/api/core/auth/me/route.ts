import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { coreDb } from "@/core/db/core";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser(request);
    const user = await coreDb.user.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true },
    });
    const response = jsonResponse(request, { data: user });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
