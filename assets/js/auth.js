function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message ${type}`;
}

function redirect(url) {
  setTimeout(() => {
    window.location.href = url;
  }, 1200);
}

/* LOGIN */
function login(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  showMessage(msg, "Login successful", "success");
  redirect("dashboard.html");
}

/* SIGNUP */
function signup(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  showMessage(msg, "Account created successfully", "success");
  redirect("otp.html");
}

/* OTP */
function verifyOTP(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  showMessage(msg, "Verification successful", "success");
  redirect("login.html");
}

/* FORGOT PIN */
function sendReset(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  showMessage(msg, "Recovery email sent", "success");
  redirect("create-new-pin.html");
}

/* CREATE NEW PIN */
function savePin(e) {
  e.preventDefault();
  const msg = document.getElementById("msg");
  showMessage(msg, "PIN updated successfully", "success");
  redirect("login.html");
}
