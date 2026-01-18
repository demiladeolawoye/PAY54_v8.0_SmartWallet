/* =========================
   PAY54 Dashboard — Layer 3A
   File: assets/js/dashboard.js
   Version: v805.3-L3A

   ✔ Add Money refined (Card | Agent)
   ✔ Cross-currency supported
   ✔ Ledger + Receipts unchanged
========================= */

(() => {
  "use strict";

  const LEDGER = window.PAY54_LEDGER;
  const RECIP = window.PAY54_RECIPIENT;
  const RCPT = window.PAY54_RECEIPTS;

  if (!LEDGER || !RECIP || !RCPT) {
    console.error("PAY54 core modules missing.");
    return;
  }

  const LS = {
    CURRENCY: "pay54_currency",
    THEME: "pay54_theme"
  };

  const balanceEl = document.getElementById("balanceAmount");
  const pillBtns = document.querySelectorAll(".currency");
  const currencySelect = document.getElementById("currencySelect");
  const addMoneyBtn = document.getElementById("addMoneyBtn");

  /* -------------------------
     Currency handling
  ------------------------- */
  function setActiveCurrency(cur) {
    const balances = LEDGER.getBalances();
    pillBtns.forEach(b => b.classList.toggle("active", b.dataset.cur === cur));
    if (currencySelect) currencySelect.value = cur;
    balanceEl.textContent = LEDGER.moneyFmt(cur, balances[cur] ?? 0);
    localStorage.setItem(LS.CURRENCY, cur);
    LEDGER.setBaseCurrency(cur);
  }

  pillBtns.forEach(b => b.addEventListener("click", () => setActiveCurrency(b.dataset.cur)));
  if (currencySelect) {
    currencySelect.addEventListener("change", e => setActiveCurrency(e.target.value));
  }
  setActiveCurrency(localStorage.getItem(LS.CURRENCY) || "NGN");

  /* -------------------------
     Modal helper
  ------------------------- */
  function openModal({ title, bodyHTML, onMount }) {
    const wrap = document.createElement("div");
    wrap.className = "p54-modal-backdrop";
    wrap.innerHTML = `
      <div class="p54-modal">
        <div class="p54-modal-head">
          <strong>${title}</strong>
          <button class="p54-x">✕</button>
        </div>
        <div class="p54-modal-body">${bodyHTML}</div>
      </div>`;
    document.body.appendChild(wrap);

    const close = () => wrap.remove();
    wrap.querySelector(".p54-x").onclick = close;
    wrap.onclick = e => { if (e.target === wrap) close(); };

    if (onMount) onMount({ modal: wrap, close });
  }

  /* -------------------------
     ADD MONEY — FINAL MODEL
  ------------------------- */
  function openAddMoney() {
    const balances = LEDGER.getBalances();
    const activeCur = localStorage.getItem(LS.CURRENCY) || "NGN";

    openModal({
      title: "Add Money",
      bodyHTML: `
        <form class="p54-form" id="addMoneyForm">

          <div>
            <label class="p54-label">Method</label>
            <select class="p54-select" id="method">
              <option value="card">Card</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          <div id="methodFields"></div>

          <div class="p54-row">
            <div>
              <label class="p54-label">Wallet Currency</label>
              <select class="p54-select" id="walletCur">
                ${Object.keys(balances).map(c =>
                  `<option value="${c}" ${c === activeCur ? "selected" : ""}>${c}</option>`
                ).join("")}
              </select>
            </div>

            <div>
              <label class="p54-label">Amount</label>
              <input class="p54-input" id="amount" type="number" min="0" step="0.01" required />
            </div>
          </div>

          <div>
            <label class="p54-label">Reference (optional)</label>
            <input class="p54-input" id="reference" placeholder="e.g. Top up" />
          </div>

          <div class="p54-actions">
            <button type="button" class="p54-btn" id="cancel">Cancel</button>
            <button type="submit" class="p54-btn primary">Add Money</button>
          </div>
        </form>
      `,
      onMount: ({ modal, close }) => {
        const method = modal.querySelector("#method");
        const fields = modal.querySelector("#methodFields");

        function renderFields() {
          if (method.value === "card") {
            fields.innerHTML = `
              <div>
                <label class="p54-label">Select Card</label>
                <select class="p54-select" id="card">
                  <option>Visa •••• 4832</option>
                  <option>Mastercard •••• 1441</option>
                </select>
              </div>`;
          } else {
            fields.innerHTML = `
              <div>
                <label class="p54-label">Agent PAY54 Tag / Account</label>
                <input class="p54-input" id="agent" placeholder="@agent-tag or 300xxxxxxx" required />
              </div>`;
          }
        }

        renderFields();
        method.onchange = renderFields;
        modal.querySelector("#cancel").onclick = close;

        modal.querySelector("#addMoneyForm").onsubmit = e => {
          e.preventDefault();

          const amt = Number(modal.querySelector("#amount").value);
          if (amt <= 0) return alert("Enter valid amount.");

          const currency = modal.querySelector("#walletCur").value;
          const ref = modal.querySelector("#reference").value;

          const meta = { method: method.value, reference: ref };
          if (method.value === "card") {
            meta.card = modal.querySelector("#card").value;
          } else {
            meta.agent = modal.querySelector("#agent").value.trim();
            if (!meta.agent) return alert("Enter agent tag or account.");
          }

          const entry = LEDGER.createEntry({
            type: "add_money",
            title: "Wallet funding",
            currency,
            amount: amt,
            icon: "➕",
            meta
          });

          const tx = LEDGER.applyEntry(entry);
          setActiveCurrency(currency);

          RCPT.openReceiptModal({
            openModal,
            title: "Add Money",
            tx,
            lines: [
              `Method: ${method.value === "card" ? "Card" : "PAY54 Agent"}`,
              ...(meta.card ? [`Card: ${meta.card}`] : []),
              ...(meta.agent ? [`Agent: ${meta.agent}`] : []),
              `Wallet: ${currency}`,
              `Amount: ${LEDGER.moneyFmt(currency, amt)}`,
              ...(ref ? [`Reference: ${ref}`] : [])
            ]
          });

          close();
        };
      }
    });
  }

  if (addMoneyBtn) addMoneyBtn.onclick = openAddMoney;

})();
