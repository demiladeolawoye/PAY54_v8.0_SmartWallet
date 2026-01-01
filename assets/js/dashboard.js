// BALANCES
const balances = {
  NGN: 1250000.5,
  GBP: 8420.75,
  USD: 15320.4,
  EUR: 11890.2,
  GHS: 9650,
  KES: 132450
};

const symbols = {
  NGN: "₦", GBP: "£", USD: "$", EUR: "€", GHS: "₵", KES: "KSh"
};

const balanceEl = document.getElementById("balanceAmount");

// Currency buttons
document.querySelectorAll(".currency").forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll(".currency").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    updateBalance(btn.dataset.cur);
  };
});

document.getElementById("currencyDropdown")?.addEventListener("change",e=>{
  updateBalance(e.target.value);
});

function updateBalance(cur){
  balanceEl.textContent = `${symbols[cur]} ${balances[cur].toLocaleString()}`;
}

// PROFILE
document.getElementById("profileName").textContent =
  localStorage.getItem("pay54_name") || "Pese";
document.getElementById("profileEmail").textContent =
  localStorage.getItem("pay54_email") || "pese@gmail.com";

document.getElementById("profileBtn").onclick=()=>{
  document.querySelector(".profile-wrap").classList.toggle("open");
};

document.getElementById("logoutBtn").onclick=()=>{
  window.location.href="login.html";
};

// BUTTON ROUTING (Layer 1 stubs)
document.querySelectorAll("[data-route]").forEach(btn=>{
  btn.onclick=()=>alert(`Route: ${btn.dataset.route} (Layer 2 wiring next)`);
});

document.getElementById("addMoneyBtn").onclick=()=>alert("Add money flow");
document.getElementById("withdrawBtn").onclick=()=>alert("Withdraw flow");

// THEME
document.getElementById("themeToggle").onclick=()=>{
  document.body.classList.toggle("light");
};
