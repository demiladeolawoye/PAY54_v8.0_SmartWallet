
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE PUBLIC PREVIEW EXECUTION GATE
   File: assets/js/core/preview-execution-gate.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-007B

   Scope:
   - Intercept ordinary financial-action clicks on public GitHub Pages.
   - Preserve the existing dashboard and financial engines.
   - Allow non-financial interface interactions.
   - Report interception status without writing to storage.

   Security boundary:
   - This is a presentation/interaction control only.
   - It does not authorise financial transactions.
   - It does not prevent direct JavaScript engine calls.
   - Production execution requires server-side controls.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const D = document;

  const VERSION = "1.0.0";
  const GLOBAL_NAME = "PAY54_PREVIEW_EXECUTION_GATE";

  if (W[GLOBAL_NAME] !== undefined) {
    const existing = W[GLOBAL_NAME];

    if (
      existing?.version === VERSION &&
      typeof existing.evaluate === "function" &&
      typeof existing.health === "function"
    ) {
      console.info(
        "[PAY54_PREVIEW_GATE] Existing instance retained."
      );
      return;
    }

    throw new Error(
      "[PAY54_PREVIEW_GATE] Incompatible instance."
    );
  }

  const BOUNDARY = W.PAY54_DEPLOYMENT_BOUNDARY;

  if (
    !BOUNDARY ||
    typeof BOUNDARY.assess !== "function"
  ) {
    throw new Error(
      "[PAY54_PREVIEW_GATE] Deployment Boundary unavailable."
    );
  }

  const BLOCKED_ACTIONS = Object.freeze([
    "send",
    "receive",
    "scan_pay",
    "add_money",
    "withdraw",
    "bank_transfer",
    "fx",
    "bills",
    "savings",
    "cards",
    "checkout",
    "merchantqr",
    "request",
    "trading",
    "bet",
    "agent"
  ]);

  const BLOCKED_ACTION_SET = new Set(
    BLOCKED_ACTIONS
  );

  /*
   * These selectors protect known controls within existing
   * modals that can execute or initiate local financial writes.
   *
   * This is deliberately not presented as exhaustive
   * transaction-security coverage.
   */

  const BLOCKED_CONTROL_SELECTORS = Object.freeze([
    "#addMoneyBtn",
    "#withdrawBtn",
    "#scanPayFab",
    "#approveCheckoutBtn",
    "#payBillBtn",
    "#addMoneyGoalBtn",
    "#withdrawGoalBtn",
    "#submitAgentBtn",
    ".approveReq",
    ".tradeBuyBtn",
    ".tradeSellBtn"
  ]);

  const BLOCKED_CONTROL_QUERY =
    BLOCKED_CONTROL_SELECTORS.join(",");

  let installed = false;
  let blockedCount = 0;
  let lastBlocked = null;

  function isPublicPreview() {
    try {
      const result = BOUNDARY.assess();

      return (
        result?.classification ===
          "PUBLIC_DEVELOPMENT_PREVIEW" &&
        result?.publicPreviewHost === true
      );
    } catch {
      return true;
    }
  }

  function evaluate(action) {
    const normalized =
      typeof action === "string"
        ? action.trim()
        : "";

    const preview = isPublicPreview();

    const blocked = (
      preview &&
      BLOCKED_ACTION_SET.has(normalized)
    );

    return Object.freeze({
      action: normalized,
      publicPreview: preview,
      blocked,
      reason: blocked
        ? "PUBLIC_PREVIEW_FINANCIAL_ACTION"
        : "NOT_BLOCKED_BY_THIS_GATE",
      financialExecutionAuthorized: false
    });
  }

  function resolveControl(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const actionElement = target.closest(
      "[data-action]"
    );

    if (actionElement) {
      const action =
        actionElement.getAttribute("data-action");

      if (BLOCKED_ACTION_SET.has(action)) {
        return {
          element: actionElement,
          action
        };
      }
    }

    const control = target.closest(
      BLOCKED_CONTROL_QUERY
    );

    if (!control) {
      return null;
    }

    return {
      element: control,
      action: control.id || "FINANCIAL_CONTROL"
    };
  }

  function showBlockedMessage() {
    const message =
      "Financial actions are unavailable on " +
      "this public PAY54 development preview.";

    try {
      if (
        typeof W.PAY54_TOAST?.showToast ===
        "function"
      ) {
        W.PAY54_TOAST.showToast(message);
        return;
      }
    } catch {
      // Continue to accessible live announcement.
    }

    let notice = D.getElementById(
      "pay54-preview-action-status"
    );

    if (!notice) {
      notice = D.createElement("div");
      notice.id = "pay54-preview-action-status";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");

      Object.assign(notice.style, {
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "12px",
        zIndex: "2147483000",
        padding: "12px 16px",
        borderRadius: "10px",
        backgroundColor: "#14213d",
        color: "#ffffff",
        fontSize: "14px",
        lineHeight: "1.5",
        boxShadow: "0 4px 24px rgba(0,0,0,.2)",
        pointerEvents: "none"
      });

      D.body.appendChild(notice);
    }

    notice.textContent = message;
  }

  function intercept(event) {
    if (!isPublicPreview()) {
      return;
    }

    const control = resolveControl(
      event.target
    );

    if (!control) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    blockedCount += 1;

    lastBlocked = Object.freeze({
      action: control.action,
      occurredAt: new Date().toISOString()
    });

    showBlockedMessage();
  }

  function install() {
    if (installed) {
      return;
    }

    /*
     * Capture phase runs before ordinary dashboard
     * click handlers, including delegated handlers.
     *
     * Only known financial actions are intercepted.
     */
    D.addEventListener(
      "click",
      intercept,
      true
    );

    installed = true;

    console.info(
      "[PAY54_PREVIEW_GATE] v1.0.0 installed."
    );
  }

  function health() {
    const preview = isPublicPreview();

    return Object.freeze({
      version: VERSION,
      installed,
      publicPreview: preview,
      blockingActive: installed && preview,
      blockedActionCount: BLOCKED_ACTIONS.length,
      blockedControlCount:
        BLOCKED_CONTROL_SELECTORS.length,
      interceptedClicks: blockedCount,
      lastBlocked,
      serverEnforcementIntegrated: false,
      financialExecutionAuthorized: false,
      financialStorageWrites: 0
    });
  }

  const API = Object.freeze({
    version: VERSION,
    evaluate,
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
