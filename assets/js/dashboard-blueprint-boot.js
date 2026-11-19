/* ==========================================================================
   PAY54 ENTERPRISE DASHBOARD FIRST-PAINT CONTROLLER
   File: assets/js/dashboard-blueprint-boot.js
   Version: 2.0.0

   The approved blueprint is the ONLY successful dashboard presentation.
   Keep the original markup available to the existing financial engines until
   the presentation-only adapter reuses the DOM and completes its mount.
   A failed mount reveals an accessible retry screen, NEVER the old layout.
   This controller loads synchronously in HEAD and does not touch finance,
   authentication, localStorage or session state.
   ========================================================================== */
(() => {
  "use strict";

  const VERSION = "2.0.0";
  const PENDING_CLASS = "p54b-boot-pending";
  const FAILED_CLASS = "p54b-boot-failed";
  const MAXIMUM_WAIT_MS = 8000;

  const root = document.documentElement;
  root.classList.add(PENDING_CLASS);

  if (window.PAY54_DASHBOARD_BLUEPRINT_BOOT) {
    return;
  }

  let state = "PENDING";
  let fallbackTimer = null;
  let lastFailureReason = null;

  function blueprintMounted() {
    return root.dataset.pay54Blueprint === "1.2.4" &&
      document.body?.classList.contains("p54-blueprint") === true &&
      document.querySelector(".p54b-shell .p54b-dashboard") !== null;
  }

  function clearWatchdog() {
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  }

  function release(reason = "ready") {
    if (state === "READY") {
      return false;
    }

    if (reason === "ready" && blueprintMounted()) {
      state = "READY";
      root.classList.remove(PENDING_CLASS, FAILED_CLASS);
      clearWatchdog();
      return true;
    }

    if (reason === "ready") {
      reason = "approved-blueprint-not-mounted";
    }

    if (state === "FAILED") {
      return false;
    }

    state = "FAILED";
    lastFailureReason = String(reason).slice(0, 80);
    root.classList.add(FAILED_CLASS);
    // The pending class stays in place until a verified blueprint mounts:
    // fail closed rather than allowing the legacy layout to become visible.
    clearWatchdog();

    console.warn(
      "[PAY54 BLUEPRINT BOOT] Approved dashboard unavailable; legacy view withheld.",
      lastFailureReason
    );
    return true;
  }

  function health() {
    return Object.freeze({
      version: VERSION,
      state,
      pending: state === "PENDING",
      ready: state === "READY",
      fallback: state === "FAILED",
      failureReason: lastFailureReason,
      blueprintVersion: root.dataset.pay54Blueprint ?? null
    });
  }

  Object.defineProperty(window, "PAY54_DASHBOARD_BLUEPRINT_BOOT", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ version: VERSION, release, health })
  });

  fallbackTimer = setTimeout(() => {
    release(blueprintMounted() ? "ready" : "startup-timeout");
  }, MAXIMUM_WAIT_MS);

  window.addEventListener("pageshow", () => {
    if (state !== "READY" && blueprintMounted()) {
      release("ready");
    }
  });

  console.info("[PAY54 BLUEPRINT BOOT] v2.0.0 initialised.");
})();
