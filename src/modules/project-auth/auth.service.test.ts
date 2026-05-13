import { scrypt } from "node:crypto";
import { promisify } from "node:util";

import {
  createAppSession,
  createAppUser,
  findActiveAppSession,
  findAppUserByEmail,
  findAppUserById,
  revokeAllAppSessionsForUser,
  revokeAppSession,
} from "@/core/db/projects";
import { HttpError } from "@/lib/http";
import { projectAuthService } from "./auth.service";

const tokenPayloadStore = new Map<string, { sub: string; email: string; projectKey: string }>();

jest.mock("jose", () => {
  return {
    SignJWT: class {
      private payload: { sub: string; email: string; projectKey: string };

      constructor(payload: { sub: string; email: string; projectKey: string }) {
        this.payload = payload;
      }

      setProtectedHeader() {
        return this;
      }

      setIssuedAt() {
        return this;
      }

      setAudience() {
        return this;
      }

      setExpirationTime() {
        return this;
      }

      async sign() {
        const token = `mock-jwt-${this.payload.sub}-${Date.now()}-${Math.random()}`;
        tokenPayloadStore.set(token, this.payload);
        return token;
      }
    },
    jwtVerify: jest.fn(async (token: string) => {
      const payload = tokenPayloadStore.get(token);
      if (!payload) {
        throw new Error("Invalid token");
      }

      return { payload };
    }),
  };
});

jest.mock("@/core/db/projects", () => ({
  createAppSession: jest.fn(),
  createAppUser: jest.fn(),
  findActiveAppSession: jest.fn(),
  findAppUserByEmail: jest.fn(),
  findAppUserById: jest.fn(),
  revokeAllAppSessionsForUser: jest.fn(),
  revokeAppSession: jest.fn(),
}));

const scryptAsync = promisify(scrypt);

async function hashPasswordForTest(password: string, salt = "test-salt-value") {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

describe("projectAuthService", () => {
  const schemaName = "proj_test";
  const projectKey = "test";

  beforeEach(() => {
    jest.clearAllMocks();
    (createAppSession as jest.Mock).mockResolvedValue({ id: "s1" });
  });

  it("registers a new app user", async () => {
    (findAppUserByEmail as jest.Mock).mockResolvedValue(null);
    (createAppUser as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@example.com",
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await projectAuthService.register(schemaName, projectKey, {
      email: "alice@example.com",
      password: "password123",
    });

    expect(result.user.email).toBe("alice@example.com");
    expect(result.token).toBeTruthy();
    expect(createAppUser).toHaveBeenCalledWith(
      schemaName,
      expect.objectContaining({
        email: "alice@example.com",
        passwordHash: expect.stringContaining(":"),
      }),
    );
    expect(createAppSession).toHaveBeenCalled();
  });

  it("rejects register when email already exists", async () => {
    (findAppUserByEmail as jest.Mock).mockResolvedValue({ id: "u1", email: "alice@example.com" });

    await expect(
      projectAuthService.register(schemaName, projectKey, {
        email: "alice@example.com",
        password: "password123",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        code: "EMAIL_TAKEN",
      }),
    );
  });

  it("logs in user with valid credentials", async () => {
    const passwordHash = await hashPasswordForTest("password123");
    (findAppUserByEmail as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@example.com",
      password_hash: passwordHash,
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await projectAuthService.login(schemaName, projectKey, {
      email: "alice@example.com",
      password: "password123",
    });

    expect(result.user.id).toBe("u1");
    expect(result.token).toBeTruthy();
    expect(createAppSession).toHaveBeenCalled();
  });

  it("rejects login with wrong password", async () => {
    const passwordHash = await hashPasswordForTest("password123");
    (findAppUserByEmail as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@example.com",
      password_hash: passwordHash,
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      projectAuthService.login(schemaName, projectKey, {
        email: "alice@example.com",
        password: "wrong-password",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        code: "INVALID_CREDENTIALS",
      }),
    );
  });

  it("verifies token with active session", async () => {
    const sessionResult = await projectAuthService._createSession(schemaName, projectKey, {
      id: "u1",
      email: "alice@example.com",
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    (findActiveAppSession as jest.Mock).mockResolvedValue({
      id: "sess-1",
      app_user_id: "u1",
      token_hash: "hash",
      expires_at: new Date(Date.now() + 60_000),
      created_at: new Date(),
      revoked_at: null,
    });
    (findAppUserById as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "alice@example.com",
      password_hash: null,
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
      updated_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    const verified = await projectAuthService.verifyToken(schemaName, sessionResult.token);

    expect(verified.sessionId).toBe("sess-1");
    expect(verified.user.email).toBe("alice@example.com");
  });

  it("rejects token verification when session is missing", async () => {
    const sessionResult = await projectAuthService._createSession(schemaName, projectKey, {
      id: "u1",
      email: "alice@example.com",
      metadata: {},
      created_at: new Date("2026-01-01T00:00:00.000Z"),
    });

    (findActiveAppSession as jest.Mock).mockResolvedValue(null);

    await expect(projectAuthService.verifyToken(schemaName, sessionResult.token)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        code: "SESSION_EXPIRED",
      }),
    );
  });

  it("revokes one session and all sessions", async () => {
    await projectAuthService.logout(schemaName, "sess-1");
    await projectAuthService.logoutAll(schemaName, "u1");

    expect(revokeAppSession).toHaveBeenCalledWith(schemaName, "sess-1");
    expect(revokeAllAppSessionsForUser).toHaveBeenCalledWith(schemaName, "u1");
  });

  it("throws HttpError for malformed token", async () => {
    await expect(projectAuthService.verifyToken(schemaName, "not-a-jwt-token")).rejects.toBeInstanceOf(HttpError);
  });
});
