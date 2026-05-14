import { NextRequest } from "next/server";

import { HttpError } from "@/lib/http";
import { requireProjectApiKey, requireUser } from "@/core/auth/guard";
import { verifyAccessToken } from "@/core/auth/tokens";
import { coreDb } from "@/core/db/core";
import { provisionProjectSchema } from "@/core/db/projects";

jest.mock("@/core/auth/tokens", () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock("@/core/db/core", () => ({
  coreDb: {
    apiKey: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/core/db/projects", () => ({
  provisionProjectSchema: jest.fn(),
}));

const mockedVerifyAccessToken = verifyAccessToken as jest.MockedFunction<
  typeof verifyAccessToken
>;
const mockedProvisionProjectSchema = provisionProjectSchema as jest.MockedFunction<
  typeof provisionProjectSchema
>;

const mockedCoreDb = coreDb as unknown as {
  apiKey: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe("requireUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedProvisionProjectSchema.mockResolvedValue();
  });

  it("uses bearer token when provided", async () => {
    mockedVerifyAccessToken.mockResolvedValue({ sub: "u1", email: "u1@example.com" });
    const request = new NextRequest("http://localhost/api/v1/payments/records", {
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
    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      headers: {
        cookie: "access_token=cookie.token",
      },
    });

    const user = await requireUser(request);

    expect(user.email).toBe("u2@example.com");
    expect(mockedVerifyAccessToken).toHaveBeenCalledWith("cookie.token");
  });

  it("throws unauthorized when no token is present", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records");

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
    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      headers: {
        authorization: "Bearer bad.token",
      },
    });

    await expect(requireUser(request)).rejects.toBeInstanceOf(HttpError);
  });
});

describe("requireProjectApiKey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns project access context for a valid key", async () => {
    mockedCoreDb.apiKey.findFirst.mockResolvedValue({
      id: "key1",
      projectId: "p1",
      project: {
        key: "payments",
        schemaName: "proj_payments",
      },
      scopes: [{ scope: "records:read" }],
    });

    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      headers: {
        "x-api-key": "bs_payments_secret",
      },
    });

    const access = await requireProjectApiKey(request, "payments");

    expect(access).toMatchObject({
      projectId: "p1",
      schemaName: "proj_payments",
      scopes: ["records:read"],
    });
    expect(mockedCoreDb.apiKey.update).toHaveBeenCalledWith({
      where: { id: "key1" },
      data: { lastUsedAt: expect.any(Date) },
    });
    expect(mockedProvisionProjectSchema).toHaveBeenCalledWith("proj_payments");
  });

  it("throws when x-api-key is missing", async () => {
    const request = new NextRequest("http://localhost/api/v1/payments/records");
    await expect(requireProjectApiKey(request, "payments")).rejects.toEqual(
      expect.objectContaining({ status: 401, code: "API_KEY_REQUIRED" }),
    );
  });

  it("throws when api key is invalid", async () => {
    mockedCoreDb.apiKey.findFirst.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/v1/payments/records", {
      headers: {
        "x-api-key": "bad-key",
      },
    });

    await expect(requireProjectApiKey(request, "payments")).rejects.toEqual(
      expect.objectContaining({ status: 401, code: "INVALID_API_KEY" }),
    );
  });
});
