import { jwtVerify, SignJWT } from "jose";

import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
};

/** Audience claim applied to all platform (core) tokens. */
export const PLATFORM_TOKEN_AUDIENCE = "buildstack-core";

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(PLATFORM_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(secret);
}

export async function signRefreshToken(payload: RefreshTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience(PLATFORM_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { audience: PLATFORM_TOKEN_AUDIENCE });
    if (!payload.sub || !payload.email) {
      throw new HttpError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
    }

    return {
      sub: String(payload.sub),
      email: String(payload.email),
    };
  } catch {
    throw new HttpError(401, "Invalid access token", "INVALID_ACCESS_TOKEN");
  }
}

export async function verifyRefreshToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, { audience: PLATFORM_TOKEN_AUDIENCE });
    if (!payload.sub || !payload.sid) {
      throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    return {
      sub: String(payload.sub),
      sid: String(payload.sid),
    };
  } catch {
    throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }
}
