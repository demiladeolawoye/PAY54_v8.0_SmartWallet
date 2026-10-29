
"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — VIRTUAL & LINKED CARDS UI
   File: assets/js/engine/cards-ui.js
   Version: 2.1.0
   Work package: WP-TITAN-CARDS-001D.3

   Development card records are not issuer-issued payment instruments.
   This UI neither stores PAN/CVV nor fabricates card credentials.
   Canonical persistence and security checks remain in PAY54_CARDS.
========================================================================== */

(() => {
  const GLOBAL = window;
  const UI = GLOBAL.PAY54_CARDS_UI || {};
  const MODULE = "PAY54 Cards UI";
  const VERSION = "2.1.0";

  function engine() {
    const value = GLOBAL.PAY54_CARDS;
    if (!value || typeof value.getCards !== "function" ||
        typeof value.getCardRepositoryStatus !== "function") {
      throw new Error("The PAY54 Cards Engine is unavailable.");
    }
    return value;
  }

  function modalEngine() {
    if (typeof GLOBAL.PAY54_MODALS?.openModal !== "function") {
      throw new Error("The PAY54 modal engine is unavailable.");
    }
    return GLOBAL.PAY54_MODALS;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function notify(message) {
    if (typeof GLOBAL.PAY54_TOAST?.showToast === "function") {
      GLOBAL.PAY54_TOAST.showToast(message);
    } else {
      console.info(`[PAY54_CARDS_UI] ${message}`);
    }
  }

  function report(error, fallback) {
    console.error(`[PAY54_CARDS_UI] ${fallback}`, error);
    notify(error?.message || fallback);
  }

  function requireSession() {
    const session = GLOBAL.PAY54_SECURITY?.session;
    if (session?.isAuthenticated?.() !== true) {
      throw new Error("Your session has ended. Please sign in again.");
    }
  }

  function requireWritableRepository(cardsEngine) {
    const status = cardsEngine.getCardRepositoryStatus();
    if (status?.state !== "VALID") {
      throw new Error(`Card operation blocked: repository state ${status?.state || "UNKNOWN"}.`);
    }
    return status;
  }

  function isDevelopmentEnvironment() {
    const config = GLOBAL.PAY54_CONFIG;
    return config?.isProduction?.() === false &&
      config?.get?.("environment.realMoneyMode", true) === false &&
      config?.get?.("environment.allowDevelopmentProviders", false) === true &&
      ["development", "test", "staging"].includes(config?.get?.("environment.name", ""));
  }

  function isVirtual(card) {
    return card?.type === "virtual" || card?.cardType === "virtual" ||
      card?.developmentVirtual === true;
  }

  function cardRow(card) {
    const id = escapeHTML(card.id);
    const kind = isVirtual(card) ? "Development virtual card" : "Linked card reference";
    const suffix = /^[0-9]{4}$/.test(String(card.last4 ?? ""))
      ? ` •••• ${escapeHTML(card.last4)}` : "";
    const status = card.frozen ? "FROZEN" : "ACTIVE";
    return `
      <div class="p54-card-item" data-card-entry="${id}">
        <div class="p54-card-top">
          <div>
            <div class="card-title">${escapeHTML(card.scheme || "PAY54")}${suffix}</div>
            <div class="card-sub">${escapeHTML(card.nickname || kind)}</div>
            <div class="card-sub">${kind}${isVirtual(card) ? " · Not a payment instrument" : ""}</div>
          </div>
          <div class="card-badge ${card.frozen ? "frozen" : "active"}">${status}</div>
        </div>
        <div class="card-actions">
          <button type="button" class="p54-btn" data-freeze="${id}">${card.frozen ? "Unfreeze" : "Freeze"}</button>
          <button type="button" class="p54-btn" data-default="${id}" ${card.default ? "disabled" : ""}>${card.default ? "Default" : "Set Default"}</button>
          <button type="button" class="p54-btn danger" data-delete="${id}">Remove</button>
        </div>
        ${card.default ? '<div class="default-card-tag">⭐ Default Card</div>' : ""}
      </div>`;
  }

  function renderCards(cardsEngine) {
    const status = cardsEngine.getCardRepositoryStatus();
    if (status?.state !== "VALID") {
      return `<div class="cards-premium"><div class="empty-state" role="alert">Card repository unavailable (${escapeHTML(status?.state || "UNKNOWN")}). No changes were made.</div></div>`;
    }
    const cards = cardsEngine.getCards();
    const cardsHTML = cards.length
      ? cards.map(cardRow).join("")
      : '<div class="empty-state">No cards saved yet</div>';
    return `
      <div class="cards-premium">
        <div class="cards-header">
          <button type="button" class="p54-btn primary" id="addCardBtn">+ Add Linked Card</button>
          <button type="button" class="p54-btn" id="virtualCardBtn" ${isDevelopmentEnvironment() ? "" : "disabled"}>+ Development Virtual Card</button>
        </div>
        <p class="card-sub">Development card records are not issued bank cards and cannot be used to pay.</p>
        ${cardsHTML}
      </div>`;
  }

  function checkedMutation(cardsEngine, action, verify, successMessage) {
    requireSession();
    requireWritableRepository(cardsEngine);
    const before = cardsEngine.getCardRepositoryStatus();
    const result = action();
    const after = cardsEngine.getCardRepositoryStatus();
    if (result === false || result === null || after?.state !== "VALID" ||
        !verify() || after.metadata?.revision <= before.metadata?.revision) {
      throw new Error("Card change was not confirmed. Please inspect repository status before retrying.");
    }
    notify(successMessage);
  }

  function openAddCard(callback) {
    try {
      requireSession();
      const cardsEngine = engine();
      requireWritableRepository(cardsEngine);
      modalEngine().openModal({
        title: "Add Linked Card Reference",
        bodyHTML: `
          <div class="p54-form">
            <p class="card-sub">Development reference only. Do not enter an actual card number, PIN or CVV.</p>
            <label for="cardScheme">Card network</label>
            <select class="p54-input" id="cardScheme"><option value="Visa">Visa</option><option value="Mastercard">Mastercard</option></select>
            <label for="cardLast4">Last four digits (reference only)</label>
            <input class="p54-input" id="cardLast4" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="off" placeholder="Last 4 digits">
            <label for="cardNickname">Nickname</label>
            <input class="p54-input" id="cardNickname" maxlength="60" autocomplete="off" placeholder="My linked card">
            <label for="cardExpiry">Expiry (optional, MM/YY)</label>
            <input class="p54-input" id="cardExpiry" maxlength="5" inputmode="numeric" autocomplete="off" placeholder="MM/YY">
            <div class="p54-actions">
              <button type="button" class="p54-btn" id="cancelCard">Cancel</button>
              <button type="button" class="p54-btn primary" id="saveCard">Save Reference</button>
            </div>
          </div>`,
        onMount: ({ modal, close }) => {
          modal.querySelector("#cancelCard")?.addEventListener("click", close);
          modal.querySelector("#saveCard")?.addEventListener("click", () => {
            try {
              const last4 = modal.querySelector("#cardLast4")?.value.trim() || "";
              const nickname = modal.querySelector("#cardNickname")?.value.trim() || "";
              const expiry = modal.querySelector("#cardExpiry")?.value.trim() || "";
              const scheme = modal.querySelector("#cardScheme")?.value || "Visa";
              if (!/^\d{4}$/.test(last4)) throw new Error("Enter exactly four reference digits.");
              if (expiry && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
                throw new Error("Expiry must be MM/YY.");
              }
              requireSession();
              requireWritableRepository(cardsEngine);
              const before = cardsEngine.getCardRepositoryStatus();
              const created = cardsEngine.addCard({
                type: "linked-reference", scheme, nickname: nickname || "Linked card",
                last4, expiry, frozen: false, default: false,
                referenceOnly: true
              });
              const after = cardsEngine.getCardRepositoryStatus();
              if (!created?.id || after?.state !== "VALID" ||
                  !cardsEngine.getCardById(created.id) ||
                  after.metadata?.revision <= before.metadata?.revision) {
                throw new Error("Linked card reference was not confirmed as saved.");
              }
              notify("Linked card reference saved");
              close();
              callback?.();
            } catch (error) { report(error, "Could not save linked card reference."); }
          });
        }
      });
    } catch (error) { report(error, "Could not open linked card form."); }
  }

  function createVirtualCard(callback) {
    try {
      requireSession();
      if (!isDevelopmentEnvironment()) {
        throw new Error("Development virtual cards are disabled in this environment.");
      }
      const cardsEngine = engine();
      requireWritableRepository(cardsEngine);
      const before = cardsEngine.getCardRepositoryStatus();
      const created = cardsEngine.addCard({
        type: "virtual", cardType: "virtual", developmentVirtual: true,
        scheme: "PAY54", nickname: "PAY54 Development Virtual Card",
        frozen: false, default: false, referenceOnly: true,
        issuerIssued: false, contactlessEnabled: false, walletTokenized: false
      });
      const after = cardsEngine.getCardRepositoryStatus();
      if (!created?.id || after?.state !== "VALID" ||
          !cardsEngine.getCardById(created.id) ||
          after.metadata?.revision <= before.metadata?.revision) {
        throw new Error("Virtual card creation was not confirmed by the repository.");
      }
      notify("Development virtual card saved");
      callback?.();
    } catch (error) { report(error, "Virtual card creation was blocked."); }
  }

  function openCards() {
    try {
      requireSession();
      const cardsEngine = engine();
      modalEngine().openModal({
        title: "PAY54 Virtual & Linked Cards",
        bodyHTML: renderCards(cardsEngine),
        onMount: ({ modal }) => {
          const body = modal.querySelector(".p54-modal-body");
          const refresh = () => {
            if (!body) return;
            try { body.innerHTML = renderCards(cardsEngine); }
            catch (error) {
              report(error, "Unable to refresh cards.");
              body.textContent = "Cards are temporarily unavailable.";
            }
          };
          modal.addEventListener("click", event => {
            const button = event.target.closest("button");
            if (!button || !modal.contains(button)) return;
            if (button.id === "addCardBtn") return openAddCard(refresh);
            if (button.id === "virtualCardBtn") return createVirtualCard(refresh);
            const id = button.dataset.freeze || button.dataset.default || button.dataset.delete;
            if (!id) return;
            try {
              const current = cardsEngine.getCardById(id);
              if (!current) throw new Error("Card no longer exists. Refresh the card list.");
              if (button.dataset.delete) {
                checkedMutation(cardsEngine,
                  () => { cardsEngine.deleteCard(id); return true; },
                  () => !cardsEngine.getCardById(id), "Card reference removed");
              } else if (button.dataset.freeze) {
                checkedMutation(cardsEngine,
                  () => { cardsEngine.toggleFreeze(id); return true; },
                  () => cardsEngine.getCardById(id)?.frozen === !current.frozen,
                  current.frozen ? "Card unfrozen" : "Card frozen");
              } else if (button.dataset.default) {
                checkedMutation(cardsEngine,
                  () => { cardsEngine.setDefault(id); return true; },
                  () => cardsEngine.getCardById(id)?.default === true,
                  "Default card updated");
              }
              refresh();
            } catch (error) { report(error, "Card operation failed."); }
          });
        }
      });
    } catch (error) { report(error, "Unable to open cards."); }
  }

  UI.openCards = openCards;
  UI.version = VERSION;
  GLOBAL.PAY54_CARDS_UI = UI;
  console.info(`[PAY54_CARDS_UI] ${MODULE} v${VERSION} ready.`);
})();
