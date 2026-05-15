import { NextRequest } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/v1/[projectKey]/records/[recordId]/route";
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
    getById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

describe("project record by id route", () => {
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

  it("gets a record", async () => {
    (projectRecordsService.getById as jest.Mock).mockResolvedValue({ id: "r1" });
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
  });

  it("updates a record", async () => {
    (projectRecordsService.update as jest.Mock).mockResolvedValue({ id: "r1", collection: "posts" });
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-api-key": "key", "x-request-id": "req-2" },
      body: JSON.stringify({ data: { title: "Updated" } }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
    expect(usageLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: "records.write",
        metadata: expect.objectContaining({ requestId: "req-2" }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "UPDATE_RECORD",
        resourceId: "r1",
        metadata: expect.objectContaining({ projectKey: "payments", recordId: "r1", requestId: "req-2" }),
      }),
    );
  });

  it("deletes a record", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "DELETE",
      headers: { "x-api-key": "key", "x-request-id": "req-3" },
    });
    const response = await DELETE(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
    expect(usageLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: "records.delete",
        metadata: expect.objectContaining({ requestId: "req-3" }),
      }),
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "DELETE_RECORD",
        resourceId: "r1",
        metadata: expect.objectContaining({ projectKey: "payments", recordId: "r1", requestId: "req-3" }),
      }),
    );
  });

  it("returns 401 when api key is invalid", async () => {
    mockedRequireProjectApiKey.mockRejectedValue(new HttpError(401, "Invalid API key", "INVALID_API_KEY"));
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(401);
  });

  it("returns 403 when scoped key lacks delete scope", async () => {
    mockedRequireProjectApiKey.mockResolvedValue({
      id: "key1",
      projectId: "p1",
      projectKey: "payments",
      schemaName: "proj_payments",
      scopes: ["records:read"],
    });

    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "DELETE",
      headers: { "x-api-key": "key" },
    });

    const response = await DELETE(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 when record not found in GET", async () => {
    (projectRecordsService.getById as jest.Mock).mockRejectedValue(
      new HttpError(404, "Record not found", "NOT_FOUND"),
    );
    const request = new NextRequest("http://localhost/api/v1/payments/records/nonexistent");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "nonexistent" }) });
    expect(response.status).toBe(404);
  });

  it("returns 404 when record not found in UPDATE", async () => {
    (projectRecordsService.update as jest.Mock).mockRejectedValue(
      new HttpError(404, "Record not found", "NOT_FOUND"),
    );
    const request = new NextRequest("http://localhost/api/v1/payments/records/nonexistent", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-api-key": "key" },
      body: JSON.stringify({ data: { title: "Updated" } }),
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ projectKey: "payments", recordId: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when record not found in DELETE", async () => {
    (projectRecordsService.delete as jest.Mock).mockRejectedValue(
      new HttpError(404, "Record not found", "NOT_FOUND"),
    );
    const request = new NextRequest("http://localhost/api/v1/payments/records/nonexistent", {
      method: "DELETE",
      headers: { "x-api-key": "key" },
    });
    const response = await DELETE(request, {
      params: Promise.resolve({ projectKey: "payments", recordId: "nonexistent" }),
    });
    expect(response.status).toBe(404);
  });

  it("includes proper response headers in GET", async () => {
    (projectRecordsService.getById as jest.Mock).mockResolvedValue({ id: "r1" });
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("X-CSRF-Token")).toBeDefined();
  });

  it("includes proper response headers in DELETE", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "DELETE",
      headers: { "x-api-key": "key" },
    });
    const response = await DELETE(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.headers.get("X-CSRF-Token")).toBeDefined();
  });
});