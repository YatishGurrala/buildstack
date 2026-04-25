import { NextRequest, NextResponse } from "next/server";

import { applyCors } from "@/lib/cors";
import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  const response = jsonResponse(request, {
    ok: true,
    service: "buildstack-backend",
    ts: new Date().toISOString(),
  });
  applyCors(request, response);
  return response;
}
