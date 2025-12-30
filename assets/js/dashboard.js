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
const currencyBtns = document.querySelectorAll(".currency");

currencyBtns.forEach(btn=>{
  btn.onclick=()=>{
    currencyBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const c=btn.dataset.cur;
    balanceEl.textContent =
      `${symbols[c]} ${balances[c].toLocaleString()}`;
  }
});

// Profile
document.getElementById("profileName").textContent =
  localStorage.getItem("pay54_name") || "Pese";
document.getElementById("profileEmail").textContent =
  localStorage.getItem("pay54_email") || "";

// Logout
document.getElementById("logoutBtn").onclick=()=>{
  window.location.href="login.html";
};

// Alerts clear
document.getElementById("clearAlerts").onclick=()=>{
  document.getElementById("alerts").innerHTML="<li>No alerts</li>";
};
