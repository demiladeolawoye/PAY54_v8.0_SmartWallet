"use strict";

/* ==========================================================================
   PAY54 ENTERPRISE RECEIPT ENGINE
   File: assets/js/receipts.js
   Version: 1.0.0
   Work Package: WP-011B.6E.5G.5H.1

   Purpose
   -------
   Canonical presentation layer for completed PAY54 transaction receipts.

   Responsibilities
   ----------------
   • Render receipts only for already-completed canonical transactions.
   • Never create, mutate, debit, credit, settle or reverse transactions.
   • Support wallet-backed and externally settled transactions.
   • Support receipts with or without FX metadata.
   • Escape all customer-controlled receipt content.
   • Provide copy and WhatsApp sharing.
   • Preserve "Make Another Payment" routing compatibility.
   • Resolve GitHub Pages / sub-directory signup links safely.

   Financial Safety
   ----------------
   This module is presentation-only.

   It MUST NOT:
   • call PAY54_LEDGER.applyEntry()
   • call PAY54_TX.recordTransaction()
   • call PAY54_FUNDING_SERVICE.commit()
   • call PAY54_FUNDING_SERVICE.reverse()
   • mutate wallet balances
   • mutate card state
========================================================================== */

(() => {

  "use strict";

  const ENGINE_NAME =
    "PAY54 Enterprise Receipt Engine";

  const ENGINE_VERSION =
    "1.0.0";

  const JOIN_URL =
    "signup.html";


  /* ==========================================================================
     UTILITY — STRING NORMALISATION
  ========================================================================== */

  function cleanString(value) {

    return typeof value === "string"
      ? value.trim()
      : "";

  }


  /* ==========================================================================
     UTILITY — HTML ESCAPING
  ========================================================================== */

  function escapeHtml(value) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  }


  /* ==========================================================================
     UTILITY — SAFE NUMBER
  ========================================================================== */

  function finiteNumber(
    value,
    fallback = null
  ) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;

  }


  /* ==========================================================================
     UTILITY — RECEIPT TEXT
  ========================================================================== */

  function buildReceiptText(lines = []) {

    return (
      Array.isArray(lines)
        ? lines
        : []
    )
      .filter(
        line =>
          line !== null &&
          line !== undefined &&
          String(line).trim() !== ""
      )
      .map(
        line =>
          String(line)
      )
      .join("\n");

  }


  /* ==========================================================================
     UTILITY — TOAST
  ========================================================================== */

  function notify(message) {

    const toast =
      window.PAY54_TOAST;

    if(
      toast &&
      typeof toast.showToast ===
        "function"
    ){

      toast.showToast(
        message
      );

      return;

    }

    console.info(
      "[PAY54_RECEIPTS]",
      message
    );

  }


  /* ==========================================================================
     UTILITY — MONEY FORMAT
  ========================================================================== */

  function formatMoney(
    currency,
    amount
  ) {

    const code =
      cleanString(
        currency
      ).toUpperCase();

    const numericAmount =
      finiteNumber(
        amount,
        0
      );

    const ledger =
      window.PAY54_LEDGER;

    if(
      ledger &&
      typeof ledger.moneyFmt ===
        "function"
    ){

      try{

        return ledger.moneyFmt(
          code || "NGN",
          numericAmount
        );

      }catch(error){

        console.warn(
          "[PAY54_RECEIPTS] Ledger money formatter unavailable for receipt value.",
          error
        );

      }

    }

    return `${code || ""} ${numericAmount.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`.trim();

  }


  /* ==========================================================================
     UTILITY — TRANSACTION DATE
  ========================================================================== */

  function resolveTransactionDate(tx) {

    const candidate =
      tx?.created_at ||
      tx?.createdAt ||
      tx?.created ||
      tx?.timestamp ||
      tx?.meta?.recorded_at ||
      null;

    if(!candidate){

      return new Date();

    }

    const date =
      new Date(candidate);

    if(
      Number.isNaN(
        date.getTime()
      )
    ){

      return new Date();

    }

    return date;

  }


  /* ==========================================================================
     UTILITY — SAFE JOIN URL
  ========================================================================== */

  function resolveJoinUrl() {

    try{

      return new URL(
        JOIN_URL,
        window.location.href
      ).href;

    }catch{

      return JOIN_URL;

    }

  }


  /* ==========================================================================
     SHARE — WHATSAPP
  ========================================================================== */

  function shareWhatsApp(text) {

    const message =
      String(
        text || ""
      );

    const url =
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  }


  /* ==========================================================================
     SHARE — CLIPBOARD
  ========================================================================== */

  async function copyToClipboard(text) {

    const value =
      String(
        text || ""
      );

    try{

      if(
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ){

        await navigator.clipboard.writeText(
          value
        );

        notify(
          "Receipt copied"
        );

        return true;

      }

      throw new Error(
        "Clipboard API unavailable."
      );

    }catch(error){

      console.warn(
        "[PAY54_RECEIPTS] Clipboard write failed.",
        error
      );

      notify(
        "Copy is unavailable in this browser."
      );

      return false;

    }

  }


  /* ==========================================================================
     RECEIPT EVENT
  ========================================================================== */

  function publishReceiptCreated(
    tx,
    title
  ) {

    try{

      const eventBus =
        window.PAY54_EVENTS;

      if(
        !eventBus ||
        typeof eventBus.publish !==
          "function"
      ){

        return;

      }

      eventBus.publish(
        "receipt.created",
        {
          transactionId:
            tx?.id || null,

          transactionType:
            tx?.type || null,

          title:
            title || "Transaction",

          createdAt:
            new Date()
              .toISOString()
        },
        {
          source:
            "receipts"
        }
      );

    }catch(error){

      console.warn(
        "[PAY54_RECEIPTS] Receipt event publication failed.",
        error
      );

    }

  }


  /* ==========================================================================
     ROUTING — MAKE ANOTHER PAYMENT
  ========================================================================== */

  function reopenTransactionFlow(
    transactionType
  ) {

    const ui =
      window.PAY54_UI || {};

    switch(
      cleanString(
        transactionType
      )
    ){

      case "checkout":

        ui.openCheckout?.();

        break;


      case "send":

        ui.openSend?.();

        break;


      case "fx":

        ui.openGlobalTransfer?.();

        break;


      case "bill":

        ui.openBills?.();

        break;


      case "add_money":

        ui.openAddMoney?.();

        break;


      case "withdraw":

        ui.openWithdraw?.();

        break;


      case "bank_transfer":

        ui.openBankTransfer?.();

        break;


      case "shop":

        ui.openShop?.();

        break;


      case "savings":

        ui.openSavings?.();

        break;


      case "bet":

        ui.openBetFunding?.();

        break;


      default:

        ui.openScanAndPay?.();

        break;

    }

  }


  /* ==========================================================================
     RECEIPT CONTRACT VALIDATION
  ========================================================================== */

  function validateReceiptTransaction(tx) {

    if(
      !tx ||
      typeof tx !==
        "object"
    ){

      throw new TypeError(
        "Receipt transaction is required."
      );

    }

    if(
      !cleanString(
        tx.id
      )
    ){

      throw new Error(
        "Receipt transaction ID is required."
      );

    }

    const amount =
      finiteNumber(
        tx.amount
      );

    if(
      amount === null
    ){

      throw new Error(
        "Receipt transaction amount is invalid."
      );

    }

    if(
      !cleanString(
        tx.currency
      )
    ){

      throw new Error(
        "Receipt transaction currency is required."
      );

    }

    return true;

  }


  /* ==========================================================================
     RECEIPT — FX LINE
  ========================================================================== */

  function buildFxReceiptLine(tx) {

    const transactionCurrency =
      cleanString(
        tx?.currency
      ).toUpperCase();

    const baseCurrency =
      cleanString(
        tx?.base_currency ||
        tx?.baseCurrency
      ).toUpperCase();

    const baseEquivalent =
      finiteNumber(
        tx?.base_equiv ??
        tx?.baseEquivalent
      );

    const fxRate =
      finiteNumber(
        tx?.fx_rate_used ??
        tx?.fxRateUsed
      );

    if(
      !transactionCurrency ||
      !baseCurrency ||
      transactionCurrency ===
        baseCurrency ||
      baseEquivalent === null
    ){

      return "";

    }

    let line =
      `FX Equivalent: ≈ ${formatMoney(
        baseCurrency,
        baseEquivalent
      )}`;

    if(
      fxRate !== null
    ){

      line +=
        ` (rate ${fxRate.toFixed(
          4
        )} ${baseCurrency}/${transactionCurrency})`;

    }

    return line;

  }


  /* ==========================================================================
     CANONICAL RECEIPT MODAL
  ========================================================================== */

  function openReceiptModal({
    openModal = null,
    title = "Transaction",
    tx,
    lines = []
  } = {}) {

    validateReceiptTransaction(
      tx
    );

    const modalEngine =
      typeof openModal ===
        "function"
        ? openModal
        : window.PAY54_MODALS
            ?.openModal;

    if(
      typeof modalEngine !==
        "function"
    ){

      throw new Error(
        "PAY54 modal engine is unavailable."
      );

    }

    const transactionCurrency =
      cleanString(
        tx.currency
      ).toUpperCase();

    const transactionAmount =
      finiteNumber(
        tx.amount,
        0
      );

    const transactionDate =
      resolveTransactionDate(
        tx
      );

    const joinUrl =
      resolveJoinUrl();

    const fxLine =
      buildFxReceiptLine(
        tx
      );

    const canonicalLines = [

      "PAY54 Receipt",

      `Transaction ID: ${tx.id}`,

      "------------------------",

      ...(
        Array.isArray(lines)
          ? lines
          : []
      ),

      "------------------------",

      fxLine,

      `Time: ${transactionDate.toLocaleString()}`,

      "",

      "Join PAY54 — Earn rewards:",

      joinUrl

    ];

    const receiptText =
      buildReceiptText(
        canonicalLines
      );

    const transactionType =
      cleanString(
        tx.type
      );

    modalEngine({

      title:
        "Receipt",

      bodyHTML: `

        <div
          class="p54-receipt"
          role="document"
          aria-label="PAY54 transaction receipt"
        >

          <div
            style="
              text-align:center;
              margin-bottom:16px;
            "
          >

            <div
              aria-hidden="true"
              style="
                width:52px;
                height:52px;
                margin:0 auto 10px;
                border-radius:999px;
                display:grid;
                place-items:center;
                font-size:24px;
                font-weight:900;
                background:rgba(34,197,94,.14);
              "
            >
              ✓
            </div>

            <div
              style="
                font-size:18px;
                font-weight:900;
              "
            >
              Payment Successful
            </div>

            <div
              class="muted"
              style="
                margin-top:5px;
                font-size:13px;
              "
            >
              ${escapeHtml(
                title || "Transaction"
              )}
            </div>

          </div>

          <div
            class="p54-divider"
          ></div>

          <div
            style="
              display:grid;
              gap:10px;
            "
          >

            <div>

              <div
                class="muted"
                style="
                  font-size:12px;
                "
              >
                Amount
              </div>

              <div
                style="
                  margin-top:2px;
                  font-size:20px;
                  font-weight:900;
                "
              >
                ${escapeHtml(
                  formatMoney(
                    transactionCurrency,
                    Math.abs(
                      transactionAmount
                    )
                  )
                )}
              </div>

            </div>

            <div>

              <div
                class="muted"
                style="
                  font-size:12px;
                "
              >
                Transaction ID
              </div>

              <div
                style="
                  margin-top:2px;
                  font-size:13px;
                  font-weight:800;
                  overflow-wrap:anywhere;
                "
              >
                ${escapeHtml(
                  tx.id
                )}
              </div>

            </div>

          </div>

          <div
            class="p54-divider"
          ></div>

          <pre
            style="
              margin:0;
              white-space:pre-wrap;
              overflow-wrap:anywhere;
              font-family:
                ui-monospace,
                SFMono-Regular,
                Menlo,
                Monaco,
                Consolas,
                monospace;
              font-size:12px;
              line-height:1.6;
            "
          >${escapeHtml(
            receiptText
          )}</pre>

          <div
            class="p54-divider"
          ></div>

          <div
            style="
              font-size:12px;
            "
          >

            <a
              href="${escapeHtml(
                joinUrl
              )}"
              style="
                font-weight:900;
                text-decoration:underline;
              "
            >
              Join PAY54 — Earn rewards
            </a>

          </div>

        </div>

        <div
          class="p54-actions"
        >

          <button
            class="p54-btn"
            type="button"
            id="copyRcpt"
          >
            Copy
          </button>

          <button
            class="p54-btn"
            type="button"
            id="waRcpt"
          >
            WhatsApp
          </button>

          <button
            class="p54-btn"
            type="button"
            id="againRcpt"
          >
            Make Another Payment
          </button>

          <button
            class="p54-btn primary"
            type="button"
            id="doneRcpt"
          >
            Close
          </button>

        </div>

      `,

      onMount: ({
        modal,
        close
      }) => {

        const closeButton =
          modal.querySelector(
            "#doneRcpt"
          );

        const copyButton =
          modal.querySelector(
            "#copyRcpt"
          );

        const whatsappButton =
          modal.querySelector(
            "#waRcpt"
          );

        const againButton =
          modal.querySelector(
            "#againRcpt"
          );


        closeButton
          ?.addEventListener(
            "click",
            close
          );


        copyButton
          ?.addEventListener(
            "click",
            async () => {

              await copyToClipboard(
                receiptText
              );

            }
          );


        whatsappButton
          ?.addEventListener(
            "click",
            () => {

              shareWhatsApp(
                receiptText
              );

            }
          );


        againButton
          ?.addEventListener(
            "click",
            () => {

              close();

              window.setTimeout(
                () => {

                  reopenTransactionFlow(
                    transactionType
                  );

                },
                200
              );

            }
          );

      }

    });


    publishReceiptCreated(
      tx,
      title
    );


    return Object.freeze({

      ok:
        true,

      transactionId:
        tx.id,

      transactionType:
        transactionType ||
        null,

      receiptText,

      renderedAt:
        new Date()
          .toISOString()

    });

  }


  /* ==========================================================================
     EXPORT
  ========================================================================== */

  window.PAY54_RECEIPTS =
    Object.freeze({

      openReceiptModal,

      buildReceiptText,

      version:
        ENGINE_VERSION,

      engine:
        ENGINE_NAME

    });


  console.info(
    `✅ ${ENGINE_NAME} ${ENGINE_VERSION} loaded.`
  );

})();
