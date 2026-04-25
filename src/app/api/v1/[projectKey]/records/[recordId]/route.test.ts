import { NextRequest } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/v1/[projectKey]/records/[recordId]/route";
import { requireProjectApiKey } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { projectRecordsService } from "@/modules/project-records/records.service";

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

describe("project record by id route", () => {
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

  it("gets a record", async () => {
    (projectRecordsService.getById as jest.Mock).mockResolvedValue({ id: "r1" });
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
  });

  it("updates a record", async () => {
    (projectRecordsService.update as jest.Mock).mockResolvedValue({ id: "r1" });
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-api-key": "key" },
      body: JSON.stringify({ data: { title: "Updated" } }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
  });

  it("deletes a record", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1", {
      method: "DELETE",
      headers: { "x-api-key": "key" },
    });
    const response = await DELETE(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(200);
  });

  it("returns 401 when api key is invalid", async () => {
    mockedRequireProjectApiKey.mockRejectedValue(new HttpError(401, "Invalid API key", "INVALID_API_KEY"));
    const request = new NextRequest("http://localhost/api/v1/payments/records/r1");
    const response = await GET(request, { params: Promise.resolve({ projectKey: "payments", recordId: "r1" }) });
    expect(response.status).toBe(401);
  });
});