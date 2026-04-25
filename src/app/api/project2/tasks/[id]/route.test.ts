import { NextRequest } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/project2/tasks/[id]/route";
import { requireUser } from "@/core/auth/guard";
import { project2Service } from "@/modules/project2/project2.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/project2/project2.service", () => ({
  project2Service: {
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project2 tasks id route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("gets task by id", async () => {
    (project2Service.getTaskById as jest.Mock).mockResolvedValue({ id: "t1", title: "Task" });
    const request = new NextRequest("http://localhost/api/project2/tasks/t1");

    const response = await GET(request, { params: Promise.resolve({ id: "t1" }) });

    expect(response.status).toBe(200);
  });

  it("returns 404 for missing task", async () => {
    (project2Service.getTaskById as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/project2/tasks/t1");

    const response = await GET(request, { params: Promise.resolve({ id: "t1" }) });

    expect(response.status).toBe(404);
  });

  it("patches task", async () => {
    (project2Service.getTaskById as jest.Mock)
      .mockResolvedValueOnce({ id: "t1" })
      .mockResolvedValueOnce({ id: "t1", title: "Updated" });

    const request = new NextRequest("http://localhost/api/project2/tasks/t1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "t1" }) });

    expect(response.status).toBe(200);
  });

  it("deletes task", async () => {
    (project2Service.getTaskById as jest.Mock).mockResolvedValue({ id: "t1" });
    const request = new NextRequest("http://localhost/api/project2/tasks/t1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "t1" }) });

    expect(response.status).toBe(200);
  });
});
