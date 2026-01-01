// PAY54 Dashboard v8 — Layer 1 interactions + UI behaviour

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

const els = {
  balanceAmount: document.getElementById("balanceAmount"),
  currencyBtns: document.querySelectorAll(".currency"),
  currencyDropdown: document.getElementById("currencyDropdown"),
  themeToggle: document.getElementById("themeToggle"),
  profileBtn: document.getElementById("profileBtn"),
  profileMenu: document.getElementById("profileMenu"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  profileAvatar: document.getElementById("profileAvatar"),
  logoutBtn: document.getElementById("logoutBtn"),
  clearAlerts: document.getElementById("clearAlerts"),
  alertsFeed: document.getElementById("alertsFeed"),
  toast: document.getElementById("toast")
};

// ---------- Toast ----------
let toastTimer = null;
function toast(msg){
  if(!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>els.toast.classList.remove("show"), 1600);
}

// ---------- Profile identity ----------
function getStoredName(){
  return (localStorage.getItem("pay54_name") || "").trim();
}
function getStoredEmail(){
  return (localStorage.getItem("pay54_email") || "").trim();
}

const name = getStoredName() || "Pese";
const email = getStoredEmail() || "pese@gmail.com";

if (els.profileName) els.profileName.textContent = name;
if (els.profileEmail) els.profileEmail.textContent = email;

if (els.profileAvatar){
  const initial = (name[0] || "P").toUpperCase();
  els.profileAvatar.textContent = initial;
}

// ---------- Theme ----------
function applyTheme(theme){
  document.body.classList.toggle("light", theme === "light");
  if (els.themeToggle){
    els.themeToggle.querySelector(".icon").textContent = theme === "light" ? "🌙" : "☀️";
    els.themeToggle.title = theme === "light" ? "Switch to dark" : "Switch to light";
  }
  localStorage.setItem("pay54_theme", theme);
}

applyTheme(localStorage.getItem("pay54_theme") || "dark");

if (els.themeToggle){
  els.themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light");
    applyTheme(isLight ? "dark" : "light");
    toast(isLight ? "Dark mode enabled" : "Light mode enabled");
  });
}

// ---------- Currency logic ----------
function formatMoney(cur, amount){
  // Keep premium formatting and avoid long decimals
  const safe = Number(amount || 0);
  const formatted = safe.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${symbols[cur] || ""} ${formatted}`.trim();
}

function setCurrency(cur){
  // Update pills
  els.currencyBtns.forEach(b => {
    b.classList.toggle("active", b.dataset.cur === cur);
  });

  // Update dropdown (mobile)
  if (els.currencyDropdown && els.currencyDropdown.value !== cur){
    els.currencyDropdown.value = cur;
  }

  // Update balance
  if (els.balanceAmount){
    els.balanceAmount.textContent = formatMoney(cur, balances[cur]);
  }

  localStorage.setItem("pay54_active_currency", cur);
}

const initialCur = localStorage.getItem("pay54_active_currency") || "NGN";
setCurrency(initialCur);

// Pills click
els.currencyBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const cur = btn.dataset.cur;
    setCurrency(cur);
    toast(`Currency switched: ${cur}`);
  });
});

// Dropdown change
if (els.currencyDropdown){
  els.currencyDropdown.addEventListener("change", (e) => {
    setCurrency(e.target.value);
    toast(`Currency switched: ${e.target.value}`);
  });
}

// ---------- Profile menu ----------
function openProfileMenu(open){
  if (!els.profileMenu || !els.profileBtn) return;
  els.profileMenu.classList.toggle("open", open);
  els.profileBtn.setAttribute("aria-expanded", String(open));
}

if (els.profileBtn && els.profileMenu){
  els.profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openProfileMenu(!els.profileMenu.classList.contains("open"));
  });

  // Close on outside click
  document.addEventListener("click", () => openProfileMenu(false));
  els.profileMenu.addEventListener("click", (e) => e.stopPropagation());
}

// Menu actions
document.querySelectorAll(".menu-item[data-action]").forEach(item => {
  item.addEventListener("click", () => {
    const action = item.dataset.action;
    openProfileMenu(false);

    if (action === "logout"){
      // keep consistent with your current demo flow
      window.location.href = "login.html";
      return;
    }

    toast(`${action.replace(/_/g," ")} (Layer 2 wiring)`);
  });
});

// Explicit logout button (in case you keep id)
if (els.logoutBtn){
  els.logoutBtn.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// ---------- Clear alerts ----------
if (els.clearAlerts && els.alertsFeed){
  els.clearAlerts.addEventListener("click", () => {
    els.alertsFeed.innerHTML = `
      <div class="feed-item">
        <div class="feed-icon">✅</div>
        <div class="feed-body">
          <div class="feed-title">All caught up</div>
          <div class="feed-sub">No requests or alerts</div>
        </div>
      </div>
    `;
    toast("Alerts cleared");
  });
}

// ---------- Make ALL tiles/buttons respond (Layer 1) ----------
function bindActionButtons(){
  document.querySelectorAll("[data-action]").forEach(el => {
    // Avoid double-binding for profile menu items already bound above
    if (el.classList.contains("menu-item")) return;

    el.addEventListener("click", () => {
      const action = el.dataset.action;

      // Layer 1: responsive + premium feedback
      // Layer 2: you will replace these with spec-accurate routing/flows
      const map = {
        add_money: "Add money",
        withdraw: "Withdraw",
        send_pay54: "Send PAY54 → PAY54",
        receive: "Receive details (tag & QR)",
        bank_transfer: "Bank transfer",
        request_money: "Request money",
        cross_border_fx: "Cross-border FX",
        pay_bills: "Pay Bills & Top",
        savings_goals: "Savings & Goals",
        virtual_cards: "Virtual cards",
        smart_checkout: "PAY54 Smart Checkout",
        shop_on_fly: "Shop on the Fly",
        investments: "Investments & Stocks",
        bet_funding: "Bet Funding",
        become_agent: "Become an Agent",
        ai_risk_watch: "AI Risk Watch",
        open_savings: "Open Savings Pot",
        view_all_tx: "View all transactions"
      };

      toast(`${map[action] || "Action"} — Layer 2 wiring next`);
    });
  });
}

bindActionButtons();
