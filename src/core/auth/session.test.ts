import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "@/core/auth/session";

describe("session cookies", () => {
  it("sets access and refresh cookies", () => {
    const response = NextResponse.next();

    setAuthCookies(response, "access-value", "refresh-value");

    const serialized = response.headers.get("set-cookie") || "";
    expect(serialized).toContain(`${ACCESS_COOKIE}=access-value`);
    expect(serialized).toContain(`${REFRESH_COOKIE}=refresh-value`);
  });

  it("clears auth cookies", () => {
    const response = NextResponse.next();

    clearAuthCookies(response);

    const serialized = response.headers.get("set-cookie") || "";
    expect(serialized).toContain(`${ACCESS_COOKIE}=`);
    expect(serialized).toContain(`${REFRESH_COOKIE}=`);
    expect(serialized).toContain("Max-Age=0");
  });
});
