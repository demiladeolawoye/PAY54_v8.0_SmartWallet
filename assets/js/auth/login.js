PAY54Session.preventAuthPages();

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("error");
const togglePin = document.getElementById("togglePin");
const pinInput = document.getElementById("pin");

togglePin.addEventListener("click", () => {
  pinInput.type = pinInput.type === "password" ? "text" : "password";
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = document.getElementById("email").value.trim();
  const pin = pinInput.value.trim();

  if (!email || !pin) {
    errorBox.textContent = "All fields are required.";
    return;
  }

  // Demo auth (MVP)
  PAY54Session.createSession({ email });
  window.location.href = "index.html";
});

