/* ==========================
   PAY54 AUTH LOGIC (OPTION 2 — STABLE)
========================== */

const PIN_REGEX = /^\d{4}$/;
const PAY54_DEV_AUTH_HANDOFF_KEY =
    "pay54_dev_auth_handoff";

const PAY54_DEV_AUTH_HANDOFF_TTL_MS =
    60 * 1000;

function createDevelopmentAuthHandoff(
    email
) {

    const normalisedEmail =
        String(
            email || ""
        )
        .trim()
        .toLowerCase();

    if (
        !normalisedEmail
    ) {

        throw new Error(
            "Authenticated email is required."
        );
    }

    const cryptoApi =
        window.crypto;

    if (
        !cryptoApi ||
        typeof cryptoApi.getRandomValues !==
            "function"
    ) {

        throw new Error(
            "Secure browser randomness is unavailable."
        );
    }

    const bytes =
        new Uint8Array(
            16
        );

    cryptoApi.getRandomValues(
        bytes
    );

    const nonce =
        Array.from(
            bytes,
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        )
        .join("");

    const issuedAt =
        Date.now();

    const handoff = {

        schema:
            "PAY54-DEV-AUTH-HANDOFF-V1",

        email:
            normalisedEmail,

        issuedAt,

        expiresAt:
            issuedAt +
            PAY54_DEV_AUTH_HANDOFF_TTL_MS,

        nonce
    };

    sessionStorage.setItem(
        PAY54_DEV_AUTH_HANDOFF_KEY,
        JSON.stringify(
            handoff
        )
    );

    return handoff;
}

// ---------- Utilities ----------
function showMessage(text, type = "error") {
  const msg = document.getElementById("msg");
  if (!msg) return;
  msg.textContent = text;
  msg.className = "message " + type;
}

// ---------- Force clean auth state on load ----------
window.addEventListener("load", () => {
  // Force-clear input fields only (prevents browser autofill)
  document.querySelectorAll("input").forEach(input => {
    input.value = "";
  });
});

// ---------- SIGN UP ----------
function signup(e) {

  e.preventDefault();

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const country = document.getElementById("signup-country").value;
  const phone = document.getElementById("signup-phone").value.trim();

  const pin = document.getElementById("signup-pin").value.trim();
  const confirmPin = document.getElementById("signup-confirm-pin").value.trim();

  if (!name || !email || !phone) {
    return showMessage("Please complete all fields");
  }

  if (!PIN_REGEX.test(pin)) {
    return showMessage("PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    return showMessage("PINs do not match");
  }

  const fullPhone = country + phone;

  localStorage.setItem("pay54_name", name);
  localStorage.setItem("pay54_email", email);
  localStorage.setItem("pay54_phone", fullPhone);
  localStorage.setItem("pay54_pin", pin);

  localStorage.setItem("pay54_pending_verification", "true");

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

try {

    createDevelopmentAuthHandoff(
        email
    );

} catch (
    error
) {

    console.error(
        "[PAY54_AUTH] Development authentication handoff failed.",
        error
    );

    return showMessage(
        "Unable to establish a secure session. Please try again."
    );
}

showMessage(
    "Login successful",
    "success"
);

setTimeout(
    () => {

        window.location.href =
            "dashboard.html";
    },
    1000
); 
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
