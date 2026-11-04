
/* ==========================================================================
   PAY54 ENTERPRISE DASHBOARD BLUEPRINT BOOT
   File: assets/js/dashboard-blueprint-boot.js
   Version: 1.0.0

   Responsibilities:
   - Mark the approved dashboard as pending before first paint
   - Prevent the old dashboard from briefly appearing
   - Provide a bounded fallback if the presentation layer fails
   - Never modify wallet, cards, transaction or ledger data

   This file must load synchronously in the document HEAD.
   ========================================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const ROOT_CLASS = "p54b-boot-pending";
  const MAXIMUM_WAIT_MS = 8000;

  const root = document.documentElement;

  if (window.PAY54_DASHBOARD_BLUEPRINT_BOOT) {
    return;
  }

  let state = "PENDING";
  let fallbackTimer = null;

  const release = (reason = "ready") => {
    if (state !== "PENDING") {
      return false;
    }

    state = reason === "ready"
      ? "READY"
      : "FALLBACK";

    root.classList.remove(ROOT_CLASS);

    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (state === "FALLBACK") {
      console.warn(
        "[PAY54 BLUEPRINT BOOT] Approved presentation did not initialise. Existing dashboard remains accessible.",
        reason
      );
    }

    return true;
  };

  const health = () => Object.freeze({
    version: VERSION,
    state,
    pending: state === "PENDING",
    ready: state === "READY",
    fallback: state === "FALLBACK",
    blueprintVersion:
      root.dataset.pay54Blueprint ?? null
  });

  Object.defineProperty(
    window,
    "PAY54_DASHBOARD_BLUEPRINT_BOOT",
    {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.freeze({
        version: VERSION,
        release,
        health
      })
    }
  );

  root.classList.add(ROOT_CLASS);

  fallbackTimer = setTimeout(() => {
    if (
      root.dataset.pay54Blueprint &&
      document.body?.classList.contains(
        "p54-blueprint"
      )
    ) {
      release("ready");
    } else {
      release("startup-timeout");
    }
  }, MAXIMUM_WAIT_MS);

  window.addEventListener(
    "pageshow",
    () => {
      if (
        state === "PENDING" &&
        root.dataset.pay54Blueprint &&
        document.body?.classList.contains(
          "p54-blueprint"
        )
      ) {
        release("ready");
      }
    }
  );

  console.info(
    `[PAY54 BLUEPRINT BOOT] v${VERSION} initialised.`
  );
})();
