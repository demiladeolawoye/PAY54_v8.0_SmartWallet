
/* ==========================================================================
   PAY54 ENTERPRISE — DASHBOARD CURRENCY PRESENTATION
   File: assets/js/dashboard-currency-presentation.js
   Version: 1.0.0

   Responsibilities
   ----------------
   - Reuse the canonical currency-pill DOM and existing event handlers
   - Place currency pills in the desktop dashboard header
   - Place the same pills below the mobile greeting
   - Preserve all configured currencies, including ZAR
   - Leave the existing currency dropdown available to the engine
     while removing it from the approved visual presentation
   - Never modify balances, transactions, storage or financial state
   ========================================================================== */

(() => {
  "use strict";

  const VERSION = "1.0.0";
  const MOBILE_QUERY = "(max-width: 760px)";

  if (window.PAY54_DASHBOARD_CURRENCY_PRESENTATION) {
    return;
  }

  let mounted = false;
  let location = "UNMOUNTED";
  let mediaQuery = null;
  let pills = null;
  let header = null;
  let mobileSlot = null;

  const getCurrencies = () => {
    if (!pills) return [];

    return Array.from(
      pills.querySelectorAll("button[data-cur]")
    ).map(button => button.dataset.cur);
  };

  const placePills = () => {
    if (!mounted || !pills || !header || !mobileSlot) {
      return false;
    }

    if (mediaQuery.matches) {
      if (pills.parentElement !== mobileSlot) {
        mobileSlot.appendChild(pills);
      }

      location = "MOBILE";
    } else {
      const actions = header.querySelector(".header-actions");

      if (pills.parentElement !== header) {
        header.insertBefore(pills, actions || null);
      } else if (actions && pills.nextElementSibling !== actions) {
        header.insertBefore(pills, actions);
      }

      location = "DESKTOP";
    }

    pills.setAttribute(
      "aria-label",
      "Select wallet display currency"
    );

    pills.dataset.presentationLocation =
      location.toLowerCase();

    return true;
  };

  const health = () => Object.freeze({
    version: VERSION,
    mounted,
    location,
    currencies: getCurrencies(),
    currencyCount: getCurrencies().length,
    zarPresent: getCurrencies().includes("ZAR"),
    duplicateDropdownVisible: (() => {
      const dropdown = document.querySelector(
        ".dash-header .currency-dd-wrap"
      );

      return Boolean(
        dropdown &&
        getComputedStyle(dropdown).display !== "none"
      );
    })()
  });

  const mount = () => {
    if (mounted) return true;

    if (!document.body?.classList.contains("p54-blueprint")) {
      return false;
    }

    header = document.querySelector(".dash-header");
    mobileSlot = document.querySelector(
      ".p54b-mobile-currencies"
    );

    pills = document.querySelector(
      ".currency-pills"
    );

    if (!header || !mobileSlot || !pills) {
      console.warn(
        "[PAY54 CURRENCY PRESENTATION] Required UI nodes unavailable."
      );

      return false;
    }

    mediaQuery = window.matchMedia(MOBILE_QUERY);

    mounted = true;

    placePills();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", placePills);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(placePills);
    }

    console.info(
      `[PAY54 CURRENCY PRESENTATION] v${VERSION} mounted.`,
      {
        location,
        currencies: getCurrencies()
      }
    );

    return true;
  };

  Object.defineProperty(
    window,
    "PAY54_DASHBOARD_CURRENCY_PRESENTATION",
    {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.freeze({
        version: VERSION,
        health
      })
    }
  );

  if (!mount()) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      { once: true }
    );
  }
})();
