import { NextRequest } from "next/server";

import { POST } from "@/app/api/core/auth/refresh/route";
import { rotateSession } from "@/core/auth/auth.service";
import { setAuthCookies } from "@/core/auth/session";

jest.mock("@/core/auth/auth.service", () => ({
  rotateSession: jest.fn(),
}));

jest.mock("@/core/auth/session", () => ({
  REFRESH_COOKIE: "refresh_token",
  setAuthCookies: jest.fn(),
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("refresh route", () => {
  const mockedRotateSession = rotateSession as jest.MockedFunction<typeof rotateSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("refreshes session when cookie exists", async () => {
    mockedRotateSession.mockResolvedValue({
      user: {
        id: "u1",
        email: "u1@example.com",
        name: null,
        picture: null,
      },
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    const request = new NextRequest("http://localhost/api/core/auth/refresh", {
      method: "POST",
      headers: {
        cookie: "refresh_token=refresh-token",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accessToken).toBe("new-access");
    expect(setAuthCookies).toHaveBeenCalled();
  });

  it("returns 401 when refresh cookie is missing", async () => {
    const request = new NextRequest("http://localhost/api/core/auth/refresh", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
