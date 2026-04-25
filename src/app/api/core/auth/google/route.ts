import { NextRequest, NextResponse } from "next/server";

import { loginWithGoogle } from "@/core/auth/auth.service";
import { setAuthCookies } from "@/core/auth/session";
import { applyCors } from "@/lib/cors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";

const LoginSchema = z.object({
  idToken: z.string().min(1),
});

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await validateCsrfToken(request);
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    enforceRateLimit(`google-login:${ip}`, 15, 60 * 1000);

    const body = await request.json();
    const { idToken } = LoginSchema.parse(body);

    const result = await loginWithGoogle(idToken);
    const response = jsonResponse(request, {
      user: result.user,
      accessToken: result.accessToken,
      message: "Signed in with Google",
    });

    setAuthCookies(response, result.accessToken, result.refreshToken);
    applyCors(request, response);
    return response;
  } catch (error) {
    logger.warn({ err: error }, "Google login failed");
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
