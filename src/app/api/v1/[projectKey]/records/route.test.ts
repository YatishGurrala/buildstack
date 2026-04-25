import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/v1/[projectKey]/records/route";
import { requireProjectApiKey } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { projectRecordsService } from "@/modules/project-records/records.service";

jest.mock("@/core/auth/guard", () => ({
  requireProjectApiKey: jest.fn(),
}));

jest.mock("@/modules/project-records/records.service", () => ({
  projectRecordsService: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

describe("project records route", () => {
  const mockedRequireProjectApiKey = requireProjectApiKey as jest.MockedFunction<typeof requireProjectApiKey>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireProjectApiKey.mockResolvedValue({
      id: "key1",
      projectId: "p1",
      projectKey: "payments",
      schemaName: "proj_payments",
    });
  });

  it("lists records", async () => {
    (projectRecordsService.list as jest.Mock).mockResolvedValue([{ id: "r1", collection: "posts" }]);

    const request = new NextRequest("http://localhost/api/v1/payments/records?collection=posts");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates a record", async () => {
    (projectRecordsService.create as jest.Mock).mockResolvedValue({ id: "r1", collection: "posts" });

    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "key" },
      body: JSON.stringify({ collection: "posts", data: { title: "Hello" } }),
    });

    const response = await POST(request, { params: Promise.resolve({ projectKey: "payments" }) });
    expect(response.status).toBe(201);
  });

  it("returns 401 when api key is invalid", async () => {
    mockedRequireProjectApiKey.mockRejectedValue(new HttpError(401, "Invalid API key", "INVALID_API_KEY"));

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });
    expect(response.status).toBe(401);
  });
});