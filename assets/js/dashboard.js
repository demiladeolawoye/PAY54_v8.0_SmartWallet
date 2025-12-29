// =========================
// PAY54 DASHBOARD LOGIC
// =========================

// Profile dropdown
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggle = document.getElementById("themeToggle");

profileBtn.addEventListener("click", () => {
  profileMenu.style.display =
    profileMenu.style.display === "block" ? "none" : "block";
});

// Logout (simple demo)
logoutBtn.addEventListener("click", () => {
  window.location.href = "login.html";
});

// Theme toggle
themeToggle.addEventListener("click", () => {
  const body = document.body;
  body.classList.toggle("theme-dark");
  body.classList.toggle("theme-light");
  themeToggle.textContent =
    body.classList.contains("theme-dark") ? "🌙" : "☀️";
});

// Profile email (if exists)
const email = localStorage.getItem("pay54_email");
if (email) {
  document.getElementById("profileEmail").textContent = email;
}
