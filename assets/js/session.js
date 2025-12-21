/* PAY54 v8.0 — Session Engine
   Controls authentication state and route protection
*/

const PAY54_SESSION_KEY = "pay54_session_active";

/* -------------------------
   Session Helpers
-------------------------- */
function createSession(user) {
  localStorage.setItem(PAY54_SESSION_KEY, JSON.stringify({
    active: true,
    user,
    createdAt: Date.now()
  }));
}

function destroySession() {
  localStorage.removeItem(PAY54_SESSION_KEY);
  window.location.href = "login.html";
}

function getSession() {
  const session = localStorage.getItem(PAY54_SESSION_KEY);
  return session ? JSON.parse(session) : null;
}

function isAuthenticated() {
  const session = getSession();
  return session && session.active === true;
}

/* -------------------------
   Auth Guard
-------------------------- */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.replace("login.html");
  }
}

function preventAuthPages() {
  if (isAuthenticated()) {
    window.location.replace("index.html");
  }
}

/* -------------------------
   Expose Globally
-------------------------- */
window.PAY54Session = {
  createSession,
  destroySession,
  getSession,
  isAuthenticated,
  requireAuth,
  preventAuthPages
};

