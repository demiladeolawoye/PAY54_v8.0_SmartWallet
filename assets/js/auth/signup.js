document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("signupForm");

  if (!form) {
    console.error("Signup form not found");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const pin = document.getElementById("pin").value;
    const confirmPin = document.getElementById("confirmPin").value;

    if (!pin || !confirmPin) {
      alert("Please enter and confirm your PIN");
      return;
    }

    if (pin !== confirmPin) {
      alert("PINs do not match");
      return;
    }

    // Phase 1 demo logic (simulate successful signup)
    sessionStorage.setItem("pay54_signup_complete", "true");

    alert("Account created successfully. Please verify OTP.");

    // Redirect to OTP page
    window.location.href = "otp.html";
  });
});
