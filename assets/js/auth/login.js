// PAY54 Login Logic (Phase 1 Demo)

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const emailInput = document.getElementById("email");
  const pinInput = document.getElementById("pin");

  if (!loginBtn) return;

  loginBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const pin = pinInput.value.trim();

    if (!email || !pin) {
      alert("Please enter email and PIN");
      return;
    }

    // Phase 1 demo authentication (no backend)
    PAY54Session.createSession({
      email,
      loggedInAt: new Date().toISOString()
    });

    // Redirect to dashboard
    window.location.href = "index.html";
  });
});
