import { OAuth2Client } from "google-auth-library";

import { env } from "@/lib/env";
import { HttpError } from "@/lib/http";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || !payload.email_verified) {
    throw new HttpError(401, "Invalid Google token", "INVALID_GOOGLE_TOKEN");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}
