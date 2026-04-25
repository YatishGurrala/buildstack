import { NextRequest, NextResponse } from "next/server";

import { revokeSession } from "@/core/auth/auth.service";
import { clearAuthCookies, REFRESH_COOKIE } from "@/core/auth/session";
import { applyCors } from "@/lib/cors";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await validateCsrfToken(request);
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
    if (refreshToken) {
      await revokeSession(refreshToken);
    }

    const response = jsonResponse(request, { message: "Signed out" });
    clearAuthCookies(response);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
