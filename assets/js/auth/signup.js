document.getElementById("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const pin = document.getElementById("pin").value;
  const confirmPin = document.getElementById("confirmPin").value;

  if (pin !== confirmPin) {
    alert("PINs do not match");
    return;
  }

  // Simulate account creation (Phase 1 demo logic)
  sessionStorage.setItem("pendingUser", "true");

  // Success feedback
  alert("Account created successfully. Please verify OTP.");

  // Redirect to OTP page
  window.location.href = "otp.html";
});
