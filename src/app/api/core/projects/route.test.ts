import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/core/projects/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/projects.service", () => ({
  coreProjectsService: {
    listForUser: jest.fn(),
    createForUser: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("core projects route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("lists projects", async () => {
    (coreProjectsService.listForUser as jest.Mock).mockResolvedValue([
      { id: "p1", key: "payments", displayName: "Payments", role: "owner", createdAt: new Date().toISOString() },
    ]);

    const request = new NextRequest("http://localhost/api/core/projects");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates project", async () => {
    (coreProjectsService.createForUser as jest.Mock).mockResolvedValue({
      id: "p1",
      key: "payments",
      displayName: "Payments",
      role: "owner",
      createdAt: new Date().toISOString(),
    });

    const request = new NextRequest("http://localhost/api/core/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Payments" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it("returns 401 on GET when not authenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when POST body is invalid", async () => {
    const request = new NextRequest("http://localhost/api/core/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 401 on POST when not authenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: "Valid Name" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await import("@/app/api/core/projects/route");
    const request = new NextRequest("http://localhost/api/core/projects", { method: "OPTIONS" });
    const response = await OPTIONS(request);
    expect(response.status).toBe(204);
  });
});
