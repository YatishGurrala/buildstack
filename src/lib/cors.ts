import { NextRequest, NextResponse } from "next/server";

import { allowedOrigins } from "@/lib/env";

export function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin");

  if (origin && allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With",
  );
}
