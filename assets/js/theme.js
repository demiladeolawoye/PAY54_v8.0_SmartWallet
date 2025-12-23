const toggleBtn = document.getElementById("themeToggle");

if (toggleBtn) {
  toggleBtn.onclick = () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("pay54_theme", isDark ? "dark" : "light");
    toggleBtn.textContent = isDark ? "🌙" : "☀️";
  };
}

// Load persisted theme
const savedTheme = localStorage.getItem("pay54_theme");
if (savedTheme === "light") {
  document.body.classList.remove("dark");
}

