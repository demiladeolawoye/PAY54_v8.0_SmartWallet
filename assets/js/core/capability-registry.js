
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE CAPABILITY REGISTRY
   File: assets/js/core/capability-registry.js
   Version: 1.0.0
   Work package: WP-P54-ARCH-001

   Read-only capability descriptors and conservative visibility decisions.
   This module is not an authorisation, settlement or regulatory boundary.
   All financial execution must be authorised by a trusted server.
   No persistent writes, existing engine overrides, or financial mutations.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const VERSION = "1.0.0";
  const NAME = "PAY54 Enterprise Capability Registry";
  const CONFIG = W.PAY54_CONFIG;
  const CONSTANTS = W.PAY54_CONSTANTS;

  if (W.PAY54_CAPABILITIES) {
    const existing = W.PAY54_CAPABILITIES;
    if (existing.version === VERSION && typeof existing.evaluate === "function") {
      console.info("[PAY54_CAPABILITIES] Existing registry retained.");
      return;
    }
    throw new Error("[PAY54_CAPABILITIES] Incompatible registry already installed.");
  }

  if (
    !CONFIG || typeof CONFIG.getFeature !== "function" ||
    typeof CONFIG.get !== "function" || typeof CONFIG.isFeatureLive !== "function" ||
    !CONSTANTS || typeof CONSTANTS.get !== "function" ||
    !CONSTANTS.get("MODULES")
  ) {
    throw new Error("[PAY54_CAPABILITIES] Required core dependencies unavailable.");
  }

  const DESCRIPTORS = Object.freeze([
    { id: "wallet", configKey: "wallet", markets: ["NG", "GB"], surface: "personal" },
    { id: "send", configKey: "send", markets: ["NG", "GB"], surface: "personal" },
    { id: "receive", configKey: "receive", markets: ["NG", "GB"], surface: "personal" },
    { id: "contacts", configKey: "contacts", markets: ["NG", "GB"], surface: "personal" },
    { id: "beneficiaries", configKey: "beneficiaries", markets: ["NG", "GB"], surface: "personal" },
    { id: "fx", configKey: "fx", markets: ["NG", "GB"], surface: "personal" },
    { id: "cards", configKey: "cards", markets: ["NG", "GB"], surface: "personal" },
    { id: "linked-card-funding", configKey: "linkedCardFunding", markets: ["NG", "GB"], surface: "personal" },
    { id: "bills", configKey: "bills", markets: ["NG"], surface: "personal" },
    { id: "airtime", configKey: "airtime", markets: ["NG"], surface: "personal" },
    { id: "data", configKey: "data", markets: ["NG"], surface: "personal" },
    { id: "electricity", configKey: "electricity", markets: ["NG"], surface: "personal" },
    { id: "tv", configKey: "tv", markets: ["NG"], surface: "personal" },
    { id: "education-payments", configKey: "educationPayments", markets: ["NG"], surface: "personal" },
    { id: "gift-cards", configKey: "giftCards", markets: ["NG", "GB"], surface: "personal" },
    { id: "savings", configKey: "savings", markets: ["NG", "GB"], surface: "personal" },
    { id: "trading", configKey: "trading", markets: ["NG", "GB"], surface: "personal" },
    { id: "crypto", configKey: "crypto", markets: ["NG", "GB"], surface: "personal" },
    { id: "marketplace", configKey: "marketplace", markets: ["NG", "GB"], surface: "personal" },
    { id: "agent-network", configKey: "agentNetwork", markets: ["NG"], surface: "personal" },
    { id: "risk-intelligence", configKey: "riskIntelligence", markets: ["NG", "GB"], surface: "internal" }
  ].map(item => Object.freeze({
    ...item,
    markets: Object.freeze([...item.markets])
  })));

  const BY_ID = new Map(DESCRIPTORS.map(item => [item.id, item]));
  const ELIGIBILITY_KEYS = Object.freeze([
    "marketPermitted", "providerReady", "complianceApproved",
    "operationsReady", "customerEligible", "serverAuthorised"
  ]);

  function normaliseMarket(input) {
    if (typeof input !== "string") return null;
    const market = input.trim().toUpperCase();
    return /^[A-Z]{2}$/.test(market) ? market : null;
  }

  function descriptor(id) {
    return typeof id === "string" ? BY_ID.get(id) ?? null : null;
  }

  function get(id) {
    const item = descriptor(id);
    if (!item) return null;
    const configured = CONFIG.getFeature(item.configKey);
    return Object.freeze({
      id: item.id,
      configKey: item.configKey,
      surface: item.surface,
      candidateMarkets: item.markets,
      implemented: configured?.implemented === true,
      enabled: configured?.enabled === true,
      live: CONFIG.isFeatureLive(item.configKey) === true
    });
  }

  function list() {
    return Object.freeze(DESCRIPTORS.map(item => get(item.id)));
  }

  function evaluate(id, options = {}) {
    const item = descriptor(id);
    const market = normaliseMarket(options?.market);
    const configured = item ? CONFIG.getFeature(item.configKey) : null;
    const reasons = [];

    if (!item) reasons.push("UNKNOWN_CAPABILITY");
    if (!market) reasons.push("INVALID_MARKET");
    else if (item && !item.markets.includes(market)) reasons.push("UNSUPPORTED_MARKET_CANDIDATE");
    if (item && configured?.implemented !== true) reasons.push("NOT_IMPLEMENTED");
    if (item && configured?.enabled !== true) reasons.push("FEATURE_DISABLED");
    if (item && CONFIG.isFeatureLive(item.configKey) !== true) reasons.push("NOT_LIVE");

    for (const key of ELIGIBILITY_KEYS) {
      if (options?.[key] !== true) {
        reasons.push(`UNVERIFIED_${key.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
      }
    }

    const visible = reasons.length === 0;
    return Object.freeze({
      capability: typeof id === "string" ? id : null,
      market,
      visible,
      executable: visible,
      reasons: Object.freeze(reasons),
      authority: "CLIENT_ADVISORY_ONLY"
    });
  }

  function isDemoAvailable(id) {
    const item = descriptor(id);
    if (!item) return false;
    const environment = CONFIG.get("environment.name", null);
    return (
      ["development", "test", "staging"].includes(environment) &&
      CONFIG.get("environment.realMoneyMode", true) === false &&
      CONFIG.isFeatureEnabled?.(item.configKey) === true
    );
  }

  function health() {
    const unknown = DESCRIPTORS.filter(item => !CONFIG.getFeature(item.configKey));
    return Object.freeze({
      name: NAME,
      version: VERSION,
      healthy: unknown.length === 0,
      descriptorCount: DESCRIPTORS.length,
      unknownConfigKeys: Object.freeze(unknown.map(item => item.configKey)),
      publicLiveCount: DESCRIPTORS.filter(item => CONFIG.isFeatureLive(item.configKey)).length
    });
  }

  const API = Object.freeze({ version: VERSION, get, list, evaluate, isDemoAvailable, health });
  Object.defineProperty(W, "PAY54_CAPABILITIES", {
    value: API, writable: false, configurable: false, enumerable: true
  });
  console.info(`[PAY54_CAPABILITIES] ${NAME} v${VERSION} ready.`);
})();
