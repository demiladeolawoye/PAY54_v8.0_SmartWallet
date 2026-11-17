"use strict";

/**
 * PAY54 Batch 21 / 802 — same-origin, double-secret CSRF preflight.
 *
 * The expected origin and CSRF secret must come from trusted backend
 * configuration/session state, never from a request's Host header. A valid
 * preflight is necessary but insufficient to switch accounts; no session,
 * cookies, tokens or money operation is created here.
 */
import { timingSafeEqual } from "node:crypto";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const deny = () => { throw new Error("PAY54_ACCOUNT_SWITCH_CSRF_DENIED"); };
const origin = value => {
  if (typeof value !== "string") deny();
  let url;
  try { url = new URL(value); } catch { deny(); }
  if (url.protocol !== "https:" || url.origin !== value ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/") deny();
  return url.origin;
};

export function validatePay54AccountSwitchCsrf({
  trustedApplicationOrigin,
  requestOrigin,
  csrfFromTrustedSession,
  csrfPresentedByRequest
} = {}) {
  const expectedOrigin = origin(trustedApplicationOrigin);
  const receivedOrigin = origin(requestOrigin);
  if (expectedOrigin !== receivedOrigin ||
      typeof csrfFromTrustedSession !== "string" ||
      typeof csrfPresentedByRequest !== "string" ||
      !TOKEN.test(csrfFromTrustedSession) ||
      !TOKEN.test(csrfPresentedByRequest)) deny();

  const a = Buffer.from(csrfFromTrustedSession, "base64url");
  const b = Buffer.from(csrfPresentedByRequest, "base64url");
  if (a.length !== 32 || b.length !== 32 ||
      !timingSafeEqual(a, b)) deny();

  return Object.freeze({
    schema: "pay54.account-switch-csrf-preflight.v1",
    originVerified: true,
    csrfVerified: true,
    requiresAtomicSessionRebind: true,
    accountSwitchCompleted: false
  });
}
