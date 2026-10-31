
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — CARDS ROUTE BRIDGE
   File: assets/js/engine/cards-route-bridge.js
   Version: 1.0.0
   Work Package: WP-TITAN-CARDS-001D.5

   Responsibilities:
   - Connect legacy dashboard routing to enterprise Cards UI.
   - Prevent dashboard access to the obsolete card implementation.
   - Provide accessible session-expiry guidance.
   - Preserve Titan authentication and repository safeguards.

   This module performs no financial or repository writes.
========================================================================== */

(() => {
  "use strict";

  const GLOBAL = window;

  const MODULE_NAME = "PAY54 Enterprise Cards Route Bridge";
  const VERSION = "1.0.0";

  const UI = GLOBAL.PAY54_UI ||
    (GLOBAL.PAY54_UI = {});

  const CARDS_UI = GLOBAL.PAY54_CARDS_UI;
  const CARDS = GLOBAL.PAY54_CARDS;
  const SECURITY = GLOBAL.PAY54_SECURITY;

  const state = {
    installed: false,
    routingCount: 0,
    blockedCount: 0,
    lastError: null
  };

  function getSession() {
    return GLOBAL.PAY54_SECURITY?.session || null;
  }

  function isAuthenticated() {
    try {
      const session = getSession();

      return (
        typeof session?.isAuthenticated === "function" &&
        session.isAuthenticated() === true
      );
    } catch (error) {
      state.lastError = error?.message || String(error);
      return false;
    }
  }

  function getRepositoryState() {
    try {
      const engine = GLOBAL.PAY54_CARDS;

      if (
        typeof engine?.getCardRepositoryStatus !== "function"
      ) {
        return "UNAVAILABLE";
      }

      return engine.getCardRepositoryStatus()?.state ||
        "UNKNOWN";
    } catch (error) {
      state.lastError = error?.message || String(error);
      return "ERROR";
    }
  }

  function getLoginURL() {
    return new URL(
      "login.html",
      GLOBAL.location.href
    ).href;
  }

  function showSessionExpired() {
    const modalEngine = GLOBAL.PAY54_MODALS;

    if (
      typeof modalEngine?.openModal !== "function"
    ) {
      console.warn(
        "[PAY54_CARDS_ROUTE] Session expired. " +
        "Please sign in again."
      );

      GLOBAL.location.assign(getLoginURL());
      return;
    }

    modalEngine.openModal({
      title: "Session Expired",

      bodyHTML: `
        <div class="p54-form"
             role="group"
             aria-label="Session expired">

          <p>
            Your PAY54 session has expired.
          </p>

          <p>
            For your security, card management
            requires an active authenticated session.
          </p>

          <p>
            Please sign in again to continue.
          </p>

          <div class="p54-actions">
            <button
              type="button"
              class="p54-btn primary"
              id="pay54CardsSignInAgain">
              Sign In Again
            </button>

            <button
              type="button"
              class="p54-btn"
              id="pay54CardsCloseNotice">
              Close
            </button>
          </div>

        </div>
      `,

      onMount: ({ modal, close }) => {
        const signIn = modal.querySelector(
          "#pay54CardsSignInAgain"
        );

        const closeButton = modal.querySelector(
          "#pay54CardsCloseNotice"
        );

        signIn?.addEventListener(
          "click",
          () => {
            GLOBAL.location.assign(
              getLoginURL()
            );
          }
        );

        closeButton?.addEventListener(
          "click",
          () => {
            close();
          }
        );

        signIn?.focus();
      }
    });
  }

  function showRepositoryUnavailable(repositoryState) {
    const message =
      `Card repository unavailable (${repositoryState}). ` +
      "No card operation has been performed.";

    console.error(
      "[PAY54_CARDS_ROUTE]",
      message
    );

    if (
      typeof GLOBAL.PAY54_MODALS?.openModal !== "function"
    ) {
      if (
        typeof GLOBAL.PAY54_TOAST?.showToast === "function"
      ) {
        GLOBAL.PAY54_TOAST.showToast(message);
      }

      return;
    }

    GLOBAL.PAY54_MODALS.openModal({
      title: "Cards Temporarily Unavailable",

      bodyHTML: `
        <div class="p54-form">
          <p role="alert">
            PAY54 cannot safely access your
            card repository at this time.
          </p>

          <p>
            Your existing card information has
            not been changed.
          </p>

          <p>
            Please contact PAY54 support
            if this problem continues.
          </p>

          <div class="p54-actions">
            <button
              type="button"
              class="p54-btn primary"
              id="pay54CardsUnavailableClose">
              Close
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        modal.querySelector(
          "#pay54CardsUnavailableClose"
        )?.addEventListener(
          "click",
          close
        );
      }
    });
  }

  function openEnterpriseCards() {
    state.routingCount += 1;

    if (!isAuthenticated()) {
      state.blockedCount += 1;

      showSessionExpired();
      return false;
    }

    const repositoryState =
      getRepositoryState();

    if (repositoryState !== "VALID") {
      state.blockedCount += 1;

      showRepositoryUnavailable(repositoryState);
      return false;
    }

    const cardsUI = GLOBAL.PAY54_CARDS_UI;

    if (
      typeof cardsUI?.openCards !== "function"
    ) {
      state.blockedCount += 1;

      state.lastError =
        "Enterprise Cards UI is unavailable.";

      console.error(
        "[PAY54_CARDS_ROUTE]",
        state.lastError
      );

      GLOBAL.PAY54_TOAST?.showToast?.(
        "Cards are temporarily unavailable."
      );

      return false;
    }

    try {
      cardsUI.openCards();
      return true;
    } catch (error) {
      state.blockedCount += 1;

      state.lastError =
        error?.message || String(error);

      console.error(
        "[PAY54_CARDS_ROUTE] Unable to open Cards UI.",
        error
      );

      GLOBAL.PAY54_TOAST?.showToast?.(
        "Unable to open card management."
      );

      return false;
    }
  }

  function health() {
    return Object.freeze({
      name: MODULE_NAME,
      version: VERSION,
      installed: state.installed,
      authenticated: isAuthenticated(),
      repositoryState: getRepositoryState(),

      enterpriseUIAvailable:
        typeof GLOBAL.PAY54_CARDS_UI?.openCards ===
        "function",

      canonicalRouteInstalled:
        GLOBAL.PAY54_UI?.openCards ===
        openEnterpriseCards,

      routingCount: state.routingCount,
      blockedCount: state.blockedCount,
      lastError: state.lastError
    });
  }

  function install() {
    if (
      !CARDS_UI ||
      typeof CARDS_UI.openCards !== "function"
    ) {
      throw new Error(
        "[PAY54_CARDS_ROUTE] " +
        "Enterprise Cards UI must load before route bridge."
      );
    }

    if (
      !CARDS ||
      typeof CARDS.getCardRepositoryStatus !==
      "function"
    ) {
      throw new Error(
        "[PAY54_CARDS_ROUTE] " +
        "Enterprise Cards Engine is unavailable."
      );
    }

    if (
      !SECURITY ||
      typeof SECURITY.session?.isAuthenticated !==
      "function"
    ) {
      throw new Error(
        "[PAY54_CARDS_ROUTE] " +
        "Titan session manager is unavailable."
      );
    }

    const existing =
      GLOBAL.PAY54_CARDS_ROUTE;

    if (existing) {
      if (
        existing.version === VERSION &&
        existing.health?.().canonicalRouteInstalled
      ) {
        console.info(
          "[PAY54_CARDS_ROUTE] Existing route bridge preserved."
        );
        return;
      }

      throw new Error(
        "[PAY54_CARDS_ROUTE] " +
        "An incompatible route bridge already exists."
      );
    }

    /*
     * Dashboard-core.js routes:
     *
     *   case "cards":
     *     return PAY54_UI.openCards?.();
     *
     * Replace the obsolete implementation's entry point.
     *
     * The legacy card functions remain in the existing
     * source file but are no longer exposed by this route.
     */

    UI.openCards = openEnterpriseCards;

    state.installed = true;

    GLOBAL.PAY54_CARDS_ROUTE =
      Object.freeze({
        version: VERSION,
        openCards: openEnterpriseCards,
        health
      });

    if (
      UI.openCards !== openEnterpriseCards
    ) {
      throw new Error(
        "[PAY54_CARDS_ROUTE] " +
        "Cards route installation verification failed."
      );
    }

    console.info(
      `[PAY54_CARDS_ROUTE] ${MODULE_NAME} ` +
      `v${VERSION} installed.`
    );
  }

  install();
})();
