import * as Sentry from "@sentry/nextjs";

jest.mock("@sentry/nextjs", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));

const mockEnvWithDsn = {
  env: {
    SENTRY_DSN: "https://fake@sentry.io/123",
    SENTRY_TRACES_SAMPLE_RATE: 0.1,
    NODE_ENV: "production",
  },
};

const mockEnvNoDsn = {
  env: {
    SENTRY_DSN: undefined,
    SENTRY_TRACES_SAMPLE_RATE: 0.1,
    NODE_ENV: "development",
  },
};

describe("sentry helpers – with DSN", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initSentry calls Sentry.init when DSN is set", () => {
    let initSentry!: () => void;

    jest.isolateModules(() => {
      jest.doMock("@/lib/env", () => mockEnvWithDsn);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ initSentry } = require("./sentry") as { initSentry: () => void });
    });

    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: "https://fake@sentry.io/123" }),
    );
  });

  it("captureException delegates to Sentry when DSN is set", () => {
    let captureException!: (err: unknown) => void;

    jest.isolateModules(() => {
      jest.doMock("@/lib/env", () => mockEnvWithDsn);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ captureException } = require("./sentry") as { captureException: (e: unknown) => void });
    });

    captureException(new Error("boom"));
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe("sentry helpers – no DSN", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initSentry is a no-op when SENTRY_DSN is not set", () => {
    let initSentry!: () => void;

    jest.isolateModules(() => {
      jest.doMock("@/lib/env", () => mockEnvNoDsn);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ initSentry } = require("./sentry") as { initSentry: () => void });
    });

    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("captureException is a no-op when SENTRY_DSN is not set", () => {
    let captureException!: (err: unknown) => void;

    jest.isolateModules(() => {
      jest.doMock("@/lib/env", () => mockEnvNoDsn);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ({ captureException } = require("./sentry") as { captureException: (e: unknown) => void });
    });

    captureException(new Error("silent"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
