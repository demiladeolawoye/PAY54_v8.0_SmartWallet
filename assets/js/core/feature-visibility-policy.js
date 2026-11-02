
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE FEATURE VISIBILITY POLICY
   File: assets/js/core/feature-visibility-policy.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-003

   Read-only customer-surface presentation policy.
   Public availability requires a positive evaluation from both existing
   capability and market profile catalogues. A browser claim of readiness
   never constitutes trusted approval or transaction authorisation.

   This module performs no storage, network, payment or engine mutations.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const VERSION = "1.0.0";
  const NAME = "PAY54 Feature Visibility Policy";
  const GLOBAL_NAME = "PAY54_FEATURE_POLICY";

  if (W[GLOBAL_NAME] !== undefined) {
    const existing = W[GLOBAL_NAME];

    if (
      existing?.version === VERSION &&
      typeof existing.evaluate === "function" &&
      typeof existing.listVisible === "function" &&
      typeof existing.health === "function"
    ) {
      console.info(
        "[PAY54_FEATURE_POLICY] Existing compatible policy retained."
      );
      return;
    }

    throw new Error(
      "[PAY54_FEATURE_POLICY] Incompatible policy already exists."
    );
  }

  const CONFIG = W.PAY54_CONFIG;
  const CAPABILITIES = W.PAY54_CAPABILITIES;
  const MARKETS = W.PAY54_MARKET_PROFILES;

  if (
    !CONFIG ||
    typeof CONFIG.get !== "function" ||
    !CAPABILITIES ||
    typeof CAPABILITIES.get !== "function" ||
    typeof CAPABILITIES.evaluate !== "function" ||
    typeof CAPABILITIES.list !== "function" ||
    !MARKETS ||
    typeof MARKETS.get !== "function" ||
    typeof MARKETS.evaluate !== "function" ||
    typeof MARKETS.health !== "function"
  ) {
    throw new Error(
      "[PAY54_FEATURE_POLICY] Config, Capability Registry and Market Profiles must load first."
    );
  }

  const SURFACES = Object.freeze([
    "services",
    "shortcuts",
    "navigation"
  ]);

  const SURFACE_CANDIDATES = Object.freeze({
    services: Object.freeze([
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
      "savings",
      "trading",
      "crypto",
      "marketplace",
      "agent-network"
    ]),

    shortcuts: Object.freeze([
      "send",
      "receive",
      "fx",
      "cards",
      "bills",
      "gift-cards",
      "agent-network"
    ]),

    navigation: Object.freeze([
      "wallet",
      "send",
      "receive",
      "contacts",
      "beneficiaries",
      "fx",
      "cards",
      "bills",
      "gift-cards",
      "savings",
      "marketplace"
    ])
  });

  const PREFERRED_SHORTCUTS = Object.freeze({
    NG: Object.freeze([
      "gift-cards",
      "agent-network",
      "bills",
      "send",
      "receive",
      "fx",
      "cards"
    ]),

    GB: Object.freeze([
      "send",
      "fx",
      "gift-cards",
      "cards",
      "receive"
    ]),

    KE: Object.freeze([])
  });

  function normalizeMarket(value) {
    if (typeof value !== "string") {
      return null;
    }

    const result = value.trim().toUpperCase();

    return /^[A-Z]{2}$/.test(result)
      ? result
      : null;
  }

  function normalizeSurface(value) {
    return (
      typeof value === "string" &&
      SURFACES.includes(value)
    )
      ? value
      : null;
  }

  function asObject(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    )
      ? value
      : {};
  }

  function uniqueReasons(values) {
    return Object.freeze([
      ...new Set(
        values.filter(
          value => typeof value === "string"
        )
      )
    ]);
  }

  /*
   * No caller-supplied readiness booleans are accepted.
   *
   * Financial readiness must come from authenticated,
   * server-controlled deployment and eligibility decisions.
   *
   * That integration is not yet present. Public exposure
   * therefore remains disabled by design.
   */

  function evaluate(capability, options = {}) {
    const settings = asObject(options);

    const market = normalizeMarket(
      settings.market
    );

    const surface = normalizeSurface(
      settings.surface
    );

    const known = CAPABILITIES.get(capability);

    const profile = market
      ? MARKETS.get(market)
      : null;

    const reasons = [];

    if (!surface) {
      reasons.push("UNSUPPORTED_SURFACE");
    }

    if (!known) {
      reasons.push("UNKNOWN_CAPABILITY");
    }

    if (!profile) {
      reasons.push("UNKNOWN_MARKET");
    }

    if (
      surface &&
      !SURFACE_CANDIDATES[surface].includes(capability)
    ) {
      reasons.push("NOT_IN_SURFACE_SCOPE");
    }

    if (known?.surface !== "personal") {
      reasons.push("NOT_A_CUSTOMER_CAPABILITY");
    }

    let capabilityDecision = null;
    let marketDecision = null;

    try {
      capabilityDecision = CAPABILITIES.evaluate(
        capability,
        { market }
      );

      marketDecision = MARKETS.evaluate(
        market,
        capability
      );

      if (
        capabilityDecision?.visible !== true
      ) {
        reasons.push("CAPABILITY_NOT_READY");
      }

      if (
        marketDecision?.publicVisible !== true
      ) {
        reasons.push("MARKET_NOT_READY");
      }
    } catch {
      reasons.push("READINESS_EVALUATION_FAILED");
    }

    return Object.freeze({
      capability:
        typeof capability === "string"
          ? capability
          : null,

      market,
      surface,

      visible: false,
      executable: false,

      status:
        "HIDDEN_PENDING_TRUSTED_READINESS",

      reasons: uniqueReasons([
        ...reasons,

        ...(
          Array.isArray(capabilityDecision?.reasons)
            ? capabilityDecision.reasons
            : []
        ),

        ...(
          Array.isArray(marketDecision?.reasons)
            ? marketDecision.reasons
            : []
        ),

        "TRUSTED_READINESS_NOT_INTEGRATED"
      ]),

      authority: "CLIENT_PRESENTATION_ONLY"
    });
  }

  function candidates(surface, market) {
    const selectedSurface = normalizeSurface(
      surface
    );

    const code = normalizeMarket(market);

    if (
      !selectedSurface ||
      !code ||
      !MARKETS.has(code)
    ) {
      return Object.freeze([]);
    }

    const base = SURFACE_CANDIDATES[
      selectedSurface
    ];

    if (selectedSurface !== "shortcuts") {
      return base;
    }

    const preferred =
      PREFERRED_SHORTCUTS[code] ?? [];

    return Object.freeze([
      ...preferred.filter(
        value => base.includes(value)
      ),

      ...base.filter(
        value => !preferred.includes(value)
      )
    ]);
  }

  function listVisible(surface, market) {
    return Object.freeze(
      candidates(surface, market).filter(
        capability =>
          evaluate(
            capability,
            { surface, market }
          ).visible
      )
    );
  }

  /*
   * Development demonstrations are separate from
   * public availability. This method does not authorise
   * real-money execution.
   */

  function isDemoAvailable(
    capability,
    options = {}
  ) {
    const settings = asObject(options);

    const surface = normalizeSurface(
      settings.surface
    );

    const market = normalizeMarket(
      settings.market
    );

    const profile = market
      ? MARKETS.get(market)
      : null;

    const configuredEnvironment =
      CONFIG.get(
        "environment.name",
        null
      );

    if (
      !surface ||
      !profile ||
      !SURFACE_CANDIDATES[surface].includes(
        capability
      )
    ) {
      return false;
    }

    if (
      !profile.candidateCapabilities.includes(
        capability
      )
    ) {
      return false;
    }

    if (
      profile.lifecycle ===
      "FUTURE_ARCHITECTURE"
    ) {
      return false;
    }

    return (
      [
        "development",
        "test",
        "staging"
      ].includes(configuredEnvironment) &&

      CONFIG.get(
        "environment.realMoneyMode",
        true
      ) === false &&

      CAPABILITIES.isDemoAvailable?.(
        capability
      ) === true
    );
  }

  function health() {
    const errors = [];

    const capabilitiesHealth =
      CAPABILITIES.health?.();

    const marketsHealth =
      MARKETS.health();

    if (
      capabilitiesHealth?.healthy !== true
    ) {
      errors.push(
        "CAPABILITY_REGISTRY_UNHEALTHY"
      );
    }

    if (
      marketsHealth?.healthy !== true
    ) {
      errors.push(
        "MARKET_PROFILES_UNHEALTHY"
      );
    }

    for (const surface of SURFACES) {
      for (
        const capability of
        SURFACE_CANDIDATES[surface]
      ) {
        if (!CAPABILITIES.get(capability)) {
          errors.push(
            `UNKNOWN_CAPABILITY:${surface}:${capability}`
          );
        }
      }
    }

    return Object.freeze({
      name: NAME,
      version: VERSION,

      healthy:
        errors.length === 0,

      publicExposureEnabled: false,
      trustedReadinessIntegrated: false,

      surfaces: SURFACES,

      errors: Object.freeze(errors)
    });
  }

  const API = Object.freeze({
    version: VERSION,
    evaluate,
    candidates,
    listVisible,
    isDemoAvailable,
    health
  });

  Object.defineProperty(
    W,
    GLOBAL_NAME,
    {
      value: API,
      writable: false,
      configurable: false,
      enumerable: true
    }
  );

  console.info(
    `[PAY54_FEATURE_POLICY] ${NAME} v${VERSION} ready; public exposure disabled.`
  );
})();
