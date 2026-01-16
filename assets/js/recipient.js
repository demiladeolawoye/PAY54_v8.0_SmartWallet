/* =========================
   PAY54 — Layer 3A Unified Recipient Engine
   File: assets/js/recipient.js
   Version: v805.2-L3A
========================= */

(() => {
  "use strict";

  function isPlainObject(o) {
    return !!o && typeof o === "object" && !Array.isArray(o);
  }

  const RECIPIENT_TYPES = [
    { key: "pay54", label: "PAY54 User (Tag)" },
    { key: "bank", label: "Bank Account" },
    { key: "mobile_wallet", label: "Mobile Wallet" }
  ];

  const MOBILE_PROVIDERS = [
    "M-Pesa",
    "MTN MoMo",
    "Airtel Money",
    "OPay",
    "PalmPay",
    "Moov",
    "Tigo Pesa"
  ];

  const REASONS = [
    "Family support",
    "Salary",
    "Bills",
    "School fees",
    "Rent",
    "Business",
    "Gift",
    "Other"
  ];

  function normalizeRecipient(payload) {
    const p = isPlainObject(payload) ? payload : {};
    const type = String(p.type || "pay54");

    if (type === "pay54") {
      return {
        type,
        tag: String(p.tag || "").trim(),
        mobile: "",
        provider: "",
        bank: "",
        account_no: "",
        account_name: "",
        reference: String(p.reference || "").trim(),
        reason: String(p.reason || "").trim()
      };
    }

    if (type === "bank") {
      return {
        type,
        tag: "",
        mobile: "",
        provider: "",
        bank: String(p.bank || "").trim(),
        account_no: String(p.account_no || "").trim(),
        account_name: String(p.account_name || "").trim(),
        reference: String(p.reference || "").trim(),
        reason: String(p.reason || "").trim()
      };
    }

    // mobile wallet
    return {
      type: "mobile_wallet",
      tag: "",
      mobile: String(p.mobile || "").trim(),
      provider: String(p.provider || "").trim(),
      bank: "",
      account_no: "",
      account_name: "",
      reference: String(p.reference || "").trim(),
      reason: String(p.reason || "").trim()
    };
  }

  function validateRecipient(r) {
    const rec = normalizeRecipient(r);

    if (rec.type === "pay54") {
      if (!rec.tag || !rec.tag.startsWith("@")) return { ok: false, msg: "Enter a valid PAY54 tag like @username." };
      return { ok: true, recipient: rec };
    }

    if (rec.type === "bank") {
      if (!rec.bank) return { ok: false, msg: "Select a bank." };
      if (!/^\d{10}$/.test(rec.account_no)) return { ok: false, msg: "Account number must be 10 digits." };
      if (!rec.account_name) return { ok: false, msg: "Enter recipient account name." };
      return { ok: true, recipient: rec };
    }

    if (!rec.provider) return { ok: false, msg: "Select a wallet provider." };
    if (!/^\+?\d{7,15}$/.test(rec.mobile)) return { ok: false, msg: "Enter a valid mobile number (7–15 digits)." };
    return { ok: true, recipient: rec };
  }

  window.PAY54_RECIPIENT = {
    RECIPIENT_TYPES,
    MOBILE_PROVIDERS,
    REASONS,
    normalizeRecipient,
    validateRecipient
  };
})();
