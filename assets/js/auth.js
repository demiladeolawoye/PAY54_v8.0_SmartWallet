"use strict";

/* ==========================================================================
   PAY54 LEGACY DEVELOPMENT AUTHENTICATION — DEMO ONLY
   Batch 28 / 1210

   This UI does not issue or verify real customer credentials. All account
   identity, KYC/AML decisions and financial operations are unavailable until
   an approved server-side identity provider and session service are active.
   Never use a genuine banking PIN, OTP or financial password in this demo.

   Legacy demo compatibility:
   - Existing 4-digit PIN can migrate after one successful local demo login.
   - Subsequent demo PIN verification uses per-profile salted PBKDF2-SHA256.
   - Raw PIN is never newly written to localStorage or sessionStorage.
   - The short-lived existing development-auth handoff contract is retained.
========================================================================== */

const PIN_REGEX = /^\d{4}$/;
const PAY54_DEV_AUTH_HANDOFF_KEY = "pay54_dev_auth_handoff";
const PAY54_DEV_AUTH_HANDOFF_TTL_MS = 60 * 1000;
const PAY54_DEV_PIN_RECORD_KEY = "pay54_dev_pin_verifier_v2";
const PAY54_LEGACY_PIN_KEY = "pay54_pin";
const PAY54_DEMO_PIN_ITERATIONS = 310000;
const PAY54_DEMO_PIN_SALT_BYTES = 16;
const PAY54_DEMO_PIN_DERIVED_BITS = 256;

function demoCrypto() {
  const api = window.crypto;
  if (!api ||
      typeof api.getRandomValues !== "function" ||
      !api.subtle ||
      typeof api.subtle.importKey !== "function" ||
      typeof api.subtle.deriveBits !== "function") {
    throw new Error("Secure browser cryptography is required for the development demo.");
  }
  return api;
}

function byteHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function hexBytes(hex, size) {
  if (typeof hex !== "string" ||
      hex.length !== size * 2 ||
      !/^[0-9a-f]+$/.test(hex)) {
    throw new Error("Invalid development PIN verifier");
  }
  return Uint8Array.from(hex.match(/.{2}/g), byte => parseInt(byte, 16));
}

function equalBytes(left, right) {
  if (!(left instanceof Uint8Array) ||
      !(right instanceof Uint8Array) ||
      left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left[i] ^ right[i];
  }
  return mismatch === 0;
}

async function deriveDemoPin(pin, salt) {
  if (!PIN_REGEX.test(pin) ||
      !(salt instanceof Uint8Array) ||
      salt.length !== PAY54_DEMO_PIN_SALT_BYTES) {
    throw new Error("Invalid development PIN input");
  }
  const cryptoApi = demoCrypto();
  const material = new TextEncoder().encode(pin);
  const key = await cryptoApi.subtle.importKey(
    "raw", material, "PBKDF2", false, ["deriveBits"]
  );
  const bits = await cryptoApi.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: PAY54_DEMO_PIN_ITERATIONS
  }, key, PAY54_DEMO_PIN_DERIVED_BITS);
  material.fill(0);
  return new Uint8Array(bits);
}

async function storeDevelopmentPin(pin) {
  if (!PIN_REGEX.test(pin)) {
    throw new Error("Development PIN must contain exactly four digits");
  }
  const salt = new Uint8Array(PAY54_DEMO_PIN_SALT_BYTES);
  demoCrypto().getRandomValues(salt);
  const verifier = await deriveDemoPin(pin, salt);
  const record = {
    schema: "PAY54-DEV-PIN-VERIFIER-V2",
    algorithm: "PBKDF2-SHA256",
    iterations: PAY54_DEMO_PIN_ITERATIONS,
    salt: byteHex(salt),
    verifier: byteHex(verifier)
  };
  localStorage.setItem(PAY54_DEV_PIN_RECORD_KEY, JSON.stringify(record));
  localStorage.removeItem(PAY54_LEGACY_PIN_KEY);
  verifier.fill(0);
  salt.fill(0);
}

async function checkDevelopmentPin(pin) {
  if (!PIN_REGEX.test(pin)) return false;
  const encoded = localStorage.getItem(PAY54_DEV_PIN_RECORD_KEY);
  if (encoded !== null) {
    let record;
    try {
      record = JSON.parse(encoded);
    } catch {
      return false;
    }
    if (!record || record.schema !== "PAY54-DEV-PIN-VERIFIER-V2" ||
        record.algorithm !== "PBKDF2-SHA256" ||
        record.iterations !== PAY54_DEMO_PIN_ITERATIONS) return false;
    try {
      const salt = hexBytes(record.salt, PAY54_DEMO_PIN_SALT_BYTES);
      const expected = hexBytes(record.verifier, PAY54_DEMO_PIN_DERIVED_BITS / 8);
      const actual = await deriveDemoPin(pin, salt);
      const matched = equalBytes(expected, actual);
      actual.fill(0);
      return matched;
    } catch {
      return false;
    }
  }

  // One-time compatibility migration for old demo profiles. This is NOT
  // acceptable real authentication, and no new plaintext PIN is persisted.
  const legacy = localStorage.getItem(PAY54_LEGACY_PIN_KEY);
  if (!PIN_REGEX.test(legacy || "")) return false;
  const provided = new TextEncoder().encode(pin);
  const existing = new TextEncoder().encode(legacy);
  const matched = equalBytes(provided, existing);
  provided.fill(0);
  existing.fill(0);
  if (!matched) return false;
  await storeDevelopmentPin(pin);
  return true;
}

