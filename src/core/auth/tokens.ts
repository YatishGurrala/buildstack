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

export async function signAccessToken(payload: AccessTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(secret);
}

export async function signRefreshToken(payload: RefreshTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
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
    const { payload } = await jwtVerify(token, secret);
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
