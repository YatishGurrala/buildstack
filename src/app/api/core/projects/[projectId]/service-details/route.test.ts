import { NextRequest } from "next/server";

import { GET } from "@/app/api/core/projects/[projectId]/service-details/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/projects.service", () => ({
  coreProjectsService: {
    getServiceDetailsForUserProject: jest.fn(),
  },
}));

describe("project service details route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("returns auth details for a project", async () => {
    (coreProjectsService.getServiceDetailsForUserProject as jest.Mock).mockResolvedValue({
      service: "auth",
      auth: { totalUsers: 3, activeSessions: 2, totalSessions: 4, recentUsers: [] },
    });

    const request = new NextRequest("http://localhost/api/core/projects/p1/service-details?service=auth");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.auth.totalUsers).toBe(3);
  });

  it("returns 400 for invalid service", async () => {
    const request = new NextRequest("http://localhost/api/core/projects/p1/service-details?service=storage");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    expect(response.status).toBe(400);
  });

  it("returns 404 when project is missing", async () => {
    (coreProjectsService.getServiceDetailsForUserProject as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/core/projects/p1/service-details?service=auth");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/service-details?service=auth");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    expect(response.status).toBe(401);
  });
});