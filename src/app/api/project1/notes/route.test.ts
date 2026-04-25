import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/project1/notes/route";
import { requireUser } from "@/core/auth/guard";
import { project1Service } from "@/modules/project1/project1.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/project1/project1.service", () => ({
  project1Service: {
    listNotes: jest.fn(),
    createNote: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project1 notes route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("lists notes", async () => {
    (project1Service.listNotes as jest.Mock).mockResolvedValue([{ id: "n1", title: "A" }]);
    const request = new NextRequest("http://localhost/api/project1/notes");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it("creates note", async () => {
    (project1Service.createNote as jest.Mock).mockResolvedValue({ id: "n1", title: "A" });
    const request = new NextRequest("http://localhost/api/project1/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "A", body: "B" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
