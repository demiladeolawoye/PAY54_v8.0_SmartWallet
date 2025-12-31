/* ======================================
   PAY54 DASHBOARD — LAYER 1 (OPTION A+)
   UI Interactions & Mobile UX Polish
   NO backend / NO functional wiring yet
====================================== */

/* ---------- MOCK BALANCES ---------- */
const balances = {
  NGN: 1250000.5,
  GBP: 8420.75,
  USD: 15320.4,
  EUR: 11890.2,
  GHS: 9650,
  KES: 132450,
  ZAR: 27890.6
};

const symbols = {
  NGN: "₦",
  GBP: "£",
  USD: "$",
  EUR: "€",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R"
};

/* ---------- ELEMENT REFERENCES ---------- */
const balanceEl = document.getElementById("balanceAmount");
const currencyBtns = document.querySelectorAll(".currency");
const currencyDropdown = document.querySelector(".currency-dropdown");

const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

const clearAlertsBtn = document.getElementById("clearAlerts");
const alertsList = document.getElementById("alerts");

/* ---------- BALANCE UPDATE ---------- */
function updateBalance(currency) {
  if (!balances[currency]) return;

  const amount = balances[currency].toLocaleString();
  balanceEl.textContent = `${symbols[currency]} ${amount}`;

  // Font scaling to keep currency inline
  const len = amount.replace(/,/g, "").length;
  if (len <= 6) balanceEl.style.fontSize = "52px";
  else if (len <= 9) balanceEl.style.fontSize = "44px";
  else balanceEl.style.fontSize = "38px";
}

/* ---------- WEB: CURRENCY PILLS ---------- */
currencyBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currencyBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const cur = btn.dataset.cur;
    updateBalance(cur);

    // Sync mobile dropdown
    if (currencyDropdown) {
      currencyDropdown.value = cur;
    }
  });
});

/* ---------- MOBILE: CURRENCY DROPDOWN ---------- */
if (currencyDropdown) {
  currencyDropdown.addEventListener("change", e => {
    const cur = e.target.value;
    updateBalance(cur);

    currencyBtns.forEach(b => {
      b.classList.toggle("active", b.dataset.cur === cur);
    });
  });
}

/* ---------- PROFILE MENU (CLICK, NOT HOVER) ---------- */
if (profileBtn && profileMenu) {
  profileBtn.addEventListener("click", e => {
    e.stopPropagation();
    profileMenu.classList.toggle("show");
  });

  document.addEventListener("click", () => {
    profileMenu.classList.remove("show");
  });
}

/* ---------- PROFILE DATA ---------- */
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");

if (profileName) {
  profileName.textContent =
    localStorage.getItem("pay54_name") || "Pese";
}
if (profileEmail) {
  profileEmail.textContent =
    localStorage.getItem("pay54_email") || "";
}

/* ---------- LOGOUT (UI LEVEL) ---------- */
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

/* ---------- THEME TOGGLE (UI ONLY) ---------- */
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");

    themeToggle.textContent =
      document.body.classList.contains("light") ? "☀️" : "🌙";
  });
}

/* ---------- ALERTS: CLEAR ALL ---------- */
if (clearAlertsBtn && alertsList) {
  clearAlertsBtn.addEventListener("click", () => {
    alertsList.innerHTML = "<li>No alerts</li>";
  });
}

/* ---------- BUTTON FEEDBACK (NO DEAD CLICKS) ---------- */
document.querySelectorAll("button").forEach(btn => {
  if (
    btn === profileBtn ||
    btn === logoutBtn ||
    btn === themeToggle ||
    btn.classList.contains("currency")
  ) return;

  btn.addEventListener("click", () => {
    // Layer 1 behaviour only
    console.log("Action queued for Layer 2:", btn.textContent.trim());
  });
});

/* ---------- INIT DEFAULT ---------- */
updateBalance("NGN");
