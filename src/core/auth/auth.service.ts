import { randomUUID } from "node:crypto";

import { coreDb } from "@/core/db/core";
import { sha256 } from "@/lib/hash";
import { HttpError } from "@/lib/http";

import { verifyGoogleIdToken } from "./google";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

type AuthResult = {
  user: {
    id: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
  accessToken: string;
  refreshToken: string;
};

export async function loginWithGoogle(idToken: string): Promise<AuthResult> {
  const googleProfile = await verifyGoogleIdToken(idToken);

  const user = await coreDb.user.upsert({
    where: { googleSub: googleProfile.sub },
    create: {
      googleSub: googleProfile.sub,
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
    },
    update: {
      email: googleProfile.email,
      name: googleProfile.name,
      picture: googleProfile.picture,
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

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    accessToken,
    refreshToken,
  };
}

export async function rotateSession(refreshToken: string): Promise<AuthResult> {
  const payload = await verifyRefreshToken(refreshToken);

  const session = await coreDb.session.findUnique({
    where: { id: payload.sid },
    include: { user: true },
  });

  if (!session || session.userId !== payload.sub || session.revokedAt) {
    throw new HttpError(401, "Invalid session", "INVALID_SESSION");
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "Session expired", "SESSION_EXPIRED");
  }

  const incomingHash = sha256(refreshToken);
  if (incomingHash !== session.refreshTokenHash) {
    throw new HttpError(401, "Token mismatch", "TOKEN_MISMATCH");
  }

  const nextRefreshToken = await signRefreshToken({
    sub: session.userId,
    sid: session.id,
  });
  const nextAccessToken = await signAccessToken({
    sub: session.userId,
    email: session.user.email,
  });

  await coreDb.session.update({
    where: { id: session.id },
    data: {
      refreshTokenHash: sha256(nextRefreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      picture: session.user.picture,
    },
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
  };
}

export async function revokeSession(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);

  await coreDb.session.updateMany({
    where: {
      id: payload.sid,
      userId: payload.sub,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
