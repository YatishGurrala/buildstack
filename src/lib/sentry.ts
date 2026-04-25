import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

let initialized = false;

export function initSentry() {
  if (initialized || !env.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    environment: env.NODE_ENV,
    enabled: env.NODE_ENV === "production",
  });

  initialized = true;
}

export function captureException(error: unknown) {
  if (!env.SENTRY_DSN) {
    return;
  }

  initSentry();
  Sentry.captureException(error);
}
