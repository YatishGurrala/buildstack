jest.mock("node:crypto", () => {
  const actual = jest.requireActual("node:crypto");
  return {
    ...actual,
    randomUUID: jest.fn(() => "session-1"),
  };
});

jest.mock("@/core/db/core", () => ({
  coreDb: {
    user: {
      upsert: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/core/auth/google", () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock("@/core/auth/tokens", () => ({
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
}));

import { HttpError } from "@/lib/http";
import { coreDb } from "@/core/db/core";
import { verifyGoogleIdToken } from "@/core/auth/google";
import { sha256 } from "@/lib/hash";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/core/auth/tokens";
import { loginWithGoogle, revokeSession, rotateSession } from "@/core/auth/auth.service";

const mockedCoreDb = coreDb as unknown as {
  user: {
    upsert: jest.Mock;
  };
  session: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};
const mockedVerifyGoogleIdToken = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;
const mockedSignAccessToken = signAccessToken as jest.MockedFunction<
  typeof signAccessToken
>;
const mockedSignRefreshToken = signRefreshToken as jest.MockedFunction<
  typeof signRefreshToken
>;
const mockedVerifyRefreshToken = verifyRefreshToken as jest.MockedFunction<
  typeof verifyRefreshToken
>;

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs in with Google and creates a session", async () => {
    mockedVerifyGoogleIdToken.mockResolvedValue({
      sub: "g-1",
      email: "user@example.com",
      name: "User",
      picture: "pic",
    });
    mockedCoreDb.user.upsert.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      picture: "pic",
      googleSub: "g-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    mockedSignRefreshToken.mockResolvedValue("refresh-token");
    mockedSignAccessToken.mockResolvedValue("access-token");

    const result = await loginWithGoogle("id-token");

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
    expect(mockedCoreDb.session.create).toHaveBeenCalled();
  });

  it("rotates session when refresh token is valid", async () => {
    const incomingRefreshToken = "refresh-token";
    mockedVerifyRefreshToken.mockResolvedValue({ sub: "u1", sid: "session-1" });
    mockedCoreDb.session.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "u1",
      refreshTokenHash: sha256(incomingRefreshToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      user: {
        id: "u1",
        email: "u1@example.com",
        name: null,
        picture: null,
      },
    } as never);
    mockedSignRefreshToken.mockResolvedValue("next-refresh-token");
    mockedSignAccessToken.mockResolvedValue("next-access-token");

    const result = await rotateSession(incomingRefreshToken);

    expect(result.accessToken).toBe("next-access-token");
    expect(mockedCoreDb.session.update).toHaveBeenCalled();
  });

  it("throws for missing session during rotate", async () => {
    mockedVerifyRefreshToken.mockResolvedValue({ sub: "u1", sid: "missing" });
    mockedCoreDb.session.findUnique.mockResolvedValue(null as never);

    await expect(rotateSession("any-token")).rejects.toBeInstanceOf(HttpError);
  });

  it("revokes session", async () => {
    mockedVerifyRefreshToken.mockResolvedValue({ sub: "u1", sid: "session-1" });

    await revokeSession("token");

    expect(mockedCoreDb.session.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-1",
        userId: "u1",
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
