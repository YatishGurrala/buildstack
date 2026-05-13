import { logger } from "@/lib/logger";

type SafeWriteContext = {
  area: "audit" | "usage";
  action: string;
};

export async function safeWrite(
  operation: () => Promise<void>,
  context: SafeWriteContext,
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    logger.warn(
      {
        err: error,
        telemetryArea: context.area,
        telemetryAction: context.action,
        safeWrite: true,
      },
      "Best-effort write failed",
    );
  }
}
