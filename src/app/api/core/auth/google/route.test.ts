import { NextRequest } from "next/server";

import { POST } from "@/app/api/core/auth/google/route";
import { loginWithGoogle } from "@/core/auth/auth.service";
import { setAuthCookies } from "@/core/auth/session";
import { enforceRateLimit } from "@/lib/rate-limit";

jest.mock("@/core/auth/auth.service", () => ({
  loginWithGoogle: jest.fn(),
}));

jest.mock("@/core/auth/session", () => ({
  setAuthCookies: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: jest.fn(),
}));

jest.mock("@/lib/http", () => {
  const actual = jest.requireActual("@/lib/http");
  return {
    ...actual,
    validateCsrfToken: jest.fn(),
  };
});

describe("google auth route", () => {
  const mockedLoginWithGoogle = loginWithGoogle as jest.MockedFunction<typeof loginWithGoogle>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns access token when Google login succeeds", async () => {
    mockedLoginWithGoogle.mockResolvedValue({
      user: {
        id: "u1",
        email: "u1@example.com",
        name: null,
        picture: null,
      },
      accessToken: "access",
      refreshToken: "refresh",
    });

    const request = new NextRequest("http://localhost/api/core/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: "google-token" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accessToken).toBe("access");
    expect(enforceRateLimit).toHaveBeenCalled();
    expect(setAuthCookies).toHaveBeenCalled();
  });

  it("returns error payload when input is invalid", async () => {
    const request = new NextRequest("http://localhost/api/core/auth/google", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: "" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
