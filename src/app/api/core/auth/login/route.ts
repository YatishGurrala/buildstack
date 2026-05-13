import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { coreDb } from "@/core/db/core";
import { setAuthCookies } from "@/core/auth/session";
import { signAccessToken, signRefreshToken } from "@/core/auth/tokens";
import { sha256 } from "@/lib/hash";
import { applyCors } from "@/lib/cors";
import { enforceRateLimit } from "@/lib/rate-limit";
import { handleApiError, jsonResponse, validateCsrfToken } from "@/lib/http";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { randomUUID } from "node:crypto";
import { auditLogService } from "@/modules/audit-log/audit-log.service";
import { usageLogService } from "@/modules/usage-log/usage-log.service";

export const runtime = "nodejs";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) {
      // Still run comparison on equal-length buffers to avoid timing leak
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function POST(request: NextRequest) {
  try {
    await validateCsrfToken(request);
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    enforceRateLimit(`admin-login:${ip}`, 10, 60 * 1000);

    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
      throw new HttpError(503, "Admin credentials not configured", "ADMIN_NOT_CONFIGURED");
    }

    const body = await request.json();
    const { email, password } = LoginSchema.parse(body);

    const emailMatch = safeEqual(email.toLowerCase(), env.ADMIN_EMAIL.toLowerCase());
    const passwordMatch = safeEqual(password, env.ADMIN_PASSWORD);

    if (!emailMatch || !passwordMatch) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    // Upsert the admin user — googleSub uses a stable sentinel value
    const user = await coreDb.user.upsert({
      where: { googleSub: "__admin__" },
      create: {
        googleSub: "__admin__",
        email: env.ADMIN_EMAIL,
        name: "Admin",
      },
      update: {
        email: env.ADMIN_EMAIL,
      },
    });

    const sessionId = randomUUID();
    const refreshToken = await signRefreshToken({ sub: user.id, sid: sessionId });
    const accessToken = await signAccessToken({ sub: user.id, email: user.email });

    await coreDb.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await auditLogService.log({
      action: "LOGIN_SUCCESS",
      status: "success",
      actorUserId: user.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        provider: "admin",
      },
    });
    await usageLogService.record({
      metric: "auth.login.success",
      metadata: {
        provider: "admin",
      },
    });

    const response = jsonResponse(request, {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      message: "Signed in",
    });

    setAuthCookies(response, accessToken, refreshToken);
    applyCors(request, response);
    return response;
  } catch (error) {
    await auditLogService.log({
      action: "LOGIN_FAILED",
      status: "failed",
      ipAddress: request.headers.get("x-forwarded-for") ?? "local",
      userAgent: request.headers.get("user-agent") ?? undefined,
      metadata: {
        provider: "admin",
      },
    });
    await usageLogService.record({
      metric: "auth.login.failed",
      metadata: {
        provider: "admin",
      },
    });
    logger.warn({ err: error }, "Admin login failed");
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
