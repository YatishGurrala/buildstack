import { NextRequest } from "next/server";

import { GET } from "@/app/api/core/projects/[projectId]/usage/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { coreProjectsService } from "@/modules/core-projects/projects.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/projects.service", () => ({
  coreProjectsService: {
    getUsageForUserProject: jest.fn(),
  },
}));

describe("project usage route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("returns project usage data", async () => {
    (coreProjectsService.getUsageForUserProject as jest.Mock).mockResolvedValue({
      items: [
        {
          id: "u1",
          metric: "records.read",
          quantity: 10,
          metadata: { route: "GET /records" },
          createdAt: new Date().toISOString(),
        },
      ],
      summary: {
        totalEvents: 1,
        totalQuantity: 10,
        byMetric: [{ metric: "records.read", events: 1, quantity: 10 }],
      },
    });

    const request = new NextRequest("http://localhost/api/core/projects/p1/usage?limit=20");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.summary.totalEvents).toBe(1);
  });

  it("returns 400 when limit is invalid", async () => {
    const request = new NextRequest("http://localhost/api/core/projects/p1/usage?limit=-1");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(400);
  });

  it("returns 404 when project is missing", async () => {
    (coreProjectsService.getUsageForUserProject as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/core/projects/p1/usage");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/usage");
    const response = await GET(request, { params: Promise.resolve({ projectId: "p1" }) });

    expect(response.status).toBe(401);
  });
});
