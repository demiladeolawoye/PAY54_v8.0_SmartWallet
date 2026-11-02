
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE DEPLOYMENT BOUNDARY
   File: assets/js/core/deployment-boundary.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-007A

   Read-only deployment classification and visible preview disclosure.
   This module does not authenticate users, secure hosting, authorize funds,
   intercept transactions, or access financial storage.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const D = document;
  const VERSION = "1.0.0";
  const KEY = "PAY54_DEPLOYMENT_BOUNDARY";
  const NOTICE_ID = "pay54-deployment-preview-notice";
  const CONFIG = W.PAY54_CONFIG;

  if (W[KEY] !== undefined) {
    const existing = W[KEY];

    if (
      existing?.version === VERSION &&
      typeof existing.assess === "function" &&
      typeof existing.health === "function"
    ) {
      return;
    }

    throw new Error(
      "[PAY54_DEPLOYMENT] Incompatible deployment boundary already present."
    );
  }

  function hostname() {
    try {
      return String(
        W.location.hostname || ""
      ).toLowerCase();
    } catch {
      return "";
    }
  }

  function isPublicPreviewHost(host) {
    return (
      host === "github.io" ||
      host.endsWith(".github.io")
    );
  }

  function environmentName() {
    try {
      const name = CONFIG?.get?.(
        "environment.name",
        null
      );

      return typeof name === "string"
        ? name
        : null;
    } catch {
      return null;
    }
  }

  function assess() {
    const host = hostname();
    const publicPreviewHost = isPublicPreviewHost(host);
    const runtimeEnvironment = environmentName();

    let realMoneyMode = null;

    try {
      realMoneyMode = CONFIG?.get?.(
        "environment.realMoneyMode",
        null
      );
    } catch {
      realMoneyMode = null;
    }

    const classification = publicPreviewHost
      ? "PUBLIC_DEVELOPMENT_PREVIEW"
      : "UNVERIFIED_DEPLOYMENT";

    return Object.freeze({
      version: VERSION,
      host,
      classification,
      publicPreviewHost,
      runtimeEnvironment,
      realMoneyMode,
      accessControlVerified: false,
      regulatedStatusVerified: false,
      productionFinancialExecutionApproved: false,
      privateStagingVerified: false,
      authority: "INFORMATIONAL_CLIENT_ASSESSMENT"
    });
  }

  function renderNotice() {
    if (!D.body) {
      return false;
    }

    if (D.getElementById(NOTICE_ID)) {
      return true;
    }

    const notice = D.createElement("aside");

    notice.id = NOTICE_ID;
    notice.className = "pay54-preview-notice";

    notice.setAttribute(
      "role",
      "note"
    );

    notice.setAttribute(
      "aria-label",
      "PAY54 development preview notice"
    );

    const strong = D.createElement("strong");

    strong.textContent =
      "PAY54 development preview";

    const explanation =
      D.createElement("span");

    explanation.textContent =
      " This is a demonstration environment. " +
      "Displayed balances, transactions, cards, " +
      "partner features and regulatory indicators " +
      "are not evidence of a live financial service. " +
      "Do not enter real payment credentials " +
      "or transfer real funds.";

    notice.append(
      strong,
      explanation
    );

    D.body.insertBefore(
      notice,
      D.body.firstChild
    );

    return true;
  }

  function health() {
    const result = assess();

    return Object.freeze({
      version: VERSION,
      classification: result.classification,
      noticePresent: Boolean(
        D.getElementById(NOTICE_ID)
      ),
      noFinancialExecutionAuthority: true,
      publicPreviewHost: result.publicPreviewHost
    });
  }

  const API = Object.freeze({
    version: VERSION,
    assess,
    health
  });

  Object.defineProperty(
    W,
    KEY,
    {
      value: API,
      writable: false,
      configurable: false,
      enumerable: true
    }
  );

  const ready = () => {
    if (renderNotice()) {
      console.info(
        "[PAY54_DEPLOYMENT] Development preview disclosure active."
      );
    }
  };

  if (D.readyState === "loading") {
    D.addEventListener(
      "DOMContentLoaded",
      ready,
      { once: true }
    );
  } else {
    ready();
  }
})();
