import { API_BASE_URL } from "./config.js";

let token = "";
export let currentUser = null;

export async function authRequest(body) {
  const response = await fetch(`${API_BASE_URL}/auth.php`, {
    method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json", "X-CSRF-Token": token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Authentication unavailable");
  token = payload.csrf_token || "";
  currentUser = payload.user || null;
  return payload;
}

export function csrfToken() { return token; }

export async function requireLogin() {
  const form = document.querySelector("#login-form");
  const panel = document.querySelector("#login-panel");
  const error = document.querySelector("#login-error");
  const button = form.querySelector("button");
  try { await authRequest(); }
  catch (failure) { error.textContent = failure.message; }
  if (currentUser) { document.documentElement.dataset.auth = "ready"; return currentUser; }
  panel.hidden = false;
  document.querySelector("#username").focus();
  return new Promise((resolve) => {
    form.addEventListener("submit", async function submit(event) {
      event.preventDefault();
      button.disabled = true;
      error.textContent = "";
      try {
        if (!token) await authRequest();
        await authRequest({ action: "login", username: form.elements.username.value, password: form.elements.password.value });
        form.elements.password.value = "";
        form.removeEventListener("submit", submit);
        panel.hidden = true;
        document.documentElement.dataset.auth = "ready";
        document.querySelector("#main-content").focus();
        resolve(currentUser);
      } catch (failure) { error.textContent = failure.message; }
      finally { button.disabled = false; }
    });
  });
}

export function endSession(message = "Session expired. Please sign in again.") {
  currentUser = null;
  token = "";
  document.documentElement.dataset.auth = "pending";
  document.querySelector("#app-view").replaceChildren();
  document.querySelector("#anomaly-dialog")?.close();
  document.querySelector("#login-error").textContent = message;
}
