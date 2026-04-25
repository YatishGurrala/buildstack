import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/project2/tasks/route";
import { requireUser } from "@/core/auth/guard";
import { project2Service } from "@/modules/project2/project2.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/project2/project2.service", () => ({
  project2Service: {
    listTasks: jest.fn(),
    createTask: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project2 tasks route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("lists tasks", async () => {
    (project2Service.listTasks as jest.Mock).mockResolvedValue([{ id: "t1", title: "T" }]);
    const request = new NextRequest("http://localhost/api/project2/tasks");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates task", async () => {
    (project2Service.createTask as jest.Mock).mockResolvedValue({ id: "t1", title: "T" });
    const request = new NextRequest("http://localhost/api/project2/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "T", description: "D" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
