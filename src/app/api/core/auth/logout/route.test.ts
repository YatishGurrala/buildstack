import { NextRequest } from "next/server";

import { POST } from "@/app/api/core/auth/logout/route";
import { revokeSession } from "@/core/auth/auth.service";
import { clearAuthCookies } from "@/core/auth/session";

jest.mock("@/core/auth/auth.service", () => ({
  revokeSession: jest.fn(),
}));

jest.mock("@/core/auth/session", () => ({
  REFRESH_COOKIE: "refresh_token",
  clearAuthCookies: jest.fn(),
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("logout route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("revokes session and clears cookies when refresh cookie is present", async () => {
    const request = new NextRequest("http://localhost/api/core/auth/logout", {
      method: "POST",
      headers: {
        cookie: "refresh_token=refresh-token",
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Signed out");
    expect(revokeSession).toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalled();
  });

  it("still signs out when refresh cookie is missing", async () => {
    const request = new NextRequest("http://localhost/api/core/auth/logout", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
