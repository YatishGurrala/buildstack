import { NextRequest } from "next/server";

import { ACCESS_COOKIE } from "@/core/auth/session";
import { verifyAccessToken } from "@/core/auth/tokens";
import { HttpError } from "@/lib/http";

function extractBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireUser(request: NextRequest) {
  const bearer = extractBearerToken(request);
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const token = bearer ?? cookieToken;

  if (!token) {
    throw new HttpError(401, "Unauthorized", "UNAUTHORIZED");
  }

  return verifyAccessToken(token);
}
