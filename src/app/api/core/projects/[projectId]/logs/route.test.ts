import { NextRequest } from "next/server";

import { GET } from "@/app/api/core/projects/[projectId]/logs/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/projects.service", () => ({
  coreProjectsService: {
    getAuditLogsForUserProject: jest.fn(),
  },
}));

describe("project logs route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("returns project audit logs", async () => {
    (coreProjectsService.getAuditLogsForUserProject as jest.Mock).mockResolvedValue([
      {
        id: "a1",
        action: "CREATE_API_KEY",
        status: "success",
        actorUserId: "u1",
        resourceType: "api_key",
        resourceId: "k1",
        metadata: { name: "Mobile" },
        createdAt: new Date().toISOString(),
      },
    ]);

    const request = new NextRequest("http://localhost/api/core/projects/p1/logs?limit=20");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
  });

  it("returns 400 when limit is invalid", async () => {
    const request = new NextRequest("http://localhost/api/core/projects/p1/logs?limit=0");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(400);
  });

  it("returns 404 when project is missing", async () => {
    (coreProjectsService.getAuditLogsForUserProject as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/core/projects/p1/logs");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/logs");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(401);
  });
});
