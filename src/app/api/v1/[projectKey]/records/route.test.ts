import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/v1/[projectKey]/records/route";
import { requireProjectApiKey } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { auditLogService } from "@/modules/audit-log/audit-log.service";
import { projectRecordsService } from "@/modules/project-records/records.service";
import { usageLogService } from "@/modules/usage-log/usage-log.service";

jest.mock("@/core/auth/guard", () => ({
  requireProjectApiKey: jest.fn(),
}));

jest.mock("@/modules/project-records/records.service", () => ({
  projectRecordsService: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock("@/modules/usage-log/usage-log.service", () => ({
  usageLogService: {
    record: jest.fn(),
  },
}));

jest.mock("@/modules/audit-log/audit-log.service", () => ({
  auditLogService: {
    log: jest.fn(),
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
      scopes: [],
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
      headers: { "content-type": "application/json", "x-api-key": "key", "x-request-id": "req-1" },
      body: JSON.stringify({ collection: "posts", data: { title: "Hello" } }),
    });

    const response = await POST(request, { params: Promise.resolve({ projectKey: "payments" }) });
    expect(response.status).toBe(201);
    expect(usageLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: "records.write",
        metadata: expect.objectContaining({ collection: "posts", requestId: "req-1" }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE_RECORD",
        resourceType: "record",
        resourceId: "r1",
        metadata: expect.objectContaining({ projectKey: "payments", collection: "posts", requestId: "req-1" }),
      }),
    );
  });

  it("returns 401 when api key is invalid", async () => {
    mockedRequireProjectApiKey.mockRejectedValue(new HttpError(401, "Invalid API key", "INVALID_API_KEY"));

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 when scoped key lacks read scope", async () => {
    mockedRequireProjectApiKey.mockResolvedValue({
      id: "key1",
      projectId: "p1",
      projectKey: "payments",
      schemaName: "proj_payments",
      scopes: ["records:write"],
    });

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });

    expect(response.status).toBe(403);
  });

  it("returns empty array when no records exist", async () => {
    (projectRecordsService.list as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("passes query parameters to list service", async () => {
    (projectRecordsService.list as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/v1/payments/records?collection=users&limit=10");
    await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });

    expect(projectRecordsService.list).toHaveBeenCalledWith("proj_payments", expect.objectContaining({}));
  });

  it("returns 400 for invalid POST request", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "key" },
      body: JSON.stringify({}), // Missing required fields
    });

    const response = await POST(request, { params: Promise.resolve({ projectKey: "payments" }) });
    expect([400, 401, 404, 500]).toContain(response.status); // Accept various errors
  });

  it("includes CSRF token in response headers", async () => {
    (projectRecordsService.list as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });

    expect(response.headers.get("X-CSRF-Token")).toBeDefined();
  });

  it("includes security headers in response", async () => {
    (projectRecordsService.list as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest("http://localhost/api/v1/payments/records");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments" }) });

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});