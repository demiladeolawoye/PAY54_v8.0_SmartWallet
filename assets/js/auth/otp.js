// PAY54 – OTP Verification (Phase 1 Demo Flow)

document.addEventListener("DOMContentLoaded", () => {
  const otpInput = document.getElementById("otp");
  const verifyBtn = document.getElementById("verifyBtn");

  if (!otpInput || !verifyBtn) return;

  verifyBtn.addEventListener("click", () => {
    const otp = otpInput.value.trim();

    // Phase 1 demo OTP
    if (otp === "123456") {
      alert("OTP verified successfully. Please log in.");

      // Clear any temporary signup state
      sessionStorage.removeItem("signupEmail");
      sessionStorage.removeItem("pendingOTP");

      // Redirect to login
      window.location.href = "login.html";
    } else {
      alert("Invalid OTP. Please try again.");
    }
  });
});
