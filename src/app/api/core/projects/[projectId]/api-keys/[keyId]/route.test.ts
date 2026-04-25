import { NextRequest } from "next/server";

import { DELETE } from "@/app/api/core/projects/[projectId]/api-keys/[keyId]/route";
import { requireUser } from "@/core/auth/guard";
import { HttpError } from "@/lib/http";
import { projectApiKeysService } from "@/modules/core-projects/api-keys.service";

jest.mock("@/core/auth/guard", () => ({
  requireUser: jest.fn(),
}));

jest.mock("@/modules/core-projects/api-keys.service", () => ({
  projectApiKeysService: {
    revokeForUserProject: jest.fn(),
  },
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("project api key delete route", () => {
  const mockedRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRequireUser.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
  });

  it("revokes a key", async () => {
    const request = new NextRequest("http://localhost/api/core/projects/p1/api-keys/key1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ projectId: "p1", keyId: "key1" }) });
    expect(response.status).toBe(200);
  });

  it("returns 401 when unauthenticated", async () => {
    mockedRequireUser.mockRejectedValue(new HttpError(401, "unauthorized", "UNAUTHORIZED"));

    const request = new NextRequest("http://localhost/api/core/projects/p1/api-keys/key1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ projectId: "p1", keyId: "key1" }) });
    expect(response.status).toBe(401);
  });
});