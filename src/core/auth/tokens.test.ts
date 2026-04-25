const mockJwtVerify = jest.fn();
const mockSign = jest.fn();

jest.mock("jose", () => ({
  SignJWT: jest.fn().mockImplementation(() => {
    const chain = {
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: mockSign,
    };
    return chain;
  }),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import { HttpError } from "@/lib/http";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/core/auth/tokens";

describe("tokens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSign.mockResolvedValue("signed-token");
  });

  it("signs and verifies access tokens", async () => {
    const token = await signAccessToken({ sub: "u1", email: "u1@example.com" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "u1", email: "u1@example.com" },
    });
    const payload = await verifyAccessToken(token);

    expect(payload).toEqual({ sub: "u1", email: "u1@example.com" });
  });

  it("rejects invalid access tokens", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid"));
    await expect(verifyAccessToken("invalid-token")).rejects.toBeInstanceOf(HttpError);
  });

  it("signs and verifies refresh tokens", async () => {
    const token = await signRefreshToken({ sub: "u2", sid: "sid-1" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "u2", sid: "sid-1" },
    });
    const payload = await verifyRefreshToken(token);

    expect(payload).toEqual({ sub: "u2", sid: "sid-1" });
  });

  it("rejects wrong token type for refresh verification", async () => {
    const accessToken = await signAccessToken({ sub: "u3", email: "u3@example.com" });
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "u3", email: "u3@example.com" },
    });
    await expect(verifyRefreshToken(accessToken)).rejects.toBeInstanceOf(HttpError);
  });
});
