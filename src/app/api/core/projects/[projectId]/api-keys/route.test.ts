import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/core/projects/[projectId]/api-keys/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { projectApiKeysService } from "@/modules/core-projects/api-keys.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/api-keys.service", () => ({
  projectApiKeysService: {
    listForUserProject: jest.fn(),
    createForUserProject: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project api keys route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("lists keys", async () => {
    (projectApiKeysService.listForUserProject as jest.Mock).mockResolvedValue([{ id: "key1", name: "CLI" }]);

    const request = new NextRequest("http://localhost/api/core/projects/p1/api-keys");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates a key", async () => {
    (projectApiKeysService.createForUserProject as jest.Mock).mockResolvedValue({
      apiKey: { id: "key1", name: "CLI" },
      secret: "bs_payments_secret",
    });

    const request = new NextRequest("http://localhost/api/core/projects/p1/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "CLI" }),
    });

    const response = await POST(request, { params: Promise.resolve({ projectId: "p1" }) });
    expect(response.status).toBe(201);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/api-keys");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    expect(response.status).toBe(401);
  });
});