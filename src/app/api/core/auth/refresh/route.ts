import { NextRequest, NextResponse } from "next/server";

import { rotateSession } from "@/core/auth/auth.service";
import { REFRESH_COOKIE, setAuthCookies } from "@/core/auth/session";
import { applyCors } from "@/lib/cors";
import { handleApiError, HttpError, jsonResponse, validateCsrfToken } from "@/lib/http";

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
    if (!refreshToken) {
      throw new HttpError(401, "Missing refresh token", "MISSING_REFRESH_TOKEN");
    }

    const result = await rotateSession(refreshToken);
    const response = jsonResponse(request, {
      user: result.user,
      accessToken: result.accessToken,
      message: "Session refreshed",
    });

    setAuthCookies(response, result.accessToken, result.refreshToken);
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
