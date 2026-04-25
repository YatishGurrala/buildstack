import { NextResponse } from "next/server";

const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Set CSRF token in response (sets secure, httpOnly  cookie)
 */
export function setCsrfTokenInResponse(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfTokenFromCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split("; ").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split("=");
      acc[key] = decodeURIComponent(value || "");
      return acc;
    },
    {} as Record<string, string>
  );
  return cookies[CSRF_TOKEN_NAME];
}

/**
 * Get CSRF token from request headers (sent by client)
 */
export function getCsrfTokenFromHeader(
  request: Request,
): string | undefined {
  return request.headers.get(CSRF_HEADER_NAME) || undefined;
}

/**
 * Verify CSRF token - compares header token with cookie token
 * Returns true if tokens match and are not empty (for GET/HEAD/OPTIONS, always returns true)
 */
export function verifyCsrfToken(request: Request): boolean {
  // Only validate state-changing requests
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both tokens must exist and match exactly
  if (!cookieToken || !headerToken) {
    return false;
  }

  return cookieToken === headerToken;
}
