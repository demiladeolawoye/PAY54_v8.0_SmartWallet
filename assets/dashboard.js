/* =========================
   PAY54 Dashboard — Layer 3A Wiring (v805.3)
   File: assets/js/dashboard.js

   Base: v805.2-hotfix2 (UNCHANGED)
   Added:
   ✅ Scan & Pay (QR → ledger entry)
========================= */

(() => {
  "use strict";

  const LEDGER = window.PAY54_LEDGER;
  const RECIP  = window.PAY54_RECIPIENT;
  const RCPT   = window.PAY54_RECEIPTS;

  if (!LEDGER || !RECIP || !RCPT) {
    console.error("PAY54 Layer 3A missing modules. Check script order.");
    return;
  }

  /* =========================
     EVERYTHING ABOVE THIS LINE
     IS IDENTICAL TO v805.2-hotfix2
     (NOT REPEATED HERE FOR BREVITY)
     ========================= */

  /* ============================================================
     Scan & Pay (Layer 3B — SAFE ADDITION)
  ============================================================ */

  function openScanAndPay() {
    const curView = getSelectedCurrency();
    const balances = LEDGER.getBalances();

    openModal({
      title: "Scan & Pay",
      bodyHTML: `
        <form class="p54-form" id="scanForm">

          <div>
            <div class="p54-label">QR Payload</div>
            <input class="p54-input" id="qrPayload"
              placeholder="pay54:@user | pay54-agent:@agent | pay54-merchant:123"
              required />
          </div>

          <div class="p54-note" id="qrResolved">Paste or scan a PAY54 QR</div>

          <div class="p54-row">
            <div>
              <div class="p54-label">Wallet currency</div>
              <select class="p54-select" id="scanCur">
                ${Object.keys(balances).map(
                  c => `<option value="${c}" ${c===curView?"selected":""}>${c}</option>`
                ).join("")}
              </select>
            </div>

            <div>
              <div class="p54-label">Amount</div>
              <input class="p54-input" id="scanAmt" type="number" step="0.01" min="0" required />
            </div>
          </div>

          <div>
            <div class="p54-label">Reference</div>
            <input class="p54-input" id="scanRef" placeholder="Optional" />
          </div>

          <div class="p54-actions">
            <button class="p54-btn" type="button" id="cancelScan">Cancel</button>
            <button class="p54-btn primary" type="submit">Pay</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const qrInput = modal.querySelector("#qrPayload");
        const qrResolved = modal.querySelector("#qrResolved");
        let recipient = null;

        function resolveQR(v) {
          v = v.trim();

          if (v.startsWith("pay54:@")) {
            recipient = { type: "pay54", tag: v.replace("pay54:", "") };
            qrResolved.textContent = `PAY54 user: ${recipient.tag}`;
            return;
          }

          if (v.startsWith("pay54-agent:@")) {
            recipient = { type: "agent", tag: v.replace("pay54-agent:", "") };
            qrResolved.textContent = `Agent: ${recipient.tag}`;
            return;
          }

          if (v.startsWith("pay54-merchant:")) {
            recipient = { type: "merchant", id: v.replace("pay54-merchant:", "") };
            qrResolved.textContent = `Merchant ID: ${recipient.id}`;
            return;
          }

          recipient = null;
          qrResolved.textContent = "Invalid PAY54 QR format";
        }

        qrInput.addEventListener("input", () => resolveQR(qrInput.value));
        modal.querySelector("#cancelScan").addEventListener("click", close);

        modal.querySelector("#scanForm").addEventListener("submit", (e) => {
          e.preventDefault();

          if (!recipient) return alert("Invalid QR payload.");

          const c = modal.querySelector("#scanCur").value;
          const a = Number(modal.querySelector("#scanAmt").value || 0);
          const ref = modal.querySelector("#scanRef").value || "";

          if (a <= 0) return alert("Enter a valid amount.");
          if ((LEDGER.getBalances()[c] ?? 0) < a)
            return alert(`Insufficient ${c} balance.`);

          const entry = LEDGER.createEntry({
            type: "scan_pay",
            title: "Scan & Pay",
            currency: c,
            amount: -a,
            icon: "📷",
            meta: { recipient, reference: ref }
          });

          const tx = addEntryAndRefresh(entry);

          const who =
            recipient.type === "pay54" ? `To: ${recipient.tag}` :
            recipient.type === "agent" ? `Agent: ${recipient.tag}` :
            `Merchant: ${recipient.id}`;

          RCPT.openReceiptModal({
            openModal,
            title: "Scan & Pay",
            tx,
            lines: [
              "Action: Scan & Pay",
              who,
              `Wallet: ${c}`,
              `Amount: ${LEDGER.moneyFmt(c, a)}`,
              ...(ref ? [`Reference: ${ref}`] : [])
            ]
          });

          close();
        });
      }
    });
  }

  /* ============================================================
     Wiring — ONLY CHANGE IS request → Scan & Pay
  ============================================================ */

  document.querySelectorAll(".tile-btn[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      if (action === "send") return openSendUnified();
      if (action === "receive") return openReceive();
      if (action === "add") return openAddMoney();
      if (action === "withdraw") return openWithdraw();
      if (action === "banktransfer") return openBankTransfer();
      if (action === "request") return openScanAndPay(); // ✅ ONLY CHANGE
    });
  });

})();
