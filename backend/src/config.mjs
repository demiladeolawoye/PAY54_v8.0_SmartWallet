
"use strict";

import { isIP } from "node:net";

export function loadConfig(env = process.env) {
  const mode = env.PAY54_ENV ?? "development";

  if (
    !["development", "test", "staging", "production"]
      .includes(mode)
  ) {
    throw new Error(
      "PAY54_ENV must be development, test, staging, or production"
    );
  }

  if (mode === "production" || mode === "staging") {
    throw new Error(
      "PAY54 backend financial controls are not production-ready; deployment refused"
    );
  }

  if (
    env.PAY54_REAL_MONEY_MODE !== undefined &&
    env.PAY54_REAL_MONEY_MODE !== "false"
  ) {
    throw new Error(
      "PAY54_REAL_MONEY_MODE must be false"
    );
  }

  const host = env.PAY54_HOST ?? "127.0.0.1";

  if (
    !isIP(host) ||
    (host !== "127.0.0.1" && host !== "::1")
  ) {
    throw new Error(
      "PAY54_HOST must be a loopback address during foundation stage"
    );
  }

  const port = Number(env.PAY54_PORT ?? "8080");

  if (
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65535
  ) {
    throw new Error(
      "PAY54_PORT must be an integer from 0 to 65535"
    );
  }

  return Object.freeze({
    mode,
    host,
    port,
    realMoneyMode: false
  });
}
