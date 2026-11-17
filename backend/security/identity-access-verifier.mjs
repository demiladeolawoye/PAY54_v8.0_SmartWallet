"use strict";

/**
 * PAY54 Batch 24 / 918 — offline trusted identity access-token verification.
 *
 * The verifying keys, expected issuer and audience must come from independent
 * server configuration. This verifier NEVER fetches JWKS from request-supplied
 * URLs and NEVER issues an account session or enables an HTTP endpoint.
 *
 * Contract is deliberately strict: signed EdDSA JWT with an access-token
 * purpose, UUID principal and jti, short lifetime, issuer/audience binding,
 * required session-issuance scope and no impersonation/role claims.
 */
import { createPublicKey, verify as verifySignature } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SEGMENT = /^[A-Za-z0-9_-]+$/;
const KID = /^[A-Za-z0-9._-]{8,128}$/;
const AUD = /^[a-zA-Z0-9:._/-]{4,128}$/;
const deny = () => { throw new Error("PAY54_IDENTITY_ASSERTION_DENIED"); };

function strictJsonSegment(segment) {
  if (typeof segment !== "string" || segment.length < 2 ||
      segment.length > 4096 || !SEGMENT.test(segment)) deny();
  const raw = Buffer.from(segment, "base64url");
  if (!raw.length || raw.toString("base64url") !== segment) deny();
  let value;
  try { value = JSON.parse(raw.toString("utf8")); } catch { deny(); }
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype) deny();
  return value;
}
const exactKeys = (object, names) => {
  const entries = Object.keys(object);
  return entries.length === names.length && names.every(name =>
    Object.hasOwn(object, name));
};
function trustedIssuer(value) {
  let url;
  try { url = new URL(value); } catch { deny(); }
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hash || url.search || url.origin !== value.replace(/\/$/, "") ||
      value.length > 200) deny();
  return value;
}

export function createPay54IdentityAccessVerifier({
  trustedIssuer: issuer,
  expectedAudience,
  trustedPublicKeys,
  getTrustedServerTimeMs = Date.now
} = {}) {
  trustedIssuer(issuer);
  if (typeof expectedAudience !== "string" || !AUD.test(expectedAudience) ||
      !trustedPublicKeys || typeof trustedPublicKeys !== "object" ||
      Array.isArray(trustedPublicKeys) ||
      typeof getTrustedServerTimeMs !== "function") deny();

  const keys = new Map();
  const entries = Object.entries(trustedPublicKeys);
  if (entries.length === 0 || entries.length > 8) deny();
  for (const [kid, supplied] of entries) {
    if (!KID.test(kid)) deny();
    try {
      const key = createPublicKey(supplied);
      if (key.asymmetricKeyType !== "ed25519") deny();
      keys.set(kid, key);
    } catch { deny(); }
  }

  return Object.freeze({
    verifyAccessToken(compactToken) {
      if (typeof compactToken !== "string" ||
          compactToken.length > 8192) deny();
      const segments = compactToken.split(".");
      if (segments.length !== 3 || !segments.every(s => SEGMENT.test(s))) deny();
      const [head, body, signatureText] = segments;
      const header = strictJsonSegment(head);
      const claims = strictJsonSegment(body);
      if (!exactKeys(header, ["alg", "typ", "kid"]) ||
          header.alg !== "EdDSA" || header.typ !== "at+jwt" ||
          !KID.test(header.kid) || !keys.has(header.kid)) deny();

      const signature = Buffer.from(signatureText, "base64url");
      if (signature.length !== 64 ||
          signature.toString("base64url") !== signatureText ||
          !verifySignature(null, Buffer.from(head + "." + body),
            keys.get(header.kid), signature)) deny();

      if (!exactKeys(claims, [
        "iss", "aud", "sub", "jti", "iat", "nbf", "exp", "token_use", "scope"
      ]) || claims.iss !== issuer ||
          claims.aud !== expectedAudience ||
          claims.token_use !== "access" ||
          claims.scope !== "pay54:session:issue" ||
          typeof claims.sub !== "string" || !UUID.test(claims.sub) ||
          typeof claims.jti !== "string" || !UUID.test(claims.jti) ||
          ![claims.iat, claims.nbf, claims.exp].every(Number.isSafeInteger) ||
          claims.iat < 1 || claims.nbf < claims.iat ||
          claims.exp <= claims.nbf || claims.exp - claims.iat > 300) deny();

      const nowMs = getTrustedServerTimeMs();
      if (!Number.isSafeInteger(nowMs) || nowMs <= 0) deny();
      const now = Math.floor(nowMs / 1000);
      // No time-of-issue tolerance for expiry; only 30s drift on issuance.
      if (claims.iat > now + 30 || claims.nbf > now ||
          claims.exp <= now) deny();

      return Object.freeze({
        schema: "pay54.verified-identity-access.v1",
        principalId: claims.sub.toLowerCase(),
        assertionId: claims.jti.toLowerCase(),
        issuer,
        audience: expectedAudience,
        expiresAtSeconds: claims.exp,
        cryptographicSignatureVerified: true,
        oneTimeAssertionConsumptionRequired: true,
        accountSessionCreated: false,
        moneyOperationAuthorised: false
      });
    }
  });
}
