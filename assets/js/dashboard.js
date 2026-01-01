const balances = {
  NGN: 1250000.5,
  GBP: 8420.75,
  USD: 15320.4,
  EUR: 11890.2,
  GHS: 9650,
  KES: 132450
};

const symbols = {
  NGN: "₦",
  GBP: "£",
  USD: "$",
  EUR: "€",
  GHS: "₵",
  KES: "KSh"
};

const balanceEl = document.getElementById("balanceAmount");
const currencyBtns = document.querySelectorAll(".currency");
const currencySelect = document.getElementById("currencySelect");

function updateBalance(cur) {
  balanceEl.textContent =
    `${symbols[cur]} ${balances[cur].toLocaleString()}`;
}

currencyBtns.forEach(btn => {
  btn.onclick = () => {
    currencyBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    updateBalance(btn.dataset.cur);
  };
});

if (currencySelect) {
  currencySelect.onchange = () => {
    updateBalance(currencySelect.value);
  };
}

// Profile
document.getElementById("profileName").textContent =
  localStorage.getItem("pay54_name") || "Pese";

document.getElementById("profileEmail").textContent =
  localStorage.getItem("pay54_email") || "pese@gmail.com";

// Logout
document.getElementById("logoutBtn").onclick = () => {
  window.location.href = "login.html";
};

// Placeholder interactions
document.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    console.log("Clicked:", btn.textContent.trim());
  });
});
