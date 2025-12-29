/* ================================
   PAY54 DASHBOARD LOGIC v2
   Phase A — Header + Balance
   ================================ */

/* ------------------------------
   STATE
-------------------------------- */
let activeCurrency = "NGN";

/* Mock balances (demo only) */
const balances = {
  NGN: 0.00,
  GBP: 0.00,
  USD: 0.00,
  EUR: 0.00,
  GHS: 0.00,
  KES: 0.00,
  ZAR: 0.00
};

/* Currency symbols */
const currencySymbols = {
  NGN: "₦",
  GBP: "£",
  USD: "$",
  EUR: "€",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R"
};

/* ------------------------------
   ELEMENTS
-------------------------------- */
const currencyButtons = document.querySelectorAll(".currency");
const balanceAmountEl = document.getElementById("balanceAmount");
const themeToggleBtn = document.getElementById("themeToggle");

/* ------------------------------
   INIT
-------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  setActiveCurrency(activeCurrency);
  updateBalance();
  restoreTheme();
});

/* ------------------------------
   CURRENCY SWITCHING
-------------------------------- */
currencyButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const selected = btn.dataset.cur;
    if (!selected) return;

    setActiveCurrency(selected);
    updateBalance();
  });
});

function setActiveCurrency(currency) {
  activeCurrency = currency;

  currencyButtons.forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.cur === currency
    );
  });
}

/* ------------------------------
   BALANCE DISPLAY
-------------------------------- */
function updateBalance() {
  const symbol = currencySymbols[activeCurrency] || "";
  const amount = balances[activeCurrency] ?? 0;

  balanceAmountEl.textContent =
    `${symbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
}

/* ------------------------------
   THEME TOGGLE (UI ONLY)
-------------------------------- */
function restoreTheme() {
  const savedTheme = localStorage.getItem("pay54_theme");
  if (savedTheme === "light") {
    document.body.classList.add("light");
    themeToggleBtn.textContent = "🌞";
  } else {
    document.body.classList.remove("light");
    themeToggleBtn.textContent = "🌙";
  }
}

themeToggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  localStorage.setItem("pay54_theme", isLight ? "light" : "dark");
  themeToggleBtn.textContent = isLight ? "🌞" : "🌙";
});

/* ------------------------------
   PLACEHOLDERS (NEXT PHASES)
-------------------------------- */
/*
  - FX conversion logic (Phase C)
  - Wallet-specific balances
  - API-backed balances
  - Transaction history
*/
