// =========================
// PAY54 Dashboard Interactions — v8.0.1
// =========================

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

const balanceEl = document.getElementById("balanceAmount");
const pillBtns = document.querySelectorAll(".currency");
const currencySelect = document.getElementById("currencySelect");

function formatMoney(cur) {
  const n = balances[cur] ?? 0;
  const s = symbols[cur] ?? "";
  return `${s} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function setActiveCurrency(cur) {
  pillBtns.forEach(b => {
    const isActive = b.dataset.cur === cur;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (currencySelect) currencySelect.value = cur;
  if (balanceEl) balanceEl.textContent = formatMoney(cur);

  localStorage.setItem("pay54_currency", cur);
}

pillBtns.forEach(btn => {
  btn.addEventListener("click", () => setActiveCurrency(btn.dataset.cur));
});

if (currencySelect) {
  currencySelect.addEventListener("change", (e) => setActiveCurrency(e.target.value));
}

setActiveCurrency(localStorage.getItem("pay54_currency") || "NGN");

// Theme toggle
const themeToggle = document.getElementById("themeToggle");
function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem("pay54_theme", theme);

  if (themeToggle) {
    themeToggle.querySelector(".icon").textContent = (theme === "light") ? "🌙" : "☀️";
  }
}
applyTheme(localStorage.getItem("pay54_theme") || "dark");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");
    applyTheme(isLight ? "dark" : "light");
  });
}

// Profile name/email
const profileNameEl = document.getElementById("profileName");
const profileEmailEl = document.getElementById("profileEmail");
const storedName = localStorage.getItem("pay54_name") || "Pese";
const storedEmail = localStorage.getItem("pay54_email") || "pese@gmail.com";

if (profileNameEl) profileNameEl.textContent = storedName;
if (profileEmailEl) profileEmailEl.textContent = storedEmail;

// Avatar initial
const avatarEl = document.querySelector("#profileBtn .avatar");
if (avatarEl && storedName) avatarEl.textContent = storedName.trim().charAt(0).toUpperCase();

// Profile dropdown open/close
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

function closeProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.remove("open");
  profileMenu.setAttribute("aria-hidden", "true");
}
function openProfileMenu() {
  if (!profileMenu) return;
  profileMenu.classList.add("open");
  profileMenu.setAttribute("aria-hidden", "false");
}

if (profileBtn && profileMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = profileMenu.classList.contains("open");
    isOpen ? closeProfileMenu() : openProfileMenu();
  });

  profileMenu.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", closeProfileMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProfileMenu();
  });
}

// Menu actions (data-nav)
document.querySelectorAll(".pm-item[data-nav]").forEach(item => {
  item.addEventListener("click", () => {
    const nav = item.dataset.nav;
    alert(`Coming soon: ${nav}`);
    closeProfileMenu();
  });
});

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// Alerts clear
const clearAlerts = document.getElementById("clearAlerts");
if (clearAlerts) {
  clearAlerts.addEventListener("click", () => {
    const alerts = document.getElementById("alerts");
    if (!alerts) return;
    alerts.innerHTML = `
      <div class="feed-item">
        <div class="feed-icon">✅</div>
        <div class="feed-main">
          <div class="feed-title">All clear</div>
          <div class="feed-sub">No requests or alerts</div>
        </div>
        <button class="btn ghost sm ok" type="button">OK</button>
      </div>
    `;
  });
}

// Balance CTAs (placeholder)
const addMoneyBtn = document.getElementById("addMoneyBtn");
const withdrawBtn = document.getElementById("withdrawBtn");
if (addMoneyBtn) addMoneyBtn.addEventListener("click", () => alert("Add money flow (Layer 2 wiring next)"));
if (withdrawBtn) withdrawBtn.addEventListener("click", () => alert("Withdraw flow (Layer 2 wiring next)"));
