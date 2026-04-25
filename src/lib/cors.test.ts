import { NextRequest, NextResponse } from "next/server";

import { applyCors } from "@/lib/cors";

describe("applyCors", () => {
  it("adds allow-origin and credentials for approved origin", () => {
    const request = new NextRequest("http://localhost/api/health", {
      headers: {
        origin: "http://localhost:3000",
      },
    });
    const response = NextResponse.next();

    applyCors(request, response);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });

  it("does not set allow-origin for non-allowlisted origin", () => {
    const request = new NextRequest("http://localhost/api/health", {
      headers: {
        origin: "https://evil.example.com",
      },
    });
    const response = NextResponse.next();

    applyCors(request, response);

    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
  });
});
