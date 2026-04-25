import { NextRequest } from "next/server";

import { GET, OPTIONS } from "@/app/api/health/route";

describe("health route", () => {
  it("returns health payload", async () => {
    const request = new NextRequest("http://localhost/api/health");

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("buildstack-backend");
  });

  it("handles OPTIONS preflight", async () => {
    const request = new NextRequest("http://localhost/api/health", { method: "OPTIONS" });

    const response = await OPTIONS(request);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
