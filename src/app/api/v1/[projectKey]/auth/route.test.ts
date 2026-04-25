import { NextRequest } from "next/server";

import { POST as registerRoute } from "@/app/api/v1/[projectKey]/auth/register/route";
import { POST as loginRoute } from "@/app/api/v1/[projectKey]/auth/login/route";
import { POST as logoutRoute } from "@/app/api/v1/[projectKey]/auth/logout/route";
import { requireProjectApiKey } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { projectAuthService } from "@/modules/project-auth/auth.service";

jest.mock("@/core/auth/guard", () => ({
  requireProjectApiKey: jest.fn(),
}));

jest.mock("@/modules/project-auth/auth.service", () => ({
  projectAuthService: {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    verifyToken: jest.fn(),
  },
}));

describe("project auth routes", () => {
  const mockedGuard = requireProjectApiKey as jest.MockedFunction<typeof requireProjectApiKey>;
  const ACCESS = {
    id: "key1",
    projectId: "p1",
    projectKey: "myapp",
    schemaName: "proj_myapp",
  };

  const AUTH_RESULT = {
    user: { id: "u1", email: "alice@example.com", metadata: {}, createdAt: "2026-01-01T00:00:00.000Z" },
    token: "tok.abc.xyz",
    expiresAt: "2026-02-01T00:00:00.000Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGuard.mockResolvedValue(ACCESS);
  });

  // ── register ─────────────────────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("returns 201 with user and token", async () => {
      (projectAuthService.register as jest.Mock).mockResolvedValue(AUTH_RESULT);

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "bs_myapp_secret" },
        body: JSON.stringify({ email: "alice@example.com", password: "password123" }),
      });

      const response = await registerRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.token).toBe("tok.abc.xyz");
      expect(body.user.email).toBe("alice@example.com");
    });

    it("returns 409 when email is already taken", async () => {
      (projectAuthService.register as jest.Mock).mockRejectedValue(
        new HttpError(409, "Email already registered", "EMAIL_TAKEN"),
      );

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "bs_myapp_secret" },
        body: JSON.stringify({ email: "alice@example.com", password: "password123" }),
      });

      const response = await registerRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(409);
    });

    it("returns 400 when body is invalid", async () => {
      const request = new NextRequest("http://localhost/api/v1/myapp/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "bs_myapp_secret" },
        body: JSON.stringify({ email: "not-an-email", password: "pw" }),
      });

      const response = await registerRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(400);
    });

    it("returns 401 when api key is missing", async () => {
      mockedGuard.mockRejectedValue(new HttpError(401, "API key is required", "API_KEY_REQUIRED"));

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", password: "password123" }),
      });

      const response = await registerRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(401);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("returns 200 with user and token", async () => {
      (projectAuthService.login as jest.Mock).mockResolvedValue(AUTH_RESULT);

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "bs_myapp_secret" },
        body: JSON.stringify({ email: "alice@example.com", password: "password123" }),
      });

      const response = await loginRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.token).toBe("tok.abc.xyz");
    });

    it("returns 401 on wrong credentials", async () => {
      (projectAuthService.login as jest.Mock).mockRejectedValue(
        new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS"),
      );

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": "bs_myapp_secret" },
        body: JSON.stringify({ email: "alice@example.com", password: "wrong" }),
      });

      const response = await loginRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(401);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("returns 200 on successful logout", async () => {
      (projectAuthService.verifyToken as jest.Mock).mockResolvedValue({ user: AUTH_RESULT.user, sessionId: "sess1" });
      (projectAuthService.logout as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/logout", {
        method: "POST",
        headers: {
          "x-api-key": "bs_myapp_secret",
          "x-user-token": "tok.abc.xyz",
        },
      });

      const response = await logoutRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
    });

    it("returns 400 when no user token provided", async () => {
      const request = new NextRequest("http://localhost/api/v1/myapp/auth/logout", {
        method: "POST",
        headers: { "x-api-key": "bs_myapp_secret" },
      });

      const response = await logoutRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(400);
    });

    it("returns 401 when user token is invalid", async () => {
      (projectAuthService.verifyToken as jest.Mock).mockRejectedValue(
        new HttpError(401, "Invalid or expired token", "INVALID_TOKEN"),
      );

      const request = new NextRequest("http://localhost/api/v1/myapp/auth/logout", {
        method: "POST",
        headers: {
          "x-api-key": "bs_myapp_secret",
          "x-user-token": "bad.token",
        },
      });

      const response = await logoutRoute(request, { params: Promise.resolve({ projectKey: "myapp" }) });
      expect(response.status).toBe(401);
    });
  });
});
