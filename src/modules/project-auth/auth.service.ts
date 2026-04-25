import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { SignJWT, jwtVerify } from "jose";

import {
  createAppSession,
  createAppUser,
  findActiveAppSession,
  findAppUserByEmail,
  findAppUserById,
  revokeAllAppSessionsForUser,
  revokeAppSession,
} from "@/core/db/projects";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { sha256 } from "@/lib/hash";

import type { AppUser, LoginInput, LoginResult, RegisterInput } from "./auth.schemas";

const scryptAsync = promisify(scrypt);
const secret = new TextEncoder().encode(env.JWT_SECRET);

// Sessions last 7 days for project app users
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

async function signAppToken(payload: { sub: string; email: string; projectKey: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);
}

function mapUser(row: { id: string; email: string; metadata: Record<string, unknown>; created_at: Date }): AppUser {
  return {
    id: row.id,
    email: row.email,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
  };
}

export const projectAuthService = {
  async register(schemaName: string, projectKey: string, input: RegisterInput): Promise<LoginResult> {
    const existing = await findAppUserByEmail(schemaName, input.email);
    if (existing) {
      throw new HttpError(409, "Email already registered", "EMAIL_TAKEN");
    }

    const id = randomBytes(12).toString("hex");
    const passwordHash = await hashPassword(input.password);
    const user = await createAppUser(schemaName, {
      id,
      email: input.email,
      passwordHash,
      metadata: input.metadata ?? {},
    });

    return projectAuthService._createSession(schemaName, projectKey, user);
  },

  async login(schemaName: string, projectKey: string, input: LoginInput): Promise<LoginResult> {
    const user = await findAppUserByEmail(schemaName, input.email);
    if (!user || !user.password_hash) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(input.password, user.password_hash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    return projectAuthService._createSession(schemaName, projectKey, user);
  },

  async logout(schemaName: string, sessionId: string): Promise<void> {
    await revokeAppSession(schemaName, sessionId);
  },

  async logoutAll(schemaName: string, appUserId: string): Promise<void> {
    await revokeAllAppSessionsForUser(schemaName, appUserId);
  },

  // Verifies an app-user bearer token and returns user + sessionId
  async verifyToken(schemaName: string, token: string): Promise<{ user: AppUser; sessionId: string }> {
    let payload: { sub?: string; email?: string; projectKey?: string };
    try {
      const result = await jwtVerify(token, secret);
      payload = result.payload as typeof payload;
    } catch {
      throw new HttpError(401, "Invalid or expired token", "INVALID_TOKEN");
    }

    if (!payload.sub || !payload.email) {
      throw new HttpError(401, "Invalid token payload", "INVALID_TOKEN");
    }

    const tokenHash = sha256(token);
    const session = await findActiveAppSession(schemaName, tokenHash);
    if (!session) {
      throw new HttpError(401, "Session expired or revoked", "SESSION_EXPIRED");
    }

    const user = await findAppUserById(schemaName, payload.sub);
    if (!user) {
      throw new HttpError(401, "User not found", "USER_NOT_FOUND");
    }

    return { user: mapUser(user), sessionId: session.id };
  },

  // Internal helper shared by register + login
  async _createSession(
    schemaName: string,
    projectKey: string,
    user: { id: string; email: string; metadata: Record<string, unknown>; created_at: Date },
  ): Promise<LoginResult> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    const token = await signAppToken({ sub: user.id, email: user.email, projectKey });
    const tokenHash = sha256(token);

    await createAppSession(schemaName, {
      id: randomBytes(12).toString("hex"),
      appUserId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user: mapUser(user),
      token,
      expiresAt: expiresAt.toISOString(),
    };
  },
};
