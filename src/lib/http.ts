import { NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { generateCsrfToken, setCsrfTokenInResponse, verifyCsrfToken } from "@/lib/csrf";
import { captureException } from "@/lib/sentry";
import { env } from "@/lib/env";

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "BAD_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse<T>(request: NextRequest, data: T, status = 200) {
  // Generate and set CSRF token for all responses
  const token = generateCsrfToken();
  const response = NextResponse.json(data, { status });
  
  setCsrfTokenInResponse(response, token);
  addSecurityHeaders(request, response);
  // Include CSRF token in response header for client
  response.headers.set("X-CSRF-Token", token);
  return response;
}

/**
 * Validate CSRF token for state-changing requests
 * Throws HttpError if validation fails
 */
export function validateCsrfToken(request: NextRequest): void {
  // TODO: re-enable before showcasing — SKIP_AUTH bypasses CSRF checks too
  if (env.SKIP_AUTH) return;
  const isValid = verifyCsrfToken(request);
  if (!isValid) {
    throw new HttpError(403, "CSRF token validation failed", "CSRF_VALIDATION_ERROR");
  }
}

export function addSecurityHeaders(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  response.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.headers.set("Referrer-Policy", "no-referrer");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export function handleApiError(request: NextRequest, error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse(
      request,
      { error: { code: error.code, message: error.message } },
      error.status,
    );
  }

  if (error instanceof ZodError) {
    return jsonResponse(
      request,
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten(),
        },
      },
      400,
    );
  }

  captureException(error);
  logger.error({ err: error }, "Unhandled API error");
  return jsonResponse(
    request,
    { error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } },
    500,
  );
}
