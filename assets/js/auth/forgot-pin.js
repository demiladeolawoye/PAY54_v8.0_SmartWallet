PAY54Session.preventAuthPages();

const form = document.getElementById("resetForm");
const errorBox = document.getElementById("error");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  errorBox.textContent = "";

  const email = document.getElementById("email").value.trim();

  if (!email) {
    errorBox.textContent = "Email is required.";
    return;
  }

  alert("Reset link sent (demo).");
  window.location.href = "login.html";
});

