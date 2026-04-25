import { NextRequest } from "next/server";

import { HttpError } from "@/lib/http";
import { requireUser } from "@/core/auth/guard";
import { verifyAccessToken } from "@/core/auth/tokens";

jest.mock("@/core/auth/tokens", () => ({
  verifyAccessToken: jest.fn(),
}));

const mockedVerifyAccessToken = verifyAccessToken as jest.MockedFunction<
  typeof verifyAccessToken
>;

describe("requireUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses bearer token when provided", async () => {
    mockedVerifyAccessToken.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
    const request = new NextRequest("http://localhost/api/project1/notes", {
      headers: {
        authorization: "Bearer abc.token",
      },
    });

    const user = await requireUser(request);

    expect(user.sub).toBe("u1");
    expect(mockedVerifyAccessToken).toHaveBeenCalledWith("abc.token");
  });

  it("falls back to access cookie when bearer token is missing", async () => {
    mockedVerifyAccessToken.mockResolvedValue({ sub: "u2", email: "u2@example.com" });
    const request = new NextRequest("http://localhost/api/project1/notes", {
      headers: {
        cookie: "access_token=cookie.token",
      },
    });

    const user = await requireUser(request);

    expect(user.email).toBe("u2@example.com");
    expect(mockedVerifyAccessToken).toHaveBeenCalledWith("cookie.token");
  });

  it("throws unauthorized when no token is present", async () => {
    const request = new NextRequest("http://localhost/api/project1/notes");

    await expect(requireUser(request)).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        code: "UNAUTHORIZED",
      }),
    );
  });

  it("propagates token verification errors", async () => {
    mockedVerifyAccessToken.mockRejectedValue(
      new HttpError(401, "Invalid access token", "INVALID_ACCESS_TOKEN"),
    );
    const request = new NextRequest("http://localhost/api/project1/notes", {
      headers: {
        authorization: "Bearer bad.token",
      },
    });

    await expect(requireUser(request)).rejects.toBeInstanceOf(HttpError);
  });
});
