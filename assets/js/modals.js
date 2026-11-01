
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE MODAL ENGINE
   File: assets/js/modals.js
   Version: 11.1.0
   Work Package: WP-TITAN-MODALS-001

   Responsibilities:
   - Maintain backward-compatible PAY54 modal APIs
   - Provide accessible dialog semantics
   - Set and contain keyboard focus
   - Restore focus on dismissal
   - Support stacked dialogs safely
   - Handle Escape for the topmost dialog only
   - Clean up every modal through one lifecycle
   - Preserve Enterprise Event Bus notifications

   Security:
   - Modal titles are rendered as text
   - bodyHTML is trusted application markup
   - User-supplied values must be escaped or sanitised
     by the calling module before constructing bodyHTML
   - This module does not execute financial operations
========================================================================== */

(() => {
  const GLOBAL = window;
  const DOCUMENT = document;
  const VERSION = "11.1.0";

  const MODAL_EVENTS = Object.freeze({
    OPENED: "modal.opened",
    CLOSED: "modal.closed",
    ERROR: "modal.error",
    SERVICE_CLOSED: "services.closed"
  });

  const FOCUS_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
    "[contenteditable='true']"
  ].join(",");

  const stack = [];
  let nextId = 0;
  let keyboardListenerInstalled = false;

  function publishModalEvent(eventName, payload = {}) {
    try {
      const events = GLOBAL.PAY54_EVENTS;

      if (typeof events?.publish === "function") {
        events.publish(eventName, payload, {
          source: "modals"
        });
      }
    } catch (error) {
      console.error(
        "[PAY54_MODALS] Event publication failed:",
        eventName,
        error
      );
    }
  }

  function topModal() {
    return stack.length
      ? stack[stack.length - 1]
      : null;
  }

  function isVisible(element) {
    if (
      !(element instanceof HTMLElement) ||
      !element.isConnected ||
      element.hidden ||
      element.closest("[hidden], [inert]")
    ) {
      return false;
    }

    const style = GLOBAL.getComputedStyle(element);

    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      element.getClientRects().length > 0
    );
  }

  function focusableElements(modal) {
    return Array.from(
      modal.querySelectorAll(FOCUS_SELECTOR)
    ).filter(element => (
      isVisible(element) &&
      element.tabIndex >= 0 &&
      element.getAttribute("aria-disabled") !== "true"
    ));
  }

  function focusElement(element) {
    if (
      !element ||
      typeof element.focus !== "function" ||
      !element.isConnected
    ) {
      return false;
    }

    try {
      element.focus({
        preventScroll: true
      });

      return DOCUMENT.activeElement === element;
    } catch (error) {
      console.warn(
        "[PAY54_MODALS] Focus could not be assigned.",
        error
      );
      return false;
    }
  }

  function focusInitial(record) {
    if (
      !record ||
      record.closed ||
      topModal() !== record
    ) {
      return;
    }

    const modal = record.modal;

    if (modal.contains(DOCUMENT.activeElement)) {
      return;
    }

    const preferred = modal.querySelector(
      "[autofocus]:not([disabled])"
    );

    if (isVisible(preferred) && focusElement(preferred)) {
      return;
    }

    const title = modal.querySelector(
      ".p54-modal-title"
    );

    if (title && focusElement(title)) {
      return;
    }

    const available = focusableElements(modal);

    if (available.length && focusElement(available[0])) {
      return;
    }

    focusElement(modal);
  }

  function updateModalStack() {
    const active = topModal();

    stack.forEach(record => {
      const isTop = record === active;

      record.backdrop.setAttribute(
        "data-modal-active",
        isTop ? "true" : "false"
      );

      record.modal.setAttribute(
        "aria-modal",
        isTop ? "true" : "false"
      );

      if (isTop) {
        record.modal.removeAttribute("aria-hidden");
      } else {
        record.modal.setAttribute(
          "aria-hidden",
          "true"
        );
      }
    });

    const anyOpen = stack.length > 0;

    DOCUMENT.body.classList.toggle(
      "modal-open",
      anyOpen
    );

    DOCUMENT.documentElement.classList.toggle(
      "modal-open",
      anyOpen
    );

    if (anyOpen && !keyboardListenerInstalled) {
      DOCUMENT.addEventListener(
        "keydown",
        handleGlobalKeydown,
        true
      );

      keyboardListenerInstalled = true;
    } else if (
      !anyOpen &&
      keyboardListenerInstalled
    ) {
      DOCUMENT.removeEventListener(
        "keydown",
        handleGlobalKeydown,
        true
      );

      keyboardListenerInstalled = false;
    }
  }

  function restoreFocus(record) {
    const active = topModal();

    if (active) {
      if (
        record.previouslyFocused &&
        active.modal.contains(record.previouslyFocused) &&
        focusElement(record.previouslyFocused)
      ) {
        return;
      }

      focusInitial(active);
      return;
    }

    if (focusElement(record.previouslyFocused)) {
      return;
    }

    const trigger = DOCUMENT.querySelector(
      '[data-action="cards"]'
    );

    if (
      record.title.toLowerCase().includes("card") &&
      trigger &&
      focusElement(trigger)
    ) {
      return;
    }
  }

  function closeRecord(record, options = {}) {
    if (!record || record.closed) {
      return false;
    }

    record.closed = true;

    const position = stack.indexOf(record);

    if (position !== -1) {
      stack.splice(position, 1);
    }

    if (record.backdrop.isConnected) {
      record.backdrop.remove();
    }

    updateModalStack();

    const closedAt = new Date().toISOString();

    publishModalEvent(MODAL_EVENTS.CLOSED, {
      title: record.title,
      closedAt
    });

    publishModalEvent(
      MODAL_EVENTS.SERVICE_CLOSED,
      {
        service: record.title,
        closedAt
      }
    );

    if (options.restoreFocus !== false) {
      restoreFocus(record);
    }

    return true;
  }

  function handleGlobalKeydown(event) {
    const active = topModal();

    if (!active || active.closed) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();

      closeRecord(active);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const modal = active.modal;
    const elements = focusableElements(modal);

    if (!elements.length) {
      event.preventDefault();
      focusElement(modal);
      return;
    }

    const first = elements[0];
    const last = elements[elements.length - 1];
    const focused = DOCUMENT.activeElement;
    const inside = modal.contains(focused);

    if (!inside) {
      event.preventDefault();

      focusElement(
        event.shiftKey ? last : first
      );
      return;
    }

    if (event.shiftKey && focused === first) {
      event.preventDefault();
      focusElement(last);
      return;
    }

    if (!event.shiftKey && focused === last) {
      event.preventDefault();
      focusElement(first);
      return;
    }

    if (
      focused === modal ||
      focused.classList?.contains(
        "p54-modal-title"
      )
    ) {
      event.preventDefault();

      focusElement(
        event.shiftKey ? last : first
      );
    }
  }

  function openModal(options = {}) {
    const {
      title = "",
      bodyHTML = "",
      onMount
    } = options;

    const normalizedTitle = String(title ?? "");

    if (
      typeof bodyHTML !== "string"
    ) {
      throw new TypeError(
        "[PAY54_MODALS] bodyHTML must be a string."
      );
    }

    nextId += 1;

    const id = `pay54-modal-${nextId}`;
    const titleId = `${id}-title`;

    const previousFocus = DOCUMENT.activeElement;

    const backdrop = DOCUMENT.createElement("div");
    backdrop.className = "p54-modal-backdrop";

    const modal = DOCUMENT.createElement("div");
    modal.className = "p54-modal";

    modal.setAttribute(
      "role",
      "dialog"
    );

    modal.setAttribute(
      "aria-modal",
      "true"
    );

    modal.setAttribute(
      "aria-labelledby",
      titleId
    );

    modal.setAttribute(
      "tabindex",
      "-1"
    );

    const head = DOCUMENT.createElement("div");
    head.className = "p54-modal-head";

    const titleElement = DOCUMENT.createElement("div");
    titleElement.className = "p54-modal-title";
    titleElement.id = titleId;
    titleElement.tabIndex = -1;
    titleElement.textContent = normalizedTitle;

    const closeButton = DOCUMENT.createElement("button");
    closeButton.className = "p54-x";
    closeButton.type = "button";
    closeButton.textContent = "✕";

    closeButton.setAttribute(
      "aria-label",
      "Close dialog"
    );

    const body = DOCUMENT.createElement("div");
    body.className = "p54-modal-body";

    /*
     * bodyHTML preserves the established PAY54 API.
     * Callers must sanitise untrusted input.
     */
    body.innerHTML = bodyHTML;

    head.append(
      titleElement,
      closeButton
    );

    modal.append(
      head,
      body
    );

    backdrop.appendChild(modal);

    const record = {
      id,
      title: normalizedTitle,
      backdrop,
      modal,
      previouslyFocused: previousFocus,
      closed: false
    };

    function close() {
      return closeRecord(record);
    }

    closeButton.addEventListener(
      "click",
      close
    );

    backdrop.addEventListener(
      "click",
      event => {
        if (
          event.target === backdrop &&
          topModal() === record
        ) {
          close();
        }
      }
    );

    stack.push(record);

    DOCUMENT.body.appendChild(backdrop);

    updateModalStack();

    publishModalEvent(
      MODAL_EVENTS.OPENED,
      {
        title: normalizedTitle,
        openedAt: new Date().toISOString()
      }
    );

    if (typeof onMount === "function") {
      try {
        onMount({
          modal,
          close
        });
      } catch (error) {
        publishModalEvent(
          MODAL_EVENTS.ERROR,
          {
            title: normalizedTitle,
            error:
              error?.message || String(error),
            occurredAt: new Date().toISOString()
          }
        );

        console.error(
          "[PAY54_MODALS] Modal mount failed.",
          error
        );
      }
    }

    /*
     * Focus after onMount so application components
     * have finished attaching their controls.
     */
    GLOBAL.queueMicrotask(() => {
      focusInitial(record);
    });

    return {
      close
    };
  }

  function closeAllModals() {
    while (stack.length > 0) {
      const record = topModal();

      closeRecord(record, {
        restoreFocus: false
      });
    }

    updateModalStack();
  }

  function health() {
    return Object.freeze({
      version: VERSION,
      activeModalCount: stack.length,
      keyboardListenerInstalled,
      topModalTitle:
        topModal()?.title ?? null,
      healthy:
        stack.every(
          record =>
            !record.closed &&
            record.backdrop.isConnected
        )
    });
  }

  const api = Object.freeze({
    version: VERSION,
    openModal,
    health
  });

  GLOBAL.PAY54_MODALS = api;

  GLOBAL.openModal = openModal;

  GLOBAL.closeAllModals = closeAllModals;

  console.info(
    `[PAY54_MODALS] Enterprise Modal Engine v${VERSION} ready.`
  );
})();
