
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE MARKET PROFILES
   File: assets/js/core/market-profiles.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-002

   Public, immutable planning profiles for PAY54 market-aware architecture.

   Profiles never constitute legal, commercial or regulatory approval.

   This module does not read or write wallet, card or transaction storage.

   No network calls, routing, provider execution or financial mutations.
========================================================================== */

(() => {
  "use strict";

  const GLOBAL = window;
  const VERSION = "1.0.0";
  const GLOBAL_NAME = "PAY54_MARKET_PROFILES";
  const CONFIG = GLOBAL.PAY54_CONFIG;
  const CAPABILITIES = GLOBAL.PAY54_CAPABILITIES;

  /* ========================================================================
     SAFE RELOAD
  ======================================================================== */

  if (GLOBAL[GLOBAL_NAME] !== undefined) {
    const existing = GLOBAL[GLOBAL_NAME];

    if (
      existing?.version === VERSION &&
      typeof existing.get === "function" &&
      typeof existing.list === "function" &&
      typeof existing.evaluate === "function" &&
      typeof existing.health === "function"
    ) {
      console.info(
        "[PAY54_MARKET_PROFILES] Existing compatible instance retained."
      );
      return;
    }

    throw new Error(
      "[PAY54_MARKET_PROFILES] Incompatible instance already installed."
    );
  }

  /* ========================================================================
     DEPENDENCY VERIFICATION
  ======================================================================== */

  if (
    !CONFIG ||
    typeof CONFIG.get !== "function" ||
    typeof CONFIG.getFeature !== "function" ||
    typeof CONFIG.isFeatureLive !== "function" ||
    !CAPABILITIES ||
    typeof CAPABILITIES.get !== "function" ||
    typeof CAPABILITIES.evaluate !== "function"
  ) {
    throw new Error(
      "[PAY54_MARKET_PROFILES] Config and Capability Registry must load first."
    );
  }

  /* ========================================================================
     IMMUTABILITY UTILITIES
  ======================================================================== */

  function deepFreeze(value) {
    if (
      value &&
      typeof value === "object" &&
      !Object.isFrozen(value)
    ) {
      for (const child of Object.values(value)) {
        deepFreeze(child);
      }

      Object.freeze(value);
    }

    return value;
  }

  /* ========================================================================
     CANONICAL MARKET PROFILES

     Candidate rails and capabilities are architecture-planning information.
     They must not be interpreted as approved or available services.
  ======================================================================== */

  const PROFILES = deepFreeze({
    NG: {
      code: "NG",
      name: "Nigeria",
      currency: "NGN",
      region: "Africa",

      strategy: "FIRST_AFRICAN_LAUNCH_MARKET",
      lifecycle: "PRE_LAUNCH",

      channels: [
        "WEB",
        "MOBILE"
      ],

      futureChannels: [
        "API",
        "USSD",
        "AGENT_ASSISTED",
        "SMS"
      ],

      candidateRails: [
        "BANK_TRANSFER",
        "LOCAL_QR",
        "BILL_PAYMENT",
        "AGENT_CASH_ACCESS"
      ],

      candidateCapabilities: [
        "wallet",
        "send",
        "receive",
        "fx",
        "cards",
        "linked-card-funding",
        "bills",
        "airtime",
        "data",
        "electricity",
        "tv",
        "education-payments",
        "gift-cards",
        "agent-network"
      ],

      notes:
        "Nigeria market planning only; no provider, licence or product availability represented."
    },

    GB: {
      code: "GB",
      name: "United Kingdom",
      currency: "GBP",
      region: "Europe",

      strategy: "INITIAL_CORRIDOR_MARKET",
      lifecycle: "PRE_LAUNCH",

      channels: [
        "WEB",
        "MOBILE"
      ],

      futureChannels: [
        "API"
      ],

      candidateRails: [
        "BANK_TRANSFER",
        "CROSS_BORDER",
        "CARDS"
      ],

      candidateCapabilities: [
        "wallet",
        "send",
        "receive",
        "fx",
        "cards",
        "linked-card-funding",
        "gift-cards"
      ],

      notes:
        "UK corridor planning only; no regulated service or partner approval represented."
    },

    KE: {
      code: "KE",
      name: "Kenya",
      currency: "KES",
      region: "Africa",

      strategy: "FIRST_AFRICAN_EXPANSION_CANDIDATE",
      lifecycle: "FUTURE_ARCHITECTURE",

      channels: [],

      futureChannels: [
        "WEB",
        "MOBILE",
        "API",
        "USSD",
        "AGENT_ASSISTED"
      ],

      candidateRails: [
        "BANK_TRANSFER",
        "MOBILE_MONEY",
        "LOCAL_QR",
        "AGENT_CASH_ACCESS"
      ],

      candidateCapabilities: [
        "wallet",
        "send",
        "receive",
        "fx",
        "gift-cards",
        "agent-network"
      ],

      notes:
        "Expansion research only; not a day-one launch market."
    }
  });

  const MARKET_CODES = Object.freeze(
    Object.keys(PROFILES)
  );

  /* ========================================================================
     MARKET IDENTIFIER NORMALISATION
  ======================================================================== */

  function normaliseMarket(input) {
    if (typeof input !== "string") {
      return null;
    }

    const normalized = input
      .trim()
      .toUpperCase();

    return /^[A-Z]{2}$/.test(normalized)
      ? normalized
      : null;
  }

  /* ========================================================================
     READ-ONLY MARKET ACCESS
  ======================================================================== */

  function get(market) {
    const code = normaliseMarket(market);

    return code && Object.hasOwn(PROFILES, code)
      ? PROFILES[code]
      : null;
  }

  function list() {
    return Object.freeze(
      MARKET_CODES.map(code => PROFILES[code])
    );
  }

  function has(market) {
    return get(market) !== null;
  }

  /* ========================================================================
     MARKET / CAPABILITY ELIGIBILITY

     Browser-supplied readiness values are advisory only.
     This function never grants financial execution permission.
  ======================================================================== */

  function evaluate(
    market,
    capability,
    readiness = {}
  ) {
    const profile = get(market);

    const id =
      typeof capability === "string"
        ? capability
        : null;

    const reasons = [];

    if (!profile) {
      reasons.push("UNKNOWN_MARKET");
    }

    if (!id || !CAPABILITIES.get(id)) {
      reasons.push("UNKNOWN_CAPABILITY");
    }

    if (
      profile &&
      profile.lifecycle === "FUTURE_ARCHITECTURE"
    ) {
      reasons.push("MARKET_NOT_LAUNCHED");
    }

    if (
      profile &&
      id &&
      !profile.candidateCapabilities.includes(id)
    ) {
      reasons.push("NOT_IN_MARKET_CANDIDATE_SCOPE");
    }

    const advisory = CAPABILITIES.evaluate(
      id,
      {
        market: profile?.code ?? null,

        marketPermitted:
          readiness.marketPermitted === true,

        providerReady:
          readiness.providerReady === true,

        complianceApproved:
          readiness.complianceApproved === true,

        operationsReady:
          readiness.operationsReady === true,

        customerEligible:
          readiness.customerEligible === true,

        serverAuthorised:
          readiness.serverAuthorised === true
      }
    );

    const allReasons = Object.freeze([
      ...new Set([
        ...reasons,
        ...advisory.reasons
      ])
    ]);

    return Object.freeze({
      market: profile?.code ?? null,
      capability: id,

      candidate: Boolean(
        profile &&
        id &&
        profile.candidateCapabilities.includes(id)
      ),

      publicVisible:
        allReasons.length === 0,

      executable: false,

      reasons: allReasons,

      authority: "CLIENT_ADVISORY_ONLY"
    });
  }

  /* ========================================================================
     HEALTH / INTEGRITY
  ======================================================================== */

  function health() {
    const errors = [];

    for (const code of MARKET_CODES) {
      const profile = PROFILES[code];

      if (
        profile.code !== code ||
        !/^[A-Z]{3}$/.test(profile.currency)
      ) {
        errors.push(
          `Invalid profile ${code}`
        );
      }

      if (
        !Object.isFrozen(profile) ||
        !Object.isFrozen(
          profile.candidateCapabilities
        )
      ) {
        errors.push(
          `Mutable profile ${code}`
        );
      }
    }

    const capabilityHealth =
      CAPABILITIES.health?.();

    if (
      capabilityHealth &&
      capabilityHealth.healthy !== true
    ) {
      errors.push(
        "Capability Registry reports unhealthy state"
      );
    }

    return Object.freeze({
      version: VERSION,

      healthy:
        errors.length === 0,

      marketCount:
        MARKET_CODES.length,

      marketCodes:
        MARKET_CODES,

      launchedMarkets:
        Object.freeze([]),

      errors:
        Object.freeze(errors),

      authority:
        "PLANNING_ONLY"
    });
  }

  /* ========================================================================
     PUBLIC API
  ======================================================================== */

  const API = Object.freeze({
    version: VERSION,
    get,
    list,
    has,
    evaluate,
    health
  });

  Object.defineProperty(
    GLOBAL,
    GLOBAL_NAME,
    {
      value: API,
      enumerable: true,
      writable: false,
      configurable: false
    }
  );

  console.info(
    `[PAY54_MARKET_PROFILES] v${VERSION} ready; all markets prelaunch or future.`
  );
})();
