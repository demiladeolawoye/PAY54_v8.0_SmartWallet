"use strict";

/* ==========================================================================
   PAY54 Account Context Selector — v1.0.0
   Presentation-only controller for the authenticated dashboard.
   Financial account switching is deliberately unavailable until a trusted
   backend exposes authorised account enumeration, verified account change,
   token/session scope, audit and cross-tenant cache isolation.
   This module does not manufacture a Business account, modify account IDs,
   access storage, update wallet balances or call payment services.
   ========================================================================== */
(() => {
  "use strict";

  const KEY = "PAY54_ACCOUNT_CONTEXT_SELECTOR";
  if (Object.prototype.hasOwnProperty.call(window, KEY)) return;

  const state = { mounted: false, open: false };
  let root = null;
  let trigger = null;
  let panel = null;
  let onDocumentPointer = null;
  let onDocumentKey = null;

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  function authenticated() {
    try {
      return window.PAY54_SECURITY?.session?.isAuthenticated?.() === true;
    } catch {
      return false;
    }
  }

  function setOpen(value, restoreFocus = false) {
    if (!panel || !trigger) return;
    state.open = value === true;
    panel.hidden = !state.open;
    trigger.setAttribute("aria-expanded", String(state.open));
    if (!state.open && restoreFocus) trigger.focus();
  }

  function build() {
    const shell = make("div", "p54b-account-context");
    const button = make("button", "p54b-account-context-trigger");
    button.type = "button";
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");

    const glyph = make("span", "p54b-account-context-glyph", "◉");
    glyph.setAttribute("aria-hidden", "true");
    const content = make("span", "p54b-account-context-labels");
    const name = make("span", "p54b-account-context-name",
      authenticated() ? "Personal account" : "Account unavailable");
    const context = make("span", "p54b-account-context-caption",
      authenticated() ? "Active account" : "Sign in required");
    content.append(name, context);
    const chevron = make("span", "p54b-account-context-chevron", "⌄");
    chevron.setAttribute("aria-hidden", "true");
    button.append(glyph, content, chevron);

    const menu = make("div", "p54b-account-context-menu");
    menu.hidden = true;
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", "PAY54 account contexts");

    const heading = make("p", "p54b-account-context-heading", "Your accounts");
    const personal = make("div", "p54b-account-context-choice");
    personal.append(
      make("span", "p54b-account-context-choice-title", "Personal"),
      make("span", "p54b-account-context-state",
        authenticated() ? "Current" : "Sign in required")
    );

    const business = make("div", "p54b-account-context-choice is-unavailable");
    business.setAttribute("aria-disabled", "true");
    business.append(
      make("span", "p54b-account-context-choice-title", "Business"),
      make("span", "p54b-account-context-state", "Not connected")
    );

    const notice = make("p", "p54b-account-context-notice",
      "Business switching becomes available only after verified account access is connected.");
    menu.append(heading, personal, business, notice);
    shell.append(button, menu);
    return { shell, button, menu };
  }

  function mount({ headerActions, sidebarFooter } = {}) {
    if (state.mounted) return false;
    if (!(headerActions instanceof Element)) return false;
    const { shell, button, menu } = build();
    const profile = headerActions.querySelector(".profile-wrap");
    if (profile) headerActions.insertBefore(shell, profile);
    else headerActions.append(shell);

    root = shell;
    trigger = button;
    panel = menu;

    if (sidebarFooter instanceof Element) {
      const status = make("div", "p54b-account-sidebar-status");
      status.textContent = authenticated()
        ? "◉ Personal account · Active"
        : "Account status unavailable";
      sidebarFooter.prepend(status);
    }

    button.addEventListener("click", () => setOpen(!state.open));
    onDocumentPointer = event => {
      if (state.open && !shell.contains(event.target)) setOpen(false);
    };
    onDocumentKey = event => {
      if (state.open && event.key === "Escape") setOpen(false, true);
    };
    document.addEventListener("pointerdown", onDocumentPointer);
    document.addEventListener("keydown", onDocumentKey);
    state.mounted = true;
    return true;
  }

  function health() {
    return Object.freeze({
      version: "1.0.0",
      mounted: state.mounted,
      menuOpen: state.open,
      serverSwitchVerified: false,
      businessContextAvailable: false,
      accountSwitchExecuted: false
    });
  }

  Object.defineProperty(window, KEY, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ version: "1.0.0", mount, health })
  });
})();
