import { type NextRequest, NextResponse } from 'next/server';
import { logger } from './lib/logger';
import { verifyAccessToken } from './core/auth/tokens';
import { recordRequestMetric } from './lib/analytics';
import { emitErrorRateAlert } from './lib/monitoring';

/**
 * Request logging proxy for all API routes
 * Logs: method, path, status, response time, and authenticated user (if available)
 * Excludes: sensitive data (tokens, passwords, request/response bodies)
 */
export async function proxy(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Extract user context from auth token (if present)
  let userId: string | undefined;
  try {
    const authHeader = request.headers.get('authorization');
    const cookie = request.cookies.get('ACCESS_COOKIE')?.value;

    const token = authHeader?.replace('Bearer ', '') || cookie;
    if (token) {
      const payload = await verifyAccessToken(token);
      userId = payload.sub;
    }
  } catch {
    // Token invalid or expired - no user context
  }

  // Create response (pass-through for actual handler)
  const response = NextResponse.next();

  const duration = Date.now() - startTime;

  // Log request details
  logger.info(
    {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      query: request.nextUrl.search ? Object.fromEntries(new URL(request.url).searchParams) : undefined,
      userId,
      status: response.status,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    },
    `${request.method} ${request.nextUrl.pathname} - ${response.status} (${duration}ms)`
  );

  recordRequestMetric({
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    durationMs: duration,
  });

  emitErrorRateAlert({
    route: `${request.method} ${request.nextUrl.pathname}`,
    count: 1,
    errorCount: response.status >= 400 ? 1 : 0,
    errorRate: response.status >= 400 ? 100 : 0,
  });

  return response;
}

// Configure which routes to apply proxy to
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Exclude static assets and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};