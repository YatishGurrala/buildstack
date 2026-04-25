import { NextRequest } from "next/server";

import { GET } from "@/app/api/core/projects/[projectId]/services/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/projects.service", () => ({
  coreProjectsService: {
    getServicesForUserProject: jest.fn(),
  },
}));

describe("project services route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("returns services for project", async () => {
    (coreProjectsService.getServicesForUserProject as jest.Mock).mockResolvedValue([
      { id: "auth", name: "Authentication", description: "desc", status: "available" },
    ]);

    const request = new NextRequest("http://localhost/api/core/projects/p1/services");
    const response = await GET(request, {
      params: Promise.resolve({ projectId: "p1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("returns 404 when project not found (empty services)", async () => {
    (coreProjectsService.getServicesForUserProject as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/core/projects/p-missing/services");
    const response = await GET(request, {
      params: Promise.resolve({ projectId: "p-missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/services");
    const response = await GET(request, {
      params: Promise.resolve({ projectId: "p1" }),
    });

    expect(response.status).toBe(401);
  });

  it("OPTIONS returns 204", async () => {
    const { OPTIONS } = await import("@/app/api/core/projects/[projectId]/services/route");
    const request = new NextRequest("http://localhost/api/core/projects/p1/services", { method: "OPTIONS" });
    const response = await OPTIONS(request);
    expect(response.status).toBe(204);
  });
});
