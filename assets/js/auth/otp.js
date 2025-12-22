// PAY54 – OTP Verification (Phase 1 Demo)

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("otpForm");
  const otpInput = document.getElementById("otp");

  if (!form || !otpInput) {
    console.error("OTP form or input not found");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const otp = otpInput.value.trim();

    if (otp === "123456") {
      alert("OTP verified successfully. Please log in.");
      window.location.href = "login.html";
    } else {
      alert("Invalid OTP. Please try again.");
    }
  });
});
