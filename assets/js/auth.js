/* ==========================
   PAY54 AUTH LOGIC (OPTION 2)
========================== */

const PIN_REGEX = /^\d{4}$/;

// Utility
function showMessage(text, type = "error") {
  const msg = document.getElementById("msg");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "message " + type;
}

// Clear sensitive autofill on load (signup & reset)
window.addEventListener("load", () => {
  const page = window.location.pathname;

  if (page.includes("signup") || page.includes("create-new-pin")) {
    localStorage.removeItem("pay54_email");
    localStorage.removeItem("pay54_pin");
  }
});

/* ---------- SIGN UP ---------- */
function signup(e) {
  e.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pin = document.getElementById("signup-pin").value.trim();
  const confirmPin = document.getElementById("signup-confirm-pin").value.trim();

  if (!name || !email) {
    return showMessage("Please complete all fields");
  }

  if (!PIN_REGEX.test(pin)) {
    return showMessage("PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    return showMessage("PINs do not match");
  }

  localStorage.setItem("pay54_email", email);
  localStorage.setItem("pay54_pin", pin);

  showMessage("Account created successfully", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
}

/* ---------- LOGIN ---------- */
function login(e) {
  e.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  const storedEmail = localStorage.getItem("pay54_email");
  const storedPin = localStorage.getItem("pay54_pin");

  if (!email || !pin) {
    return showMessage("Enter email and PIN");
  }

  if (!PIN_REGEX.test(pin)) {
    return showMessage("PIN must be 4 digits");
  }

  if (email !== storedEmail || pin !== storedPin) {
    return showMessage("Invalid email or PIN");
  }

  showMessage("Login successful", "success");

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1000);
}

/* ---------- RESET PIN ---------- */
function savePin(e) {
  e.preventDefault();

  const email = document.getElementById("reset-email").value.trim();
  const pin = document.getElementById("reset-pin").value.trim();
  const confirmPin = document.getElementById("reset-confirm-pin").value.trim();

  const storedEmail = localStorage.getItem("pay54_email");

  if (email !== storedEmail) {
    return showMessage("Email not recognised");
  }

  if (!PIN_REGEX.test(pin)) {
    return showMessage("PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    return showMessage("PINs do not match");
  }

  localStorage.setItem("pay54_pin", pin);

  showMessage("PIN updated successfully", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
}
