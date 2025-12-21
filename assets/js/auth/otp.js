PAY54Session.preventAuthPages();

const form = document.getElementById("otpForm");
const errorBox = document.getElementById("error");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const otp = document.getElementById("otp").value.trim();
  const pending = localStorage.getItem("pay54_pending_signup");

  if (!otp || otp.length !== 6) {
    errorBox.textContent = "Invalid OTP.";
    return;
  }

  if (!pending) {
    errorBox.textContent = "Signup session expired.";
    return;
  }

  const user = JSON.parse(pending);
  localStorage.removeItem("pay54_pending_signup");

  PAY54Session.createSession(user);
  window.location.href = "index.html";
});

