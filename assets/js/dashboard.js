// ===== Header controls =====
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

profileBtn.onclick = () => {
  profileMenu.style.display =
    profileMenu.style.display === "block" ? "none" : "block";
};

logoutBtn.onclick = () => (window.location.href = "login.html");

// Theme (persisted)
const savedTheme = localStorage.getItem("pay54_theme") || "dark";
document.body.className = `theme-${savedTheme}`;
themeToggle.textContent = savedTheme === "dark" ? "🌙" : "☀️";

themeToggle.onclick = () => {
  const next = document.body.classList.contains("theme-dark") ? "light" : "dark";
  document.body.className = `theme-${next}`;
  localStorage.setItem("pay54_theme", next);
  themeToggle.textContent = next === "dark" ? "🌙" : "☀️";
};

// Profile email
const email = localStorage.getItem("pay54_email");
if (email) document.getElementById("profileEmail").textContent = email;

// ===== Balance logic (mock, spec-aligned) =====
const balances = {
  NGN: "₦ 250,000.00",
  GBP: "£ 420.00",
  USD: "$ 510.00",
  EUR: "€ 300.00",
  GHS: "₵ 2,100.00",
  KES: "KSh 45,000.00",
  ZAR: "R 3,800.00"
};

const amountEl = document.getElementById("balanceAmount");
const currencyRow = document.getElementById("currencyRow");

currencyRow.addEventListener("click", (e) => {
  if (!e.target.classList.contains("currency")) return;

  document.querySelectorAll(".currency").forEach(b => b.classList.remove("active"));
  e.target.classList.add("active");

  const cur = e.target.dataset.cur;
  amountEl.textContent = balances[cur];
});

// Default currency = NGN
amountEl.textContent = balances.NGN;
