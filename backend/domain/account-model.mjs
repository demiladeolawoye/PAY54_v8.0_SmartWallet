"use strict";

/* PAY54 Batch 01 / Account domain v1.0.0
 * Read-only immutable schema contract. No records are created and no balance,
 * card, transaction, session, identity or provider operation is performed. */

const ACCOUNT_TYPES = new Set(["PERSONAL", "BUSINESS"]);
const STATUSES = new Set(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "CLOSED"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUUID = value => typeof value === "string" && UUID.test(value);
const text = value => typeof value === "string" && value.length > 0 && value.length <= 120 &&
  value === value.trim() && !/[\u0000-\u001f<>]/.test(value);

export function validateAccountDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Account descriptor must be an object");
  }
  const allowed = ["accountId", "legalOwnerId", "type", "displayName", "status", "verificationStatus"];
  if (Object.keys(value).some(key => !allowed.includes(key)) || allowed.some(key => !Object.hasOwn(value, key))) {
    throw new TypeError("Account descriptor schema mismatch");
  }
  if (!isUUID(value.accountId) || !isUUID(value.legalOwnerId) || !ACCOUNT_TYPES.has(value.type) ||
    !text(value.displayName) || !STATUSES.has(value.status) ||
    !["NOT_VERIFIED", "IN_REVIEW", "VERIFIED", "REJECTED"].includes(value.verificationStatus)) {
    throw new TypeError("Invalid account descriptor");
  }
  if (value.status === "ACTIVE" && value.verificationStatus !== "VERIFIED") {
    throw new TypeError("Active account requires approved verification status");
  }
  return Object.freeze({
    accountId: value.accountId.toLowerCase(),
    legalOwnerId: value.legalOwnerId.toLowerCase(),
    type: value.type,
    displayName: value.displayName,
    status: value.status,
    verificationStatus: value.verificationStatus
  });
}

export function accountCanOfferFinancialFeatures(account) {
  const checked = validateAccountDescriptor(account);
  return checked.status === "ACTIVE" && checked.verificationStatus === "VERIFIED";
}

export const PAY54_ACCOUNT_TYPES = Object.freeze(["PERSONAL", "BUSINESS"]);
