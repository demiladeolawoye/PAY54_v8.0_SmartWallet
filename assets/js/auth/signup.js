PAY54Session.preventAuthPages();

const form = document.getElementById("signupForm");
const errorBox = document.getElementById("error");
const togglePin = document.getElementById("togglePin");
const pinInput = document.getElementById("pin");

togglePin.addEventListener("click", () => {
  pinInput.type = pinInput.type === "password" ? "text" : "password";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const pin = pinInput.value.trim();

  if (!name || !email || !pin) {
    errorBox.textContent = "All fields are required.";
    return;
  }

  // Store temp signup data
  localStorage.setItem("pay54_pending_signup", JSON.stringify({ name, email }));
  window.location.href = "otp.html";
});

