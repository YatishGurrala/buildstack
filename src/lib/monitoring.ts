import { logger } from "@/lib/logger";

const ALERT_ERROR_RATE_PERCENT = 20;
const ALERT_MIN_REQUESTS = 25;

type AlertPayload = {
  route: string;
  count: number;
  errorCount: number;
  errorRate: number;
};

export function shouldTriggerErrorRateAlert(payload: AlertPayload) {
  return (
    payload.count >= ALERT_MIN_REQUESTS && payload.errorRate >= ALERT_ERROR_RATE_PERCENT
  );
}

export function emitErrorRateAlert(payload: AlertPayload) {
  if (!shouldTriggerErrorRateAlert(payload)) {
    return;
  }

  logger.warn(
    {
      route: payload.route,
      count: payload.count,
      errorCount: payload.errorCount,
      errorRate: payload.errorRate,
    },
    "High API error rate detected",
  );
}
