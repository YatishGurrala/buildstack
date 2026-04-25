import { NextRequest } from "next/server";

import { DELETE, GET, PATCH } from "@/app/api/project1/notes/[id]/route";
import { requireUser } from "@/core/auth/guard";
import { project1Service } from "@/modules/project1/project1.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/project1/project1.service", () => ({
  project1Service: {
    getNoteById: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project1 notes id route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("gets note by id", async () => {
    (project1Service.getNoteById as jest.Mock).mockResolvedValue({ id: "n1", title: "A" });
    const request = new NextRequest("http://localhost/api/project1/notes/n1");

    const response = await GET(request, { params: Promise.resolve({ id: "n1" }) });

    expect(response.status).toBe(200);
  });

  it("returns 404 for missing note", async () => {
    (project1Service.getNoteById as jest.Mock).mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/project1/notes/n1");

    const response = await GET(request, { params: Promise.resolve({ id: "n1" }) });

    expect(response.status).toBe(404);
  });

  it("patches note", async () => {
    (project1Service.getNoteById as jest.Mock)
      .mockResolvedValueOnce({ id: "n1" })
      .mockResolvedValueOnce({ id: "n1", title: "Updated" });

    const request = new NextRequest("http://localhost/api/project1/notes/n1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "n1" }) });

    expect(response.status).toBe(200);
  });

  it("deletes note", async () => {
    (project1Service.getNoteById as jest.Mock).mockResolvedValue({ id: "n1" });

    const request = new NextRequest("http://localhost/api/project1/notes/n1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "n1" }) });

    expect(response.status).toBe(200);
  });
});
