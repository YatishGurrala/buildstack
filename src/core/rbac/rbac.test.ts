import {
  assertApiKeyScope,
  assertProjectPermission,
  hasApiKeyScope,
  hasProjectPermission,
} from "@/core/rbac/rbac";
import { HttpError } from "@/lib/http";

describe("rbac", () => {
  it("allows project permissions for owner", () => {
    expect(hasProjectPermission("owner", "manage_api_keys")).toBe(true);
  });

  it("denies project permissions for viewer", () => {
    expect(hasProjectPermission("viewer", "manage_api_keys")).toBe(false);
  });

  it("throws when project permission is missing", () => {
    expect(() => assertProjectPermission("viewer", "write_records")).toThrow(HttpError);

    try {
      assertProjectPermission("viewer", "write_records");
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: "PERMISSION_DENIED" });
    }
  });

  it("treats missing scopes as legacy full access", () => {
    expect(hasApiKeyScope(undefined, "records:delete")).toBe(true);
    expect(hasApiKeyScope([], "records:delete")).toBe(true);
  });

  it("checks required API key scope when scoped key is used", () => {
    expect(hasApiKeyScope(["records:read", "records:write"], "records:read")).toBe(true);
    expect(hasApiKeyScope(["records:read"], "records:delete")).toBe(false);
  });

  it("throws insufficient scope for scoped keys", () => {
    expect(() => assertApiKeyScope(["records:read"], "records:delete")).toThrow(HttpError);

    try {
      assertApiKeyScope(["records:read"], "records:delete");
    } catch (error) {
      expect(error).toMatchObject({ status: 403, code: "INSUFFICIENT_SCOPE" });
    }
  });
});
