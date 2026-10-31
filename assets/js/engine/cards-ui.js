"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE — PREMIUM CARDS UI
   File: assets/js/engine/cards-ui.js
   Version: 2.2.0
   Work Package: WP-TITAN-CARDS-001D.6

   Responsibilities
   ----------------
   - Render PAY54 cards in a premium graphical format
   - Support linked cards and PAY54 virtual cards
   - Preserve canonical Card Engine usage
   - Improve customer-facing card actions and wording
   - Keep development virtual cards clearly labelled as demo records

   Notes
   -----
   - This module does not modify ledger balances
   - This module relies on the canonical PAY54_CARDS engine
   - Development virtual cards are demo records, not issued payment cards
========================================================================== */

(() => {
  "use strict";

  const GLOBAL = window;
  const VERSION = "2.2.0";
  const ENGINE_NAME = "PAY54 Premium Cards UI";
  const STYLE_ID = "pay54-premium-cards-ui-styles";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .p54-cards-workspace{
        display:flex;
        flex-direction:column;
        gap:20px;
        padding:4px 0 2px;
      }

      .p54-cards-toolbar{
        display:flex;
        flex-wrap:wrap;
        gap:12px;
        align-items:center;
      }

      .p54-cards-toolbar .p54-btn{
        min-height:44px;
        font-weight:700;
      }

      .p54-cards-toolbar .p54-btn.primary{
        box-shadow:0 10px 24px rgba(49, 104, 255, 0.20);
      }

      .p54-cards-disclaimer{
        margin:0;
        padding:10px 12px;
        border-radius:14px;
        background:#f6f8ff;
        color:#4b587c;
        font-size:13px;
        line-height:1.45;
      }

      .p54-cards-section{
        display:flex;
        flex-direction:column;
        gap:14px;
      }

      .p54-cards-section-head{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .p54-cards-section-title{
        margin:0;
        font-size:18px;
        line-height:1.2;
        font-weight:800;
        color:#10172d;
      }

      .p54-cards-section-copy{
        margin:0;
        font-size:13px;
        color:#66718f;
        line-height:1.45;
      }

      .p54-card-grid{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));
        gap:16px;
      }

      .p54-card-record{
        display:flex;
        flex-direction:column;
        gap:12px;
        padding:14px;
        border:1px solid #e4e8f4;
        border-radius:22px;
        background:#ffffff;
        box-shadow:0 10px 24px rgba(16, 23, 45, 0.05);
      }

      .p54-card-surface{
        position:relative;
        min-height:196px;
        border-radius:22px;
        padding:18px 18px 16px;
        color:#ffffff;
        overflow:hidden;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        box-shadow:0 20px 40px rgba(10, 22, 60, 0.22);
      }

      .p54-card-surface::before{
        content:"";
        position:absolute;
        top:-35%;
        right:-18%;
        width:220px;
        height:220px;
        border-radius:50%;
        background:rgba(255,255,255,0.10);
      }

      .p54-card-surface::after{
        content:"";
        position:absolute;
        bottom:-40%;
        left:-8%;
        width:180px;
        height:180px;
        border-radius:50%;
        background:rgba(255,255,255,0.08);
      }

      .p54-card-surface.virtual{
        background:
          radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 35%),
          linear-gradient(135deg, #1b43ff 0%, #2764ff 45%, #08a0ff 100%);
      }

      .p54-card-surface.linked{
        background:
          radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 35%),
          linear-gradient(135deg, #08184b 0%, #142e85 58%, #2d5cff 100%);
      }

      .p54-card-surface.mastercard{
        background:
          radial-gradient(circle at top right, rgba(255,255,255,0.14), transparent 35%),
          linear-gradient(135deg, #24103d 0%, #5a1758 55%, #b12a47 100%);
      }

      .p54-card-topline,
      .p54-card-bottomline{
        position:relative;
        z-index:1;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }

      .p54-card-brand-block{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .p54-card-brand{
        font-size:18px;
        font-weight:900;
        letter-spacing:0.04em;
      }

      .p54-card-kind{
        font-size:11px;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:0.12em;
        opacity:0.84;
      }

      .p54-card-network{
        font-size:14px;
        font-weight:800;
        letter-spacing:0.04em;
      }

      .p54-card-chip-row{
        position:relative;
        z-index:1;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }

      .p54-card-chip{
        width:44px;
        height:32px;
        border-radius:10px;
        background:
          linear-gradient(145deg, rgba(241, 212, 121, 0.95), rgba(197, 144, 55, 0.95));
        box-shadow:inset 0 0 0 1px rgba(255,255,255,0.25);
      }

      .p54-card-contactless{
        width:32px;
        height:32px;
        opacity:0.95;
        display:flex;
        align-items:center;
        justify-content:center;
      }

      .p54-card-contactless svg{
        width:28px;
        height:28px;
      }

      .p54-card-number{
        position:relative;
        z-index:1;
        font-size:24px;
        line-height:1.2;
        font-weight:800;
        letter-spacing:0.08em;
        word-spacing:0.22em;
      }

      .p54-card-meta{
        position:relative;
        z-index:1;
        display:grid;
        grid-template-columns:1fr auto;
        gap:12px;
      }

      .p54-card-meta-item{
        display:flex;
        flex-direction:column;
        gap:4px;
      }

      .p54-card-meta-label{
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:0.12em;
        opacity:0.78;
        font-weight:700;
      }

      .p54-card-meta-value{
        font-size:14px;
        line-height:1.2;
        font-weight:800;
      }

      .p54-card-flags{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
      }

      .p54-card-flag{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:24px;
        padding:4px 10px;
        border-radius:999px;
        font-size:11px;
        font-weight:800;
        letter-spacing:0.05em;
        text-transform:uppercase;
      }

      .p54-card-flag.default{
        background:rgba(255,255,255,0.20);
        border:1px solid rgba(255,255,255,0.30);
      }

      .p54-card-flag.demo{
        background:rgba(255,255,255,0.18);
        border:1px solid rgba(255,255,255,0.28);
      }

      .p54-card-summary{
        display:flex;
        gap:12px;
        align-items:flex-start;
        justify-content:space-between;
      }

      .p54-card-summary-copy{
        display:flex;
        flex-direction:column;
        gap:4px;
        min-width:0;
      }

      .p54-card-summary-title{
        margin:0;
        font-size:18px;
        line-height:1.2;
        font-weight:800;
        color:#10172d;
      }

      .p54-card-summary-text{
        margin:0;
        font-size:13px;
        line-height:1.45;
        color:#66718f;
      }

      .p54-status-pill{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:28px;
        padding:6px 10px;
        border-radius:999px;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
      }

      .p54-status-pill.active{
        background:#dcfce8;
        color:#12733f;
      }

      .p54-status-pill.frozen{
        background:#fff1cf;
        color:#8a5c00;
      }

      .p54-card-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
      }

      .p54-card-actions .p54-btn{
        min-height:42px;
        font-weight:700;
      }

      .p54-card-actions .p54-btn[disabled]{
        opacity:0.60;
        cursor:not-allowed;
      }

      .p54-cards-empty{
        padding:22px 18px;
        border:1px dashed #d7ddee;
        border-radius:18px;
        background:#fafbff;
        text-align:center;
        color:#5b6686;
      }

      .p54-cards-empty-title{
        margin:0 0 6px;
        font-size:16px;
        font-weight:800;
        color:#10172d;
      }

      .p54-cards-empty-copy{
        margin:0;
        font-size:13px;
        line-height:1.45;
      }

      .p54-card-builder-note{
        margin:0;
        padding:12px 14px;
        border-radius:14px;
        background:#fafbff;
        color:#5b6686;
        font-size:13px;
        line-height:1.5;
      }

      .p54-card-form{
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .p54-card-form-row{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:12px;
      }

      .p54-card-form .p54-input{
        width:100%;
      }

      .p54-card-dialog-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:6px;
      }

      @media (max-width: 720px){
        .p54-card-grid{
          grid-template-columns:1fr;
        }

        .p54-card-form-row{
          grid-template-columns:1fr;
        }

        .p54-card-number{
          font-size:21px;
        }

        .p54-card-summary{
          flex-direction:column;
          align-items:flex-start;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getCardsEngine() {
    const engine = GLOBAL.PAY54_CARDS;

    if (!engine || typeof engine.getCards !== "function") {
      throw new Error("PAY54 Cards Engine unavailable.");
    }

    return engine;
  }

  function getModalEngine() {
    const modals = GLOBAL.PAY54_MODALS;

    if (!modals || typeof modals.openModal !== "function") {
      throw new Error("PAY54 Modal Engine unavailable.");
    }

    return modals;
  }

  function showToast(message) {
    GLOBAL.PAY54_TOAST?.showToast?.(message);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }

  function getSessionUserName() {
    const storedName =
      GLOBAL.localStorage?.getItem("pay54_name") ||
      "PAY54 User";

    return storedName.toUpperCase();
  }

  function isVirtualCard(card) {
    const type =
      String(
        card?.type ||
        card?.instrumentType ||
        ""
      ).toLowerCase();

    const nickname =
      String(card?.nickname || "").toLowerCase();

    return (
      type === "virtual" ||
      card?.development === true ||
      nickname.includes("virtual")
    );
  }

  function isMastercard(card) {
    const scheme =
      String(
        card?.network ||
        card?.scheme ||
        ""
      ).toLowerCase();

    return scheme.includes("master");
  }

  function getCardSurfaceClass(card) {
    if (isVirtualCard(card)) {
      return "virtual";
    }

    if (isMastercard(card)) {
      return "mastercard";
    }

    return "linked";
  }

  function formatMaskedNumber(card) {
    const last4 =
      String(card?.last4 || "0000")
        .slice(-4)
        .padStart(4, "0");

    return `•••• •••• •••• ${last4}`;
  }

  function formatExpiry(card) {
    const expiry = String(card?.expiry || "").trim();

    if (expiry) {
      return expiry;
    }

    return "12/29";
  }

  function getCardholderName(card) {
    return String(
      card?.holderName ||
      card?.cardholderName ||
      getSessionUserName()
    ).toUpperCase();
  }

  function getCardNetwork(card) {
    return String(
      card?.network ||
      card?.scheme ||
      (isVirtualCard(card) ? "VISA" : "CARD")
    ).toUpperCase();
  }

  function getCardTitle(card) {
    if (isVirtualCard(card)) {
      return String(
        card?.nickname || "PAY54 Virtual Card"
      );
    }

    return `${getCardNetwork(card)} •••• ${String(card?.last4 || "").slice(-4)}`;
  }

  function getCardSummaryCopy(card) {
    if (isVirtualCard(card)) {
      return card?.development === true
        ? "Demo virtual card · Not an issued payment card"
        : "PAY54 virtual card";
    }

    return String(
      card?.nickname || "Linked card reference"
    );
  }

  function getCardVisualKind(card) {
    if (isVirtualCard(card)) {
      return card?.development === true
        ? "Virtual · Demo"
        : "Virtual";
    }

    return "Linked Card";
  }

  function getCardStatusClass(card) {
    return card?.frozen ? "frozen" : "active";
  }

  function getCardStatusText(card) {
    return card?.frozen ? "Frozen" : "Active";
  }

  function sortCards(cards) {
    return [...cards].sort((left, right) => {
      const defaultScore =
        Number(Boolean(right?.default)) -
        Number(Boolean(left?.default));

      if (defaultScore !== 0) {
        return defaultScore;
      }

      const linkedOrder =
        Number(isVirtualCard(left)) -
        Number(isVirtualCard(right));

      if (linkedOrder !== 0) {
        return linkedOrder;
      }

      const leftCreated =
        String(left?.createdAt || "");
      const rightCreated =
        String(right?.createdAt || "");

      return rightCreated.localeCompare(leftCreated);
    });
  }

  function getCards() {
    const engine = getCardsEngine();
    const cards = engine.getCards();

    return Array.isArray(cards)
      ? sortCards(cards)
      : [];
  }

  function getContactlessIcon() {
    return `
      <svg viewBox="0 0 32 32"
           aria-hidden="true"
           focusable="false"
           xmlns="http://www.w3.org/2000/svg">
        <g fill="none"
           stroke="rgba(255,255,255,0.96)"
           stroke-width="2.4"
           stroke-linecap="round">
          <path d="M10 12.5c2.7 1.4 4.5 4 4.5 7.1S12.7 25.3 10 26.7"/>
          <path d="M15 9.3c3.9 2.1 6.5 5.9 6.5 10.3S18.9 27.8 15 29.9"/>
          <path d="M20 6.3c5 2.8 8.4 7.8 8.4 13.3S25 30 20 32.8"/>
        </g>
      </svg>
    `;
  }

  function getSurfaceFlags(card) {
    const flags = [];

    if (card?.default) {
      flags.push({
        label: "Default",
        css: "default"
      });
    }

    if (isVirtualCard(card) && card?.development === true) {
      flags.push({
        label: "Demo",
        css: "demo"
      });
    }

    return flags;
  }

  function renderCardSurface(card) {
    const flags = getSurfaceFlags(card);

    return `
      <div class="p54-card-surface ${escapeAttribute(getCardSurfaceClass(card))}">
        <div class="p54-card-topline">
          <div class="p54-card-brand-block">
            <div class="p54-card-brand">PAY54</div>
            <div class="p54-card-kind">${escapeHTML(getCardVisualKind(card))}</div>
          </div>

          <div class="p54-card-network">${escapeHTML(getCardNetwork(card))}</div>
        </div>

        <div class="p54-card-chip-row">
          <div class="p54-card-chip" aria-hidden="true"></div>
          <div class="p54-card-contactless" aria-label="Contactless enabled">
            ${getContactlessIcon()}
          </div>
        </div>

        <div class="p54-card-number">${escapeHTML(formatMaskedNumber(card))}</div>

        <div class="p54-card-meta">
          <div class="p54-card-meta-item">
            <span class="p54-card-meta-label">Cardholder</span>
            <span class="p54-card-meta-value">${escapeHTML(getCardholderName(card))}</span>
          </div>

          <div class="p54-card-meta-item">
            <span class="p54-card-meta-label">Expiry</span>
            <span class="p54-card-meta-value">${escapeHTML(formatExpiry(card))}</span>
          </div>
        </div>

        <div class="p54-card-bottomline">
          <div class="p54-card-flags">
            ${flags.map(flag => `
              <span class="p54-card-flag ${escapeAttribute(flag.css)}">
                ${escapeHTML(flag.label)}
              </span>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderCardRecord(card) {
    const cardId = escapeAttribute(card.id);

    return `
      <article class="p54-card-record"
               data-card-id="${cardId}">
        ${renderCardSurface(card)}

        <div class="p54-card-summary">
          <div class="p54-card-summary-copy">
            <h4 class="p54-card-summary-title">
              ${escapeHTML(getCardTitle(card))}
            </h4>

            <p class="p54-card-summary-text">
              ${escapeHTML(getCardSummaryCopy(card))}
            </p>
          </div>

          <span class="p54-status-pill ${escapeAttribute(getCardStatusClass(card))}">
            ${escapeHTML(getCardStatusText(card))}
          </span>
        </div>

        <div class="p54-card-actions">
          <button class="p54-btn"
                  type="button"
                  data-freeze="${cardId}">
            ${card?.frozen ? "Unfreeze" : "Freeze"}
          </button>

          <button class="p54-btn"
                  type="button"
                  data-default="${cardId}"
                  ${card?.default ? "disabled aria-disabled=\"true\"" : ""}>
            ${card?.default ? "Default Card" : "Set Default"}
          </button>

          <button class="p54-btn danger"
                  type="button"
                  data-delete="${cardId}">
            Remove
          </button>
        </div>
      </article>
    `;
  }

  function renderEmptyState(title, copy) {
    return `
      <div class="p54-cards-empty">
        <h4 class="p54-cards-empty-title">${escapeHTML(title)}</h4>
        <p class="p54-cards-empty-copy">${escapeHTML(copy)}</p>
      </div>
    `;
  }

  function renderSection(title, copy, cards, emptyTitle, emptyCopy) {
    return `
      <section class="p54-cards-section">
        <div class="p54-cards-section-head">
          <h3 class="p54-cards-section-title">${escapeHTML(title)}</h3>
          <p class="p54-cards-section-copy">${escapeHTML(copy)}</p>
        </div>

        ${
          cards.length
            ? `
              <div class="p54-card-grid">
                ${cards.map(renderCardRecord).join("")}
              </div>
            `
            : renderEmptyState(emptyTitle, emptyCopy)
        }
      </section>
    `;
  }

  function renderCardsWorkspace() {
    const cards = getCards();

    const linkedCards =
      cards.filter(card => !isVirtualCard(card));

    const virtualCards =
      cards.filter(card => isVirtualCard(card));

    return `
      <div class="p54-cards-workspace">

        <div class="p54-cards-toolbar">
          <button class="p54-btn primary"
                  type="button"
                  id="pay54LinkCardAction">
            + Link Existing Card
          </button>

          <button class="p54-btn"
                  type="button"
                  id="pay54CreateVirtualCardAction">
            + Create Virtual Card
          </button>
        </div>

        <p class="p54-cards-disclaimer">
          Development virtual cards are demo records used for PAY54 product
          testing. They are not issued bank cards and cannot be used to make payments.
        </p>

        ${renderSection(
          "Virtual Cards",
          "Beautiful PAY54 virtual cards for the wallet experience. Demo cards remain clearly marked until live issuing is enabled.",
          virtualCards,
          "No virtual cards yet",
          "Create a PAY54 virtual card to preview the premium wallet card experience."
        )}

        ${renderSection(
          "Linked Cards",
          "Linked cards are external card references that you can manage inside PAY54.",
          linkedCards,
          "No linked cards yet",
          "Link an existing bank card to create a managed reference inside PAY54."
        )}

      </div>
    `;
  }

  function randomDigits(length) {
    let output = "";

    for (let index = 0; index < length; index += 1) {
      output += Math.floor(Math.random() * 10);
    }

    return output;
  }

  function generateExpiry() {
    const now = new Date();
    const futureYear = now.getFullYear() + 3;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(futureYear).slice(-2);

    return `${month}/${year}`;
  }

  function hasDefaultCard(cards) {
    return cards.some(card => card?.default === true);
  }

  function createVirtualCardRecord(existingCards) {
    return {
      id: GLOBAL.crypto?.randomUUID
        ? GLOBAL.crypto.randomUUID()
        : `pay54-virtual-${Date.now()}-${randomDigits(4)}`,

      type: "virtual",
      instrumentType: "virtual",
      development: true,
      program: "PAY54",
      scheme: "Visa",
      network: "Visa",
      nickname: "PAY54 Virtual Card",
      holderName: getSessionUserName(),
      last4: randomDigits(4),
      expiry: generateExpiry(),
      frozen: false,
      default: !hasDefaultCard(existingCards),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contactless: true,
      paymentEnabled: false
    };
  }

  function reconcileDefaultCard(engine) {
    const cards = Array.isArray(engine.getCards())
      ? engine.getCards()
      : [];

    if (!cards.length) {
      return;
    }

    if (cards.some(card => card?.default === true)) {
      return;
    }

    if (typeof engine.setDefault === "function") {
      engine.setDefault(cards[0].id);
    }
  }

  function findCardById(engine, cardId) {
    if (typeof engine.getCardById === "function") {
      return engine.getCardById(cardId) || null;
    }

    const cards = Array.isArray(engine.getCards())
      ? engine.getCards()
      : [];

    return cards.find(card => card?.id === cardId) || null;
  }

  function openAddLinkedCard(onComplete) {
    const modals = getModalEngine();
    const engine = getCardsEngine();

    modals.openModal({
      title: "Link Existing Card",

      bodyHTML: `
        <div class="p54-card-form">
          <p class="p54-card-builder-note">
            Add a linked card reference to manage it in PAY54.
            This does not issue a new card.
          </p>

          <input class="p54-input"
                 id="pay54LinkedCardHolder"
                 placeholder="Cardholder name"
                 value="${escapeAttribute(getSessionUserName())}" />

          <input class="p54-input"
                 id="pay54LinkedCardNumber"
                 placeholder="Card number" />

          <div class="p54-card-form-row">
            <input class="p54-input"
                   id="pay54LinkedCardExpiry"
                   placeholder="MM/YY" />

            <input class="p54-input"
                   id="pay54LinkedCardNickname"
                   placeholder="Nickname (optional)" />
          </div>

          <select class="p54-input"
                  id="pay54LinkedCardScheme">
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
          </select>

          <div class="p54-card-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    id="pay54CancelLinkedCard">
              Cancel
            </button>

            <button class="p54-btn primary"
                    type="button"
                    id="pay54SaveLinkedCard">
              Link Card
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        modal
          .querySelector("#pay54CancelLinkedCard")
          ?.addEventListener("click", close);

        modal
          .querySelector("#pay54SaveLinkedCard")
          ?.addEventListener("click", () => {
            const holderName =
              modal.querySelector("#pay54LinkedCardHolder")
                ?.value
                ?.trim() || "";

            const number =
              modal.querySelector("#pay54LinkedCardNumber")
                ?.value
                ?.replace(/\s+/g, "")
                ?.trim() || "";

            const expiry =
              modal.querySelector("#pay54LinkedCardExpiry")
                ?.value
                ?.trim() || "";

            const nickname =
              modal.querySelector("#pay54LinkedCardNickname")
                ?.value
                ?.trim() || "";

            const scheme =
              modal.querySelector("#pay54LinkedCardScheme")
                ?.value
                ?.trim() || "Visa";

            if (!holderName) {
              showToast("Cardholder name is required.");
              return;
            }

            if (!/^\d{8,19}$/.test(number)) {
              showToast("Enter a valid card number.");
              return;
            }

            if (!/^\d{2}\/\d{2}$/.test(expiry)) {
              showToast("Expiry must use MM/YY format.");
              return;
            }

            const currentCards = getCards();

            const card = {
              id: GLOBAL.crypto?.randomUUID
                ? GLOBAL.crypto.randomUUID()
                : `pay54-linked-${Date.now()}-${randomDigits(4)}`,

              type: "linked",
              instrumentType: "linked",
              scheme,
              network: scheme,
              nickname: nickname || "Linked card reference",
              holderName,
              last4: number.slice(-4),
              expiry,
              frozen: false,
              default: !hasDefaultCard(currentCards),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              contactless: true
            };

            try {
              engine.addCard(card);
              reconcileDefaultCard(engine);
              close();
              onComplete?.("Linked card added.");
            } catch (error) {
              console.error("[PAY54_CARDS_UI] Unable to link card.", error);
              showToast("Unable to link the card.");
            }
          });
      }
    });
  }

  function openCreateVirtualCard(onComplete) {
    const modals = getModalEngine();
    const engine = getCardsEngine();

    modals.openModal({
      title: "Create Virtual Card",

      bodyHTML: `
        <div class="p54-card-form">
          <p class="p54-card-builder-note">
            This creates a PAY54 demo virtual card record for the premium wallet experience.
            It is not an issued bank card and cannot be used for live payments.
          </p>

          <div class="p54-card-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    id="pay54CancelVirtualCard">
              Cancel
            </button>

            <button class="p54-btn primary"
                    type="button"
                    id="pay54ConfirmVirtualCard">
              Create Virtual Card
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        modal
          .querySelector("#pay54CancelVirtualCard")
          ?.addEventListener("click", close);

        modal
          .querySelector("#pay54ConfirmVirtualCard")
          ?.addEventListener("click", () => {
            try {
              const currentCards = getCards();
              const card = createVirtualCardRecord(currentCards);

              engine.addCard(card);
              reconcileDefaultCard(engine);

              close();
              onComplete?.("PAY54 virtual card created.");
            } catch (error) {
              console.error("[PAY54_CARDS_UI] Unable to create virtual card.", error);
              showToast("Unable to create virtual card.");
            }
          });
      }
    });
  }

  function openRemoveCard(cardId, onComplete) {
    const modals = getModalEngine();
    const engine = getCardsEngine();
    const card = findCardById(engine, cardId);

    if (!card) {
      showToast("Card record not found.");
      return;
    }

    modals.openModal({
      title: "Remove Card",

      bodyHTML: `
        <div class="p54-card-form">
          <p class="p54-card-builder-note">
            Remove <strong>${escapeHTML(getCardTitle(card))}</strong> from PAY54 card management?
            This action removes the card record from the current repository.
          </p>

          <div class="p54-card-dialog-actions">
            <button class="p54-btn"
                    type="button"
                    id="pay54CancelRemoveCard">
              Cancel
            </button>

            <button class="p54-btn danger"
                    type="button"
                    id="pay54ConfirmRemoveCard">
              Remove
            </button>
          </div>
        </div>
      `,

      onMount: ({ modal, close }) => {
        modal
          .querySelector("#pay54CancelRemoveCard")
          ?.addEventListener("click", close);

        modal
          .querySelector("#pay54ConfirmRemoveCard")
          ?.addEventListener("click", () => {
            try {
              engine.deleteCard(cardId);
              reconcileDefaultCard(engine);
              close();
              onComplete?.("Card removed.");
            } catch (error) {
              console.error("[PAY54_CARDS_UI] Unable to remove card.", error);
              showToast("Unable to remove the card.");
            }
          });
      }
    });
  }

  function openCards() {
    ensureStyles();

    const modals = getModalEngine();
    getCardsEngine();

    modals.openModal({
      title: "PAY54 Virtual & Linked Cards",

      bodyHTML: renderCardsWorkspace(),

      onMount: ({ modal }) => {
        function refresh(successMessage) {
          const body = modal.querySelector(".p54-modal-body");

          if (body) {
            body.innerHTML = renderCardsWorkspace();
            bind();
          }

          if (successMessage) {
            showToast(successMessage);
          }
        }

        function bind() {
          modal
            .querySelector("#pay54LinkCardAction")
            ?.addEventListener("click", () => {
              openAddLinkedCard(refresh);
            });

          modal
            .querySelector("#pay54CreateVirtualCardAction")
            ?.addEventListener("click", () => {
              openCreateVirtualCard(refresh);
            });

          modal
            .querySelectorAll("[data-freeze]")
            .forEach(button => {
              button.addEventListener("click", () => {
                try {
                  const engine = getCardsEngine();
                  engine.toggleFreeze(button.dataset.freeze);
                  refresh("Card status updated.");
                } catch (error) {
                  console.error("[PAY54_CARDS_UI] Unable to update freeze state.", error);
                  showToast("Unable to update the card state.");
                }
              });
            });

          modal
            .querySelectorAll("[data-default]")
            .forEach(button => {
              button.addEventListener("click", () => {
                if (button.disabled) {
                  return;
                }

                try {
                  const engine = getCardsEngine();
                  engine.setDefault(button.dataset.default);
                  refresh("Default card updated.");
                } catch (error) {
                  console.error("[PAY54_CARDS_UI] Unable to update default card.", error);
                  showToast("Unable to set the default card.");
                }
              });
            });

          modal
            .querySelectorAll("[data-delete]")
            .forEach(button => {
              button.addEventListener("click", () => {
                openRemoveCard(button.dataset.delete, refresh);
              });
            });
        }

        bind();
      }
    });
  }

  GLOBAL.PAY54_CARDS_UI = GLOBAL.PAY54_CARDS_UI || {};
  GLOBAL.PAY54_CARDS_UI.version = VERSION;
  GLOBAL.PAY54_CARDS_UI.name = ENGINE_NAME;
  GLOBAL.PAY54_CARDS_UI.openCards = openCards;

  console.info(`[PAY54_CARDS_UI] ${ENGINE_NAME} v${VERSION} ready.`);
})();
