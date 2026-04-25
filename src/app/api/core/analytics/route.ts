import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/core/auth/guard";
import { applyCors } from "@/lib/cors";
import { getAnalyticsSnapshot, getPrometheusMetrics } from "@/lib/analytics";
import { handleApiError, jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format");

    const scrapeToken = process.env.METRICS_SCRAPE_TOKEN?.trim();
    const authHeader = request.headers.get("authorization");
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : "";
    const isMachineScrape =
      format === "prometheus" &&
      Boolean(scrapeToken) &&
      Boolean(bearerToken) &&
      bearerToken === scrapeToken;

    if (!isMachineScrape) {
      await requireUser(request);
    }

    if (format === "prometheus") {
      const content = getPrometheusMetrics();
      const response = new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; version=0.0.4",
        },
      });
      applyCors(request, response);
      return response;
    }

    const snapshot = getAnalyticsSnapshot();
    const response = jsonResponse(request, { data: snapshot });
    applyCors(request, response);
    return response;
  } catch (error) {
    const response = handleApiError(request, error);
    applyCors(request, response);
    return response;
  }
}
