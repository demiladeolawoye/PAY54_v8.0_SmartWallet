
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — DASHBOARD VISIBILITY AUDIT
   File: assets/js/dashboard-visibility-audit.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-006

   Non-invasive readiness audit. It does not replace or wrap action handlers,
   alter the DOM, access financial storage, or approve financial execution.
   Browser environment and authentication are not proof of private deployment.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const D = document;
  const VERSION = "1.0.0";
  const NAME = "PAY54_DASHBOARD_VISIBILITY_AUDIT";

  const existing = W[NAME];

  if (existing !== undefined) {
    if (
      existing?.version === VERSION &&
      typeof existing?.inspect === "function"
    ) {
      return;
    }

    throw new Error(
      "[PAY54_VISIBILITY_AUDIT] Incompatible existing installation."
    );
  }

  const CONFIG = W.PAY54_CONFIG;
  const CAP = W.PAY54_CAPABILITIES;
  const MARKETS = W.PAY54_MARKET_PROFILES;
  const POLICY = W.PAY54_FEATURE_POLICY;
  const ADAPTER = W.PAY54_DASHBOARD_VISIBILITY;

  if (
    !CONFIG?.get ||
    !CAP?.get ||
    !MARKETS?.get ||
    !POLICY?.evaluate ||
    !POLICY?.isDemoAvailable ||
    !ADAPTER?.audit
  ) {
    throw new Error(
      "[PAY54_VISIBILITY_AUDIT] Architecture modules must load first."
    );
  }

  const ACTIONS = Object.freeze({
    send: "send",
    receive: "receive",
    scan_pay: "send",
    add_money: "linked-card-funding",
    withdraw: "wallet",
    bank_transfer: "send",
    fx: "fx",
    bills: "bills",
    savings: "savings",
    cards: "cards",
    checkout: "marketplace",
    shop: "marketplace",
    refer: null,
    merchantqr: "receive",
    request: "receive",
    trading: "trading",
    bet: null,
    agent: "agent-network",
    risk: "risk-intelligence",
    atm: null,
    pos: "agent-network"
  });

  const HIGH_RISK = Object.freeze(new Set([
    "send",
    "scan_pay",
    "add_money",
    "withdraw",
    "bank_transfer",
    "fx",
    "bills",
    "checkout",
    "savings",
    "trading",
    "bet",
    "agent",
    "pos",
    "merchantqr"
  ]));

  const SENSITIVE_CLAIMS = Object.freeze([
    {
      selector: ".balance-delta",
      issue: "UNVERIFIED_DAILY_GAIN"
    },
    {
      selector: ".identity",
      issue: "STATIC_ACCOUNT_OR_KYC_CLAIM"
    },
    {
      selector: ".trust-chip",
      issue: "UNVERIFIED_COMPLIANCE_CLAIM"
    }
  ]);

  const LEGACY_UNMAPPED = Object.freeze([
    "refer",
    "bet",
    "atm"
  ]);

  function classify(row) {
    const mapped =
      Object.prototype.hasOwnProperty.call(
        ACTIONS,
        row.action
      )
        ? ACTIONS[row.action]
        : null;

    if (!mapped) {
      return "UNMAPPED_REQUIRES_POLICY";
    }

    if (row.publicVisible === true) {
      return "CLIENT_REPORTED_PUBLIC_VISIBLE_NOT_AUTHORISED";
    }

    if (row.demoAvailable === true) {
      return "DEMO_CANDIDATE_NOT_PUBLIC";
    }

    return "FUTURE_OR_UNAVAILABLE";
  }

  function inspect() {
    const sourceRows = ADAPTER.audit();

    if (!Array.isArray(sourceRows)) {
      throw new Error(
        "[PAY54_VISIBILITY_AUDIT] Invalid adapter audit."
      );
    }

    const rows = Object.freeze(
      sourceRows.map(row => Object.freeze({
        action: String(row.action ?? ""),

        capability:
          Object.prototype.hasOwnProperty.call(
            ACTIONS,
            row.action
          )
            ? ACTIONS[row.action]
            : null,

        surface: row.surface ?? null,
        market: row.market ?? null,

        demoCandidate:
          row.demoAvailable === true,

        publicClaim:
          row.publicVisible === true,

        currentPresentationVisible:
          row.presentationVisible === true,

        highRisk:
          HIGH_RISK.has(row.action),

        classification:
          classify(row)
      }))
    );

    const claimFindings = Object.freeze(
      SENSITIVE_CLAIMS
        .filter(item =>
          D.querySelector(item.selector)
        )
        .map(item =>
          Object.freeze({ ...item })
        )
    );

    const pendingActions = Object.freeze([
      ...new Set(
        rows
          .filter(row =>
            !row.demoCandidate &&
            row.currentPresentationVisible
          )
          .map(row => row.action)
      )
    ]);

    const unmappedActions = Object.freeze([
      ...new Set(
        rows
          .filter(row => !row.capability)
          .map(row => row.action)
      )
    ]);

    return Object.freeze({
      version: VERSION,

      assessedMarket:
        CONFIG.get(
          "market.defaultMarket",
          null
        ),

      runtimeEnvironment:
        CONFIG.get(
          "environment.name",
          null
        ),

      deploymentPrivacyVerified: false,
      trustedReadinessIntegrated: false,
      publicFinancialExecutionApproved: false,
      enforcementActive: false,

      inspected: rows.length,

      currentlyVisibleUnavailableActions:
        pendingActions,

      unmappedActions,

      sensitiveClaims:
        claimFindings,

      rows
    });
  }

  function health() {
    const results = [
      CAP.health?.(),
      MARKETS.health?.(),
      POLICY.health?.(),
      ADAPTER.health?.()
    ];

    return Object.freeze({
      version: VERSION,

      dependenciesHealthy:
        results.every(result =>
          result &&
          (
            result.healthy === true ||
            (
              result.capabilityRegistryHealthy === true &&
              result.marketProfilesHealthy === true &&
              result.featurePolicyHealthy === true
            )
          )
        ),

      auditOnly: true,
      financialMutations: 0,
      runtimeCanAuthorizePayments: false,

      unmappedLegacyActions:
        LEGACY_UNMAPPED
    });
  }

  const API = Object.freeze({
    version: VERSION,
    inspect,
    health
  });

  Object.defineProperty(
    W,
    NAME,
    {
      value: API,
      writable: false,
      configurable: false,
      enumerable: true
    }
  );

  console.info(
    "[PAY54_VISIBILITY_AUDIT] v1.0.0 ready; no UI or financial changes."
  );
})();
