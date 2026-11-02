
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE PREVIEW CLAIMS GUARD
   File: assets/js/core/preview-claims-guard.js
   Version: 1.0.0
   Work Package: WP-P54-ARCH-007C

   Purpose:
   - Remove unsupported claims from public development previews.
   - Identify displayed financial information as demonstration data.
   - Preserve existing financial engines, balances and interactions.
   - Never write to financial repositories or browser storage.

   This is a presentation safeguard, not an authorisation control.
========================================================================== */

(() => {
  "use strict";

  const W = window;
  const D = document;

  const VERSION = "1.0.0";
  const GLOBAL_NAME = "PAY54_PREVIEW_CLAIMS_GUARD";

  if (W[GLOBAL_NAME] !== undefined) {
    const existing = W[GLOBAL_NAME];

    if (
      existing?.version === VERSION &&
      typeof existing.apply === "function" &&
      typeof existing.health === "function"
    ) {
      return;
    }

    throw new Error(
      "[PAY54_CLAIMS] Incompatible claims guard already installed."
    );
  }

  const BOUNDARY = W.PAY54_DEPLOYMENT_BOUNDARY;

  if (
    !BOUNDARY ||
    typeof BOUNDARY.assess !== "function"
  ) {
    throw new Error(
      "[PAY54_CLAIMS] Deployment Boundary must load first."
    );
  }

  const RULES = Object.freeze([
    Object.freeze({
      selector: ".balance-delta",
      text: "Demonstration balances — not real funds"
    }),
    Object.freeze({
      selector: ".identity",
      text: "Demo account · Identity verification not active"
    }),
    Object.freeze({
      selector: ".trust-chip",
      text: "Development preview · No regulated status implied"
    })
  ]);

  let appliedCount = 0;
  let lastResult = null;

  function isPublicPreview() {
    try {
      const assessment = BOUNDARY.assess();

      return (
        assessment?.classification ===
        "PUBLIC_DEVELOPMENT_PREVIEW" &&
        assessment?.publicPreviewHost === true
      );
    } catch {
      return false;
    }
  }

  function apply() {
    if (!isPublicPreview()) {
      lastResult = Object.freeze({
        applied: false,
        reason: "NOT_PUBLIC_DEVELOPMENT_PREVIEW",
        elementsUpdated: 0
      });

      return lastResult;
    }

    let updated = 0;
    let found = 0;

    for (const rule of RULES) {
      const elements = D.querySelectorAll(
        rule.selector
      );

      for (const element of elements) {
        found += 1;

        if (element.textContent !== rule.text) {
          element.textContent = rule.text;
          updated += 1;
        }
      }
    }

    appliedCount += updated;

    lastResult = Object.freeze({
      applied: true,
      reason: "PREVIEW_CLAIMS_NORMALISED",
      elementsFound: found,
      elementsUpdated: updated
    });

    return lastResult;
  }

  function inspect() {
    return Object.freeze(
      RULES.map(rule => {
        const element = D.querySelector(
          rule.selector
        );

        return Object.freeze({
          selector: rule.selector,
          present: element !== null,
          compliant:
            element?.textContent === rule.text
        });
      })
    );
  }

  function health() {
    return Object.freeze({
      version: VERSION,
      publicPreview: isPublicPreview(),
      rules: RULES.length,
      appliedCount,
      lastResult,
      claims: inspect(),
      financialStorageWrites: 0,
      financialExecutionAuthority: false
    });
  }

  const API = Object.freeze({
    version: VERSION,
    apply,
    inspect,
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

  function initialise() {
    apply();

    console.info(
      "[PAY54_CLAIMS] Preview claims guard v1.0.0 ready."
    );
  }

  if (D.readyState === "loading") {
    D.addEventListener(
      "DOMContentLoaded",
      initialise,
      { once: true }
    );
  } else {
    initialise();
  }
})();
