
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE DASHBOARD VISIBILITY ADAPTER
   File: assets/js/dashboard-visibility-adapter.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-005

   Responsibilities:
   - Map existing dashboard actions to canonical capabilities.
   - Evaluate capability visibility using the enterprise policy.
   - Preserve existing development demonstration functionality.
   - Hide unapproved actions in production presentation mode.
   - Prevent ordinary dashboard click activation of hidden actions.
   - Provide read-only diagnostic and audit functions.

   Boundaries:
   - No ledger, card, funding or transaction mutations.
   - No storage writes.
   - No provider execution.
   - No business-logic duplication.
   - No change to PAY54_SERVICES or PAY54_ACTIONS.
   - Browser presentation controls are not server authorisation.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const D = document;

  const VERSION = "1.0.0";
  const NAME = "PAY54 Dashboard Visibility Adapter";

  const GLOBAL_NAME = "PAY54_DASHBOARD_VISIBILITY";

  if (W[GLOBAL_NAME] !== undefined) {
    const existing = W[GLOBAL_NAME];

    if (
      existing?.version === VERSION &&
      typeof existing.audit === "function" &&
      typeof existing.evaluate === "function" &&
      typeof existing.health === "function"
    ) {
      console.info(
        "[PAY54_VISIBILITY] Existing compatible instance retained."
      );
      return;
    }

    throw new Error(
      "[PAY54_VISIBILITY] Incompatible instance already exists."
    );
  }

  const CONFIG = W.PAY54_CONFIG;
  const CAPABILITIES = W.PAY54_CAPABILITIES;
  const MARKETS = W.PAY54_MARKET_PROFILES;
  const POLICY = W.PAY54_FEATURE_POLICY;

  if (
    !CONFIG ||
    typeof CONFIG.get !== "function" ||
    typeof CONFIG.isProduction !== "function" ||
    !CAPABILITIES ||
    typeof CAPABILITIES.get !== "function" ||
    !MARKETS ||
    typeof MARKETS.get !== "function" ||
    !POLICY ||
    typeof POLICY.evaluate !== "function" ||
    typeof POLICY.isDemoAvailable !== "function"
  ) {
    throw new Error(
      "[PAY54_VISIBILITY] Enterprise governance dependencies unavailable."
    );
  }

  /*
   * Existing action identifiers are compatibility contracts.
   * The mapped capability is advisory for display policy.
   *
   * A null capability is not automatically permitted.
   */

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

  const SELECTORS = Object.freeze({
    send: '[data-action="send"]',
    receive: '[data-action="receive"]',
    scan_pay: '[data-action="scan_pay"], #scanPayFab',
    add_money: '[data-action="add_money"], #addMoneyBtn',
    withdraw: '[data-action="withdraw"], #withdrawBtn',
    bank_transfer: '[data-action="bank_transfer"]',
    fx: '[data-action="fx"]',
    bills: '[data-action="bills"]',
    savings: '[data-action="savings"]',
    cards: '[data-action="cards"]',
    checkout: '[data-action="checkout"]',
    shop: '[data-action="shop"]',
    refer: '[data-action="refer"]',
    merchantqr: '[data-action="merchantqr"]',
    request: '[data-action="request"]',
    trading: '[data-action="trading"]',
    bet: '[data-action="bet"]',
    agent: '[data-action="agent"]',
    risk: '[data-action="risk"]',
    atm: '[data-action="atm"]',
    pos: '[data-action="pos"]'
  });

  const ACTION_BY_ELEMENT = new WeakMap();

  let installed = false;
  let observer = null;
  let applying = false;
  let scans = 0;
  let lastAudit = null;

  function environment() {
    return CONFIG.get(
      "environment.name",
      null
    );
  }

  function isProduction() {
    try {
      return CONFIG.isProduction() === true;
    } catch {
      return true;
    }
  }

  function market() {
    /*
     * Wallet display currency is deliberately not used.
     * Market selection requires an independently verified
     * customer or deployment context in a future release.
     */
    const selected = CONFIG.get(
      "market.defaultMarket",
      null
    );

    return (
      typeof selected === "string" &&
      MARKETS.get(selected)
    )
      ? selected.toUpperCase()
      : null;
  }

  function surfaceFor(element) {
    if (
      element.closest(".shortcut-grid")
    ) {
      return "shortcuts";
    }

    if (
      element.closest(".services-grid")
    ) {
      return "services";
    }

    return "navigation";
  }

  function evaluate(action, surface = "navigation") {
    const capability = Object.hasOwn(ACTIONS, action)
      ? ACTIONS[action]
      : null;

    const currentMarket = market();

    if (!capability || !CAPABILITIES.get(capability)) {
      return Object.freeze({
        action,
        capability,
        market: currentMarket,
        surface,
        publicVisible: false,
        demoAvailable: false,
        presentationVisible: !isProduction(),
        reason: "UNMAPPED_OR_UNAVAILABLE_CAPABILITY"
      });
    }

    let decision = null;
    let demoAvailable = false;

    try {
      decision = POLICY.evaluate(
        capability,
        {
          market: currentMarket,
          surface
        }
      );

      demoAvailable =
        POLICY.isDemoAvailable(
          capability,
          {
            market: currentMarket,
            surface
          }
        ) === true;
    } catch {
      decision = null;
      demoAvailable = false;
    }

    const publicVisible =
      decision?.visible === true;

    /*
     * Existing dashboard demonstrations are preserved only
     * in non-production presentation mode.
     *
     * The public-facing mode is controlled entirely by
     * positive enterprise readiness decisions.
     */

    const presentationVisible = isProduction()
      ? publicVisible
      : true;

    return Object.freeze({
      action,
      capability,
      market: currentMarket,
      surface,
      publicVisible,
      demoAvailable,
      presentationVisible,
      reason: publicVisible
        ? "PUBLIC_POLICY_APPROVED"
        : (
          isProduction()
            ? "PUBLIC_READINESS_NOT_APPROVED"
            : "DEVELOPMENT_PRESENTATION_PRESERVED"
        )
    });
  }

  function actionFromElement(element) {
    if (!(element instanceof Element)) {
      return null;
    }

    const mapped = ACTION_BY_ELEMENT.get(element);

    if (mapped) {
      return mapped;
    }

    const directAction = element.getAttribute(
      "data-action"
    );

    if (
      directAction &&
      Object.hasOwn(ACTIONS, directAction)
    ) {
      return directAction;
    }

    if (element.id === "scanPayFab") {
      return "scan_pay";
    }

    if (element.id === "addMoneyBtn") {
      return "add_money";
    }

    if (element.id === "withdrawBtn") {
      return "withdraw";
    }

    return directAction || null;
  }

  function applyElement(element, action) {
    const decision = evaluate(
      action,
      surfaceFor(element)
    );

    ACTION_BY_ELEMENT.set(element, action);

    if (!isProduction()) {
      return decision;
    }

    if (!decision.presentationVisible) {
      if (element.hidden !== true) {
        element.hidden = true;
      }

      if (
        element.style.getPropertyValue("display") !== "none" ||
        element.style.getPropertyPriority("display") !== "important"
      ) {
        element.style.setProperty(
          "display",
          "none",
          "important"
        );
      }

      if (element.getAttribute("aria-hidden") !== "true") {
        element.setAttribute(
          "aria-hidden",
          "true"
        );
      }

      if (
        "disabled" in element &&
        element.disabled !== true
      ) {
        element.disabled = true;
      }
    }

    return decision;
  }

  function managedElements() {
    const results = new Map();

    for (const [action, selector] of Object.entries(SELECTORS)) {
      for (const element of D.querySelectorAll(selector)) {
        if (!results.has(element)) {
          results.set(element, action);
        }
      }
    }

    /*
     * Unknown data-action buttons are included and fail
     * closed for production dashboard presentation.
     */
    for (const element of D.querySelectorAll("[data-action]")) {
      if (!results.has(element)) {
        results.set(
          element,
          element.getAttribute("data-action") || ""
        );
      }
    }

    return results;
  }

  function apply() {
    if (applying) {
      return Object.freeze({
        applied: false,
        reason: "ALREADY_APPLYING"
      });
    }

    applying = true;

    let inspected = 0;
    let publiclyVisible = 0;
    let hiddenForProduction = 0;

    try {
      for (const [element, action] of managedElements()) {
        const result = applyElement(
          element,
          action
        );

        inspected += 1;

        if (result.publicVisible) {
          publiclyVisible += 1;
        }

        if (
          isProduction() &&
          !result.presentationVisible
        ) {
          hiddenForProduction += 1;
        }
      }

      scans += 1;

      return Object.freeze({
        applied: true,
        environment: environment(),
        inspected,
        publiclyVisible,
        hiddenForProduction,
        scans
      });
    } finally {
      applying = false;
    }
  }

  function audit() {
    const rows = [];

    for (const [element, action] of managedElements()) {
      const result = evaluate(
        action,
        surfaceFor(element)
      );

      rows.push(Object.freeze({
        action,
        capability: result.capability,
        surface: result.surface,
        market: result.market,
        publicVisible: result.publicVisible,
        demoAvailable: result.demoAvailable,
        presentationVisible:
          result.presentationVisible,
        elementTag: element.tagName,
        elementId: element.id || null
      }));
    }

    lastAudit = Object.freeze(rows);

    return lastAudit;
  }

  function interceptPublicActions(event) {
    if (!isProduction()) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const element = target.closest(
      "[data-action], #scanPayFab, #addMoneyBtn, #withdrawBtn"
    );

    if (!element) {
      return;
    }

    const action = actionFromElement(element);

    if (!action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const result = evaluate(
      action,
      surfaceFor(element)
    );

    if (!result.publicVisible) {
      event.preventDefault();
      event.stopImmediatePropagation();

      console.warn(
        "[PAY54_VISIBILITY] Unavailable action blocked:",
        action
      );
    }
  }

  function install() {
    if (installed) {
      return true;
    }

    D.addEventListener(
      "click",
      interceptPublicActions,
      true
    );

    apply();

    if (
      isProduction() &&
      typeof MutationObserver === "function"
    ) {
      observer = new MutationObserver(() => {
        apply();
      });

      observer.observe(
        D.body,
        {
          childList: true,
          subtree: true
        }
      );
    }

    installed = true;

    console.info(
      `[PAY54_VISIBILITY] ${NAME} v${VERSION} installed.`
    );

    return true;
  }

  function health() {
    const capabilityHealth =
      CAPABILITIES.health?.();

    const marketHealth =
      MARKETS.health?.();

    const policyHealth =
      POLICY.health?.();

    return Object.freeze({
      name: NAME,
      version: VERSION,
      installed,
      environment: environment(),
      market: market(),
      productionPresentation: isProduction(),
      capabilityRegistryHealthy:
        capabilityHealth?.healthy === true,
      marketProfilesHealthy:
        marketHealth?.healthy === true,
      featurePolicyHealthy:
        policyHealth?.healthy === true,
      lastAuditCount:
        lastAudit?.length ?? 0,
      scans,
      mutationObserverActive:
        observer !== null,
      financialExecutionAuthority: false
    });
  }

  const API = Object.freeze({
    version: VERSION,
    evaluate,
    audit,
    apply,
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

  if (D.readyState === "loading") {
    D.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true }
    );
  } else {
    install();
  }
})();
