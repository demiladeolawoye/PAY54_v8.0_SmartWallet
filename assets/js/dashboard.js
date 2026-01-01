// ================= BALANCES =================
const balances = {
  NGN: 1250000.50,
  GBP: 8420.75,
  USD: 15320.40,
  EUR: 11890.20,
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

// Currency buttons
document.querySelectorAll(".currency").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".currency").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const cur = btn.dataset.cur;
    balanceEl.textContent = `${symbols[cur]} ${balances[cur].toLocaleString()}`;
  };
});

// Mobile dropdown
const select = document.getElementById("currencySelect");
if (select) {
  select.onchange = () => {
    const cur = select.value;
    balanceEl.textContent = `${symbols[cur]} ${balances[cur].toLocaleString()}`;
  };
}

// Profile
document.getElementById("profileName").textContent =
  localStorage.getItem("pay54_name") || "Pese";

document.getElementById("profileEmail").textContent =
  localStorage.getItem("pay54_email") || "";

// Profile menu toggle
document.getElementById("profileBtn").onclick = () => {
  document.getElementById("profileMenu").classList.toggle("open");
};

// Logout
document.getElementById("logoutBtn").onclick = () => {
  alert("Logging out");
  window.location.href = "login.html";
};

// Theme toggle
document.getElementById("themeToggle").onclick = () => {
  document.body.classList.toggle("light");
};

// Stub interactions
document.querySelectorAll("button").forEach(btn => {
  if (!btn.id && !btn.classList.contains("currency")) {
    btn.addEventListener("click", () => {
      console.log("Action:", btn.innerText);
    });
  }
});
