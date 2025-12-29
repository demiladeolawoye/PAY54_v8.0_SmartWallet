/* ==========================
   PAY54 AUTH LOGIC (OPTION 2 — STABLE)
========================== */

const PIN_REGEX = /^\d{4}$/;

// ---------- Utilities ----------
function showMessage(text, type = "error") {
  const msg = document.getElementById("msg");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "message " + type;
}

// ---------- Force clean auth state on load ----------
window.addEventListener("load", () => {
  // Never auto-fill PINs
  localStorage.removeItem("pay54_pin");

  // Force-clear all inputs (beats browser autofill)
  document.querySelectorAll("input").forEach(input => {
    input.value = "";
  });
});

// ---------- SIGN UP ----------
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
  window.location.href = "verify-otp.html";
}, 1200);

}

// ---------- LOGIN ----------
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

// ---------- FORGOT PIN ----------
function sendReset(e) {
  e.preventDefault();

  const emailInput = document.querySelector("input[type='email']");
  const email = emailInput.value.trim();
  const storedEmail = localStorage.getItem("pay54_email");

  if (!email) {
    return showMessage("Please enter your registered email");
  }

  if (email !== storedEmail) {
    return showMessage("Email not recognised");
  }

  showMessage("Reset verified. Create a new PIN", "success");

  setTimeout(() => {
    window.location.href = "create-new-pin.html";
  }, 1200);
}

// ---------- CREATE NEW PIN ----------
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
/* ---------- VERIFY OTP ---------- */
function verifyOtp(e) {
  e.preventDefault();

  const otp = document.getElementById("otp").value.trim();

  if (!/^\d{6}$/.test(otp)) {
    return showMessage("OTP must be 6 digits");
  }

  // Mock verification success
  localStorage.removeItem("pay54_pending_verification");

  showMessage("Verification successful", "success");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
}
