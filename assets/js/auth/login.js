document.getElementById("loginBtn").onclick = () => {
  const email = document.getElementById("email").value;
  const pin = document.getElementById("pin").value;
  const msg = document.getElementById("message");

  if (!email || !pin) {
    msg.textContent = "Please enter email and PIN";
    msg.className = "message error";
    return;
  }

  msg.textContent = "Login successful. Redirecting…";
  msg.className = "message success";

  setTimeout(() => {
    window.location.href = "index.html";
  }, 1000);
};