function createDevelopmentAuthHandoff(email) {
  const normalisedEmail = String(email || "").trim().toLowerCase();
  if (!normalisedEmail) {
    throw new Error("Development email is required.");
  }
  const bytes = new Uint8Array(16);
  demoCrypto().getRandomValues(bytes);
  const issuedAt = Date.now();
  const handoff = {
    schema: "PAY54-DEV-AUTH-HANDOFF-V1",
    email: normalisedEmail,
    issuedAt,
    expiresAt: issuedAt + PAY54_DEV_AUTH_HANDOFF_TTL_MS,
    nonce: byteHex(bytes)
  };
  sessionStorage.setItem(PAY54_DEV_AUTH_HANDOFF_KEY, JSON.stringify(handoff));
  bytes.fill(0);
  return handoff;
}

function showMessage(message, type = "error") {
  const target = document.getElementById("msg");
  if (!target) return;
  target.textContent = String(message);
  target.className = "message " + (type === "success" ? "success" : "error");
}

window.addEventListener("load", () => {
  document.querySelectorAll("input").forEach(input => {
    input.value = "";
  });
});

function navigateDemo(url, milliseconds = 1200) {
  setTimeout(() => { window.location.href = url; }, milliseconds);
}

// Development-only local profile creation. It does not create a real account.
async function signup(event) {
  event.preventDefault();
  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const country = document.getElementById("signup-country").value;
  const phone = document.getElementById("signup-phone").value.trim();
  const pin = document.getElementById("signup-pin").value.trim();
  const confirm = document.getElementById("signup-confirm-pin").value.trim();

  if (!name || !email || !phone) {
    return showMessage("Complete all demo profile fields");
  }
  if (!PIN_REGEX.test(pin)) {
    return showMessage("Demo PIN must contain exactly four digits");
  }
  if (pin !== confirm) return showMessage("Demo PINs do not match");
  try {
    await storeDevelopmentPin(pin);
  } catch {
    return showMessage("Secure browser cryptography is required for this demo");
  }
  localStorage.setItem("pay54_name", name);
  localStorage.setItem("pay54_email", email);
  localStorage.setItem("pay54_phone", country + phone);
  localStorage.setItem("pay54_pending_verification", "true");
  sessionStorage.removeItem(PAY54_DEV_AUTH_HANDOFF_KEY);
  showMessage("Demo profile created. This is not a real bank account.", "success");
  navigateDemo("verify-otp.html");
}

// Development-only local PIN verification, never a server-side login.
async function login(event) {
  event.preventDefault();
  sessionStorage.removeItem(PAY54_DEV_AUTH_HANDOFF_KEY);
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const pin = document.getElementById("login-pin").value.trim();
  const savedEmail = (localStorage.getItem("pay54_email") || "").toLowerCase();
  if (!email || !PIN_REGEX.test(pin)) {
    return showMessage("Enter the demo email and four-digit demo PIN");
  }
  if (email !== savedEmail) return showMessage("Invalid demo email or PIN");
  try {
    if (!(await checkDevelopmentPin(pin))) {
      return showMessage("Invalid demo email or PIN");
    }
    createDevelopmentAuthHandoff(email);
  } catch {
    return showMessage("Unable to start the development demo securely");
  }
  showMessage("Demo sign-in complete. No real account authenticated.", "success");
  navigateDemo("dashboard.html", 1000);
}

// Development-only reset, without email delivery or customer verification.
function sendReset(event) {
  event.preventDefault();
  const input = document.querySelector("input[type='email']");
  const email = input?.value?.trim().toLowerCase() || "";
  const savedEmail = (localStorage.getItem("pay54_email") || "").toLowerCase();
  if (!email || email !== savedEmail) {
    return showMessage("Demo email not recognised");
  }
  showMessage("Demo reset flow only. No recovery email was sent.", "success");
  navigateDemo("create-new-pin.html");
}

async function savePin(event) {
  event.preventDefault();
  const email = document.getElementById("reset-email").value.trim().toLowerCase();
  const pin = document.getElementById("reset-pin").value.trim();
  const confirm = document.getElementById("reset-confirm-pin").value.trim();
  const savedEmail = (localStorage.getItem("pay54_email") || "").toLowerCase();
  if (!email || email !== savedEmail) return showMessage("Demo email not recognised");
  if (!PIN_REGEX.test(pin)) return showMessage("Demo PIN must be exactly four digits");
  if (pin !== confirm) return showMessage("Demo PINs do not match");
  try {
    await storeDevelopmentPin(pin);
  } catch {
    return showMessage("Secure browser cryptography is required for this demo");
  }
  sessionStorage.removeItem(PAY54_DEV_AUTH_HANDOFF_KEY);
  showMessage("Demo PIN changed. No real account was updated.", "success");
  navigateDemo("login.html");
}

function verifyOtp(event) {
  event.preventDefault();
  const code = document.getElementById("otp").value.trim();
  if (!/^\d{6}$/.test(code)) {
    return showMessage("Enter a six-digit demo verification code");
  }
  // This is intentionally NOT an OTP verification or identity check.
  localStorage.removeItem("pay54_pending_verification");
  showMessage("Demo verification completed. No email code was checked.", "success");
  navigateDemo("login.html");
}
