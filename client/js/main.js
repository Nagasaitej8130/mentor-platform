const API = "/api";

// keeping track of connection states globally so different parts of the app can access them
let myConnections = [];
let sentRequests = [];
let receivedRequests = [];
let myConnectionDocs = []; // full connection docs so we can delete by connection ID

// formats a date into readable time — shows "Apr 26, 12:06 PM" style
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── UTILITY HELPERS ─────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // check if token is expired
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      return null;
    }
    return payload.id;
  } catch {
    return null;
  }
}

function requireAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return false;
  }
  // check expiry
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem("token");
      showToast("Session expired. Please log in again.", "warning");
      setTimeout(() => window.location.href = "login.html", 1200);
      return false;
    }
  } catch {
    localStorage.removeItem("token");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` };
}

function jsonAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };
}

// handles 401 errors from any API call - session expired
function handleApiError(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    showToast("Session expired. Please log in again.", "warning");
    setTimeout(() => window.location.href = "login.html", 1200);
    return true;
  }
  return false;
}

// format a date nicely for display (e.g. "2:30 PM" or "Apr 25, 2:30 PM")
function formatTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " +
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── TOAST NOTIFICATIONS ────────────────────────────────────────────────────

function showToast(message, type = "info") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : type === "error" ? "✕" : type === "warning" ? "⚠" : "ℹ"}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── CONFIRM DIALOG ─────────────────────────────────────────────────────────

function showConfirmDialog(message, onConfirm) {
  // remove any existing dialog
  const existing = document.getElementById("confirmOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "confirmOverlay";
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-card">
      <p class="confirm-msg">${escapeHtml(message)}</p>
      <div class="confirm-actions">
        <button class="btn-outline" id="confirmCancel">Cancel</button>
        <button class="btn-danger" id="confirmOk">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  document.getElementById("confirmCancel").onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 200);
  };
  document.getElementById("confirmOk").onclick = () => {
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 200);
    onConfirm();
  };
}

// ─── LAYOUT ─────────────────────────────────────────────────────────────────

async function loadLayout(pageTitle) {
  try {
    const sidebarRes = await fetch("../components/sidebar.html");
    const sidebarHtml = await sidebarRes.text();
    document.getElementById("sidebar").innerHTML = sidebarHtml;

    const navRes = await fetch("../components/navbar.html");
    const navHtml = await navRes.text();
    document.getElementById("navbar").innerHTML = navHtml;

    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.innerText = pageTitle;

    highlightActiveNav();
    loadCurrentUserName();
    loadNotifications();
    loadChatUnreadCount(); // load the chat unread badge in the sidebar

    // register this socket connection to the user's personal notification room
    const userId = getUserIdFromToken();
    if (userId && typeof io !== "undefined") {
      if (!window._socket) {
        window._socket = io();
        window._socket.on("newNotification", () => {
          loadNotifications(); // refresh the bell badge
        });
        window._socket.on("newUnreadMessage", () => {
          loadChatUnreadCount(); // refresh the sidebar chat badge
        });
      }
      window._socket.emit("registerUser", userId);
    }

    if (!document.getElementById("sidebarOverlay")) {
      const overlay = document.createElement("div");
      overlay.id = "sidebarOverlay";
      overlay.className = "sidebar-overlay";
      overlay.onclick = toggleSidebar;
      document.body.appendChild(overlay);
    }
  } catch (err) {
    console.error("Layout load error:", err);
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.toggle("open");
  if (overlay) overlay.classList.toggle("show");
}

function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".sidebar nav a").forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.includes(currentPage)) link.classList.add("active");
  });
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      showToast("Login successful!", "success");
      setTimeout(() => window.location.href = "dashboard.html", 800);
    } else {
      showToast(data.message || "Login failed", "error");
    }
  } catch (err) {
    showToast("Network error. Is the server running?", "error");
  }
}

async function register() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const role = document.getElementById("role").value;

  if (!name || !email || !password || !confirmPassword || !role) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast("Please enter a valid email address", "warning");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "warning");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Registration successful! Redirecting...", "success");
      setTimeout(() => window.location.href = "login.html", 1000);
    } else {
      showToast(data.message || "Registration failed", "error");
    }
  } catch (err) {
    showToast("Network error. Is the server running?", "error");
  }
}

function confirmLogout() {
  showConfirmDialog("Are you sure you want to logout?", logout);
}

function logout() {
  localStorage.removeItem("token");
  showToast("Logged out", "info");
  setTimeout(() => window.location.href = "login.html", 600);
}

// ── FORGOT PASSWORD — 3-STEP OTP FLOW ─────────────────────────────────────
// stores the email between steps so we can include it with the OTP verification
let _forgotEmail = "";

function showLoginSection() {
  const s = { loginSection: "block", forgotStep1: "none", forgotStep2: "none" };
  Object.entries(s).forEach(([id, d]) => { const el = document.getElementById(id); if (el) el.style.display = d; });
}

function showForgotStep1() {
  const s = { loginSection: "none", forgotStep1: "block", forgotStep2: "none" };
  Object.entries(s).forEach(([id, d]) => { const el = document.getElementById(id); if (el) el.style.display = d; });
}

function showForgotStep2(email) {
  _forgotEmail = email;
  const subtitle = document.getElementById("otpSubtitle");
  if (subtitle) subtitle.textContent = `OTP sent to ${email}. Check your inbox.`;
  const s = { loginSection: "none", forgotStep1: "none", forgotStep2: "block" };
  Object.entries(s).forEach(([id, d]) => { const el = document.getElementById(id); if (el) el.style.display = d; });
}

async function sendOtp() {
  const email = document.getElementById("forgotEmail")?.value.trim();
  if (!email) { showToast("Please enter your email address", "warning"); return; }
  const btn = document.querySelector("#forgotStep1 .auth-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Sending..."; }
  try {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      showForgotStep2(email);
    } else {
      showToast(data.message || "Failed to send OTP", "error");
    }
  } catch (err) {
    showToast("Network error. Is the server running?", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Send OTP"; }
  }
}

async function resetPasswordWithOtp() {
  const otp = document.getElementById("otpInput")?.value.trim();
  const newPassword = document.getElementById("newPassword")?.value;
  const confirmNewPassword = document.getElementById("confirmNewPassword")?.value;

  if (!otp || otp.length !== 6) { showToast("Please enter the 6-digit OTP", "warning"); return; }
  if (!newPassword) { showToast("Please enter a new password", "warning"); return; }
  if (newPassword.length < 6) { showToast("Password must be at least 6 characters", "warning"); return; }
  if (newPassword !== confirmNewPassword) { showToast("Passwords do not match", "error"); return; }

  const btn = document.querySelector("#forgotStep2 .auth-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Resetting..."; }
  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: _forgotEmail, otp, newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      setTimeout(() => showLoginSection(), 1500);
    } else {
      showToast(data.message || "Reset failed", "error");
    }
  } catch (err) {
    showToast("Network error. Please try again.", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Reset Password"; }
  }
}

// kept for backward compatibility with reset-password.html (token in URL)
async function resetPassword() {
  const newPassword = document.getElementById("newPassword")?.value;
  const confirmNewPassword = document.getElementById("confirmNewPassword")?.value;
  if (!newPassword || !confirmNewPassword) { showToast("Please fill in both fields", "warning"); return; }
  if (newPassword.length < 6) { showToast("Password must be at least 6 characters", "warning"); return; }
  if (newPassword !== confirmNewPassword) { showToast("Passwords do not match", "error"); return; }
  // this page is no longer the primary flow but kept as fallback
  showToast("Please use the Forgot Password flow on the login page.", "info");
}

// toggle password field between text and password type
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.textContent = "🙈";
  } else {
    input.type = "password";
    if (icon) icon.textContent = "👁";
  }
}

// ─── PROFILE COMPLETION CHECK ────────────────────────────────────────────────

async function checkProfileCompletion() {
  try {
    const res = await fetch(`${API}/auth/profile`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const user = await res.json();

    // check which key fields are missing
    const missing = [];
    if (!user.bio) missing.push("bio");
    if (!user.skills || user.skills.length === 0) missing.push("skills");

    if (user.role === "mentor") {
      if (!user.company) missing.push("company");
      if (!user.expertise || user.expertise.length === 0) missing.push("expertise");
    }
    if (user.role === "entrepreneur") {
      if (!user.startupName) missing.push("startup name");
      if (!user.industry) missing.push("industry");
    }

    if (missing.length > 0) {
      showProfileCompletionModal(missing);
    }
  } catch (err) {
    console.error("Profile check error:", err);
  }
}

function showProfileCompletionModal(missingFields) {
  const existing = document.getElementById("profileCompletionModal");
  if (existing) return;

  // slide-in banner from bottom-right, like a notification
  const banner = document.createElement("div");
  banner.id = "profileCompletionModal";
  banner.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 9999;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-left: 4px solid var(--accent);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    padding: 24px 28px;
    max-width: 360px;
    width: 100%;
    animation: slideInRight 0.35s cubic-bezier(.4,0,.2,1);
  `;
  banner.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <p style="font-weight:700; font-size:15px; color:var(--text-primary); margin:0 0 4px;">Complete Your Profile</p>
        <p style="font-size:12px; color:var(--accent); margin:0; font-weight:600; text-transform:uppercase; letter-spacing:.5px;">Action Required</p>
      </div>
      <button onclick="document.getElementById('profileCompletionModal').remove()"
        style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted);padding:0;line-height:1;">&times;</button>
    </div>
    <p style="font-size:13px; color:var(--text-secondary); margin:0 0 6px; line-height:1.6;">
      Missing: <strong style="color:var(--text-primary);">${missingFields.join(", ")}</strong>
    </p>
    <p style="font-size:13px; color:var(--text-secondary); margin:0 0 18px;">A complete profile gets you better matches.</p>
    <div style="display:flex; gap:10px;">
      <button id="goUpdateProfile" style="flex:1;">Complete Profile</button>
      <button id="dismissProfile" class="btn-outline">Later</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById("dismissProfile").onclick = () => banner.remove();
  document.getElementById("goUpdateProfile").onclick = () => window.location.href = "update.html";

  // auto-dismiss after 12 seconds
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function loadDashboard() {
  if (!requireAuth()) return;

  await loadConnections();
  loadDashboardStats();
  checkProfileCompletion();

  // load mentor/entrepreneur suggestions
  try {
    const res1 = await fetch(`${API}/match`, { headers: authHeaders() });
    if (handleApiError(res1)) return;
    const suggestions = await res1.json();
    const suggestionsDiv = document.getElementById("suggestions");
    if (suggestionsDiv) {
      suggestionsDiv.innerHTML = "";
      if (!suggestions.length) {
        suggestionsDiv.innerHTML = `<div class="empty-state"><p>No suggestions yet. Update your profile and skills!</p></div>`;
      } else {
        suggestions.forEach(item => {
          const user = item.user;
          const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);
          const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

          const isConnected = myConnections.includes(user._id);
          const isSent = sentRequests.includes(user._id);
          const isReceived = receivedRequests.includes(user._id);

          let btn = "";
          if (isConnected) {
            btn = `<button class="btn-success btn-small" disabled>Connected</button>`;
          } else if (isSent) {
            btn = `<button class="btn-muted btn-small" disabled>Requested</button>`;
          } else if (isReceived) {
            btn = `<button class="btn-success btn-small" onclick="acceptFromSearch('${user._id}')">Accept</button>`;
          } else {
            btn = `<button class="btn-small" onclick="sendRequest('${user._id}')">Connect</button>`;
          }

          // build skills preview tags
          const skillTags = (user.skills || []).slice(0, 4).map(s =>
            `<span class="skill-tag" style="display:inline-block; font-size:11px; background:#e2f7f2; color:#0e7a68; padding:3px 8px; border-radius:12px; margin-right:6px; margin-top:4px;">${escapeHtml(s)}</span>`
          ).join("");

          // extra detail line depending on role — no emojis
          let detailLine = "";
          if (user.role === "mentor" && user.company) {
            detailLine = `<span class="user-detail">${escapeHtml(user.company)}${user.currentRole ? ` · ${escapeHtml(user.currentRole)}` : ""}</span>`;
          } else if (user.role === "entrepreneur" && user.startupName) {
            detailLine = `<span class="user-detail">${escapeHtml(user.startupName)}${user.industry ? ` · ${escapeHtml(user.industry)}` : ""}</span>`;
          }

          // bio preview (first 90 chars)
          const bioPreview = user.bio ? `<p class="user-bio-preview">${escapeHtml(user.bio.slice(0, 90))}${user.bio.length > 90 ? "…" : ""}</p>` : "";

          const div = document.createElement("div");
          div.classList.add("user-card", "suggestion-card");

          // extra detail line (company/startup · industry)
          let detail = "";
          let extraDetail = "";
          if (user.role === "mentor") {
            const parts = [user.company, user.currentRole].filter(Boolean);
            if (parts.length) detail = parts.join(" · ");
            if (user.experienceYears) {
              extraDetail = `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 6px;">🎓 ${escapeHtml(user.experienceYears.toString())} Years Experience</div>`;
            }
          } else if (user.role === "entrepreneur") {
            const parts = [user.startupName, user.industry].filter(Boolean);
            if (parts.length) detail = parts.join(" · ");
            if (user.idea) {
              let ideaPreview = user.idea.split('\n')[0];
              const isLong = ideaPreview.length > 75 || user.idea.split('\n').length > 1;
              if (ideaPreview.length > 75) ideaPreview = ideaPreview.substring(0, 75) + "...";
              extraDetail = `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 6px;">💡 <strong>Idea:</strong> ${escapeHtml(ideaPreview)} ${isLong ? `<a href="view-profile.html?id=${user._id}" style="font-size: 12px; margin-left: 4px; text-decoration: underline;">read more</a>` : `<a href="view-profile.html?id=${user._id}" style="font-size: 12px; margin-left: 4px; text-decoration: underline;">view</a>`}</div>`;
            }
          }

          div.innerHTML = `
            <div class="suggestion-left">
              <div class="avatar">${initials}</div>
              <div class="suggestion-info">
                <div style="display: flex; align-items: baseline; gap: 6px;">
                  <a href="view-profile.html?id=${user._id}" class="suggestion-name profile-link">${escapeHtml(user.name)}</a>
                  <span style="font-size: 12px; color: var(--text-muted); text-transform: capitalize;">${escapeHtml(user.role)}</span>
                </div>
                ${detail ? `<span class="suggestion-detail" style="display:block; margin-bottom: 4px;">${escapeHtml(detail)}</span>` : ""}
                ${extraDetail}
                <div class="suggestion-skills">
                  ${skillTags ? skillTags : ""}
                  <span class="match-badge" style="margin-left: ${skillTags ? '8px' : '0'};">
                    Match Score: ${item.score}
                  </span>
                </div>
              </div>
            </div>
            <div class="suggestion-right">
              ${btn}
            </div>
          `;
          suggestionsDiv.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading suggestions:", err);
  }

  loadNotifications();

  // upcoming meetings on the dashboard
  try {
    const res2 = await fetch(`${API}/meetings`, { headers: authHeaders() });
    const meetings = await res2.json();
    const meetingsDiv = document.getElementById("meetings");
    if (meetingsDiv) {
      meetingsDiv.innerHTML = "";
      if (!meetings.length) {
        meetingsDiv.innerHTML = `<div class="empty-state"><p>No meetings scheduled yet.</p></div>`;
      } else {
        meetings.forEach(meet => {
          const div = document.createElement("div");
          div.classList.add("meeting-item");
          div.innerHTML = `
            <div class="meeting-details">
              <div class="meeting-date-time">
                <strong>${escapeHtml(meet.date)}</strong>
                <span class="meeting-separator">-</span>
                <span>${escapeHtml(meet.time)}</span>
              </div>
            </div>
            <a href="${escapeHtml(meet.link)}" target="_blank" class="btn-small">Join</a>
          `;
          meetingsDiv.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading meetings:", err);
  }
}

async function loadDashboardStats() {
  try {
    const [profileRes, connRes, meetRes] = await Promise.all([
      fetch(`${API}/auth/profile`, { headers: authHeaders() }),
      fetch(`${API}/connections`, { headers: authHeaders() }),
      fetch(`${API}/meetings`, { headers: authHeaders() })
    ]);
    const profile = await profileRes.json();
    const connData = await connRes.json();
    const meetings = await meetRes.json();

    const statsEl = document.getElementById("statsContent");
    if (!statsEl) return;

    const now = new Date();
    const upcoming = meetings.filter(m => new Date(`${m.date}T${m.time}`) > now).length;

    statsEl.innerHTML = `
      <p style="font-size:17px; font-weight:700; color:var(--text-primary); margin-bottom:16px;">
        Welcome back, ${escapeHtml(profile.name)}
      </p>
      <div class="dashboard-stats">
        <a href="connections.html" class="stat-item stat-link">
          <span class="stat-number">${connData.connections.length}</span>
          <span class="stat-label">Connections</span>
        </a>
        <a href="connections.html" class="stat-item stat-link">
          <span class="stat-number">${connData.requests.length}</span>
          <span class="stat-label">Pending Requests</span>
        </a>
        <a href="meetings.html" class="stat-item stat-link">
          <span class="stat-number">${upcoming}</span>
          <span class="stat-label">Upcoming Meetings</span>
        </a>
      </div>
    `;
  } catch (err) {
    console.error("Stats error:", err);
  }
}

// ─── CONNECTIONS ─────────────────────────────────────────────────────────────

async function sendRequest(receiverId) {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/connections/send`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ receiverId })
    });
    if (handleApiError(res)) return;
    const data = await res.json();
    if (res.ok) {
      showToast("Connection request sent!", "success");
    } else {
      showToast(data.message || "Failed to send request", "error");
    }
    await loadConnections();
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value.trim()) searchUsers(searchInput.value.trim());
    const suggestionsDiv = document.getElementById("suggestions");
    if (suggestionsDiv && window.location.pathname.includes("dashboard")) loadDashboard();
  } catch (err) {
    showToast("Network error", "error");
  }
}

async function loadConnections() {
  if (!requireAuth()) return;
  const userId = getUserIdFromToken();
  try {
    const res = await fetch(`${API}/connections`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const data = await res.json();

    const requestsDiv = document.getElementById("requests");
    const sentDiv = document.getElementById("sentRequests");
    const connectionsDiv = document.getElementById("connections");

    if (requestsDiv) requestsDiv.innerHTML = "";
    if (sentDiv) sentDiv.innerHTML = "";
    if (connectionsDiv) connectionsDiv.innerHTML = "";

    myConnections = data.connections.map(conn =>
      conn.sender._id === userId ? conn.receiver._id : conn.sender._id
    );
    myConnectionDocs = data.connections;
    sentRequests = data.sentRequests.map(r => r.receiver._id);
    receivedRequests = data.requests.map(r => r.sender._id);

    // pending received requests
    if (requestsDiv) {
      if (!data.requests.length) {
        requestsDiv.innerHTML = `<div class="empty-state"><p>No pending requests</p></div>`;
      } else {
        data.requests.forEach(req => {
          const initials = req.sender.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const div = document.createElement("div");
          div.classList.add("user-card");
          div.innerHTML = `
            <div class="user-card-left">
              <div class="avatar">${initials}</div>
              <div class="user-info">
                <p class="user-name"><a href="view-profile.html?id=${req.sender._id}" class="profile-link">${escapeHtml(req.sender.name)}</a></p>
                <p class="user-role">${escapeHtml(req.sender.role)}</p>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-success btn-small" onclick="respond('${req._id}', 'accept')">Accept</button>
              <button class="btn-danger btn-small" onclick="confirmReject('${req._id}')">Reject</button>
            </div>
          `;
          requestsDiv.appendChild(div);
        });
      }
    }

    // sent requests
    if (sentDiv) {
      if (!data.sentRequests.length) {
        sentDiv.innerHTML = `<div class="empty-state"><p>No sent requests</p></div>`;
      } else {
        data.sentRequests.forEach(req => {
          const initials = req.receiver.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const div = document.createElement("div");
          div.classList.add("user-card");
          div.innerHTML = `
            <div class="user-card-left">
              <div class="avatar">${initials}</div>
              <div class="user-info">
                <p class="user-name"><a href="view-profile.html?id=${req.receiver._id}" class="profile-link">${escapeHtml(req.receiver.name)}</a></p>
                <p class="user-role">${escapeHtml(req.receiver.role)}</p>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-muted btn-small" disabled>Pending</button>
              <button class="btn-danger btn-small" onclick="cancelSentRequest('${req._id}')">Cancel</button>
            </div>
          `;
          sentDiv.appendChild(div);
        });
      }
    }

    // accepted connections
    if (connectionsDiv) {
      if (!data.connections.length) {
        connectionsDiv.innerHTML = `<div class="empty-state"><p>No connections yet. Start connecting!</p></div>`;
      } else {
        data.connections.forEach(conn => {
          const otherUser = conn.sender._id === userId ? conn.receiver : conn.sender;
          const initials = otherUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const div = document.createElement("div");
          div.classList.add("user-card");
          div.innerHTML = `
            <div class="user-card-left">
              <div class="avatar">${initials}</div>
              <div class="user-info">
                <p class="user-name"><a href="view-profile.html?id=${otherUser._id}" class="profile-link">${escapeHtml(otherUser.name)}</a></p>
                <p class="user-role">${escapeHtml(otherUser.role)}</p>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-small" onclick="startChatFromSearch('${otherUser._id}', '${escapeHtml(otherUser.name.replace(/'/g, "\\'"))}')">Message</button>
              <button class="btn-danger btn-small" onclick="confirmRemoveConnection('${conn._id}')">Remove</button>
            </div>
          `;
          connectionsDiv.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading connections:", err);
  }
}

async function respond(requestId, action) {
  if (!requireAuth()) return;
  try {
    await fetch(`${API}/connections/respond`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ requestId, action })
    });
    showToast(action === "accept" ? "Connection accepted!" : "Request rejected", action === "accept" ? "success" : "info");
    await loadConnections();
  } catch (err) {
    showToast("Error responding to request", "error");
  }
}

function confirmReject(requestId) {
  showConfirmDialog("Reject this connection request?", () => respond(requestId, "reject"));
}

function confirmRemoveConnection(connectionId) {
  showConfirmDialog("Remove this connection? This cannot be undone.", async () => {
    try {
      const res = await fetch(`${API}/connections/${connectionId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        showToast("Connection removed", "info");
        await loadConnections();
      } else {
        showToast("Failed to remove connection", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    }
  });
}

async function cancelSentRequest(connectionId) {
  showConfirmDialog("Cancel this connection request?", async () => {
    try {
      const res = await fetch(`${API}/connections/cancel/${connectionId}`, {
        method: "DELETE",
        headers: authHeaders()
      });
      if (res.ok) {
        showToast("Request cancelled", "info");
        await loadConnections();
      } else {
        showToast("Failed to cancel request", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    }
  });
}

function searchConnections() {
  const query = document.getElementById("connectionSearch").value.toLowerCase();
  const container = document.getElementById("connections");
  if (!query) { loadConnections(); return; }
  const cards = container.getElementsByClassName("user-card");
  for (let card of cards) {
    const nameEl = card.querySelector(".user-name");
    if (nameEl) {
      card.style.display = nameEl.innerText.toLowerCase().includes(query) ? "flex" : "none";
    }
  }
}

async function acceptFromSearch(userId) {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/connections`, { headers: authHeaders() });
    const data = await res.json();
    const request = data.requests.find(r => r.sender._id === userId);
    if (!request) { showToast("Request not found", "warning"); return; }
    await respond(request._id, "accept");
  } catch (err) {
    showToast("Error accepting request", "error");
  }
}

async function rejectFromSearch(userId) {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/connections`, { headers: authHeaders() });
    const data = await res.json();
    const request = data.requests.find(r => r.sender._id === userId);
    if (!request) { showToast("Request not found", "warning"); return; }
    showConfirmDialog("Reject this connection request?", () => respond(request._id, "reject"));
  } catch (err) {
    showToast("Error rejecting request", "error");
  }
}

function startChatFromSearch(userId, name) {
  localStorage.setItem("chatUserId", userId);
  localStorage.setItem("chatUserName", name);
  window.location.href = "chat.html";
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────

async function searchUsers(query) {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/users/search?q=${encodeURIComponent(query)}`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const users = await res.json();
    displaySearchResults(users);
  } catch (err) {
    showToast("Search failed", "error");
  }
}

function displaySearchResults(users) {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;
  searchResults.innerHTML = "";
  if (!users.length) {
    searchResults.innerHTML = `<div class="empty-state"><p>No users found</p></div>`;
    return;
  }
  users.forEach(user => {
    const div = document.createElement("div");
    const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const isConnected = myConnections.includes(user._id);
    const isSent = sentRequests.includes(user._id);
    const isReceived = receivedRequests.includes(user._id);
    let btn = "";
    if (isConnected) {
      btn = `<button class="btn-success btn-small" data-userid="${user._id}" data-username="${escapeHtml(user.name)}" onclick="startChatFromSearch(this.dataset.userid, this.dataset.username)">Message</button>`;
    } else if (isSent) {
      btn = `<button class="btn-muted btn-small" disabled>Requested</button>`;
    } else if (isReceived) {
      btn = `<button class="btn-success btn-small" onclick="acceptFromSearch('${user._id}')">Accept</button>
             <button class="btn-danger btn-small" onclick="rejectFromSearch('${user._id}')">Reject</button>`;
    } else {
      btn = `<button class="btn-small" onclick="sendRequest('${user._id}')">Connect</button>`;
    }
    div.classList.add("user-card");
    div.innerHTML = `
      <div class="user-card-left">
        <div class="avatar">${initials}</div>
        <div class="user-info">
          <p class="user-name"><a href="view-profile.html?id=${user._id}" class="profile-link">${escapeHtml(user.name)}</a></p>
          <p class="user-role">${escapeHtml(user.role)}</p>
        </div>
      </div>
      <div class="user-actions">${btn}</div>
    `;
    searchResults.appendChild(div);
  });
}

function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) { showToast("Type something to search", "warning"); return; }
  searchUsers(query);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

async function loadCurrentUserName() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API}/auth/profile`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const user = await res.json();
    const nameEl = document.getElementById("currentUserName");
    if (nameEl) nameEl.innerText = user.name;
  } catch (err) {
    console.error("Error loading user:", err);
  }
}

async function loadNotifications() {
  if (!localStorage.getItem("token")) return;
  try {
    const res = await fetch(`${API}/notifications`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const dropdown = document.getElementById("notifDropdown");
    const count = document.getElementById("notifCount");
    if (!dropdown || !count) return;
    dropdown.innerHTML = "";
    let unread = 0;
    if (!data.length) {
      dropdown.innerHTML = `<div class="notif-empty">No notifications</div>`;
    } else {
      data.forEach(n => {
        if (!n.isRead) unread++;
        const div = document.createElement("div");
        div.classList.add("notif-item");
        if (!n.isRead) div.classList.add("notif-unread");
        div.innerHTML = `<p>${escapeHtml(n.message)}</p><small>${new Date(n.createdAt).toLocaleString()}</small>`;
        dropdown.appendChild(div);
      });
      // clear all button at the bottom
      const clearBtn = document.createElement("div");
      clearBtn.style.cssText = "padding:8px 12px; text-align:right; border-top:1px solid var(--border);";
      clearBtn.innerHTML = `<button class="btn-small btn-outline" onclick="clearAllNotifications()">Clear All</button>`;
      dropdown.appendChild(clearBtn);
    }
    count.innerText = unread > 0 ? unread : "";
    count.style.display = unread > 0 ? "flex" : "none";
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

async function toggleNotifications() {
  const dropdown = document.getElementById("notifDropdown");
  if (dropdown.style.display === "block") { dropdown.style.display = "none"; return; }
  dropdown.style.display = "block";
  await loadNotifications();
  await markNotificationsRead();
}

async function markNotificationsRead() {
  if (!requireAuth()) return;
  try {
    await fetch(`${API}/notifications/read`, { method: "PUT", headers: authHeaders() });
    const count = document.getElementById("notifCount");
    if (count) { count.innerText = ""; count.style.display = "none"; }
  } catch (err) {
    console.error("Error marking notifications read:", err);
  }
}

async function clearAllNotifications() {
  try {
    const res = await fetch(`${API}/notifications`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) {
      showToast("Notifications cleared", "info");
      loadNotifications();
    }
  } catch (err) {
    showToast("Failed to clear notifications", "error");
  }
}

async function loadChatUnreadCount() {
  if (!localStorage.getItem("token")) return;
  try {
    const res = await fetch(`${API}/messages/meta/unread`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById("chatUnreadBadge");
    if (!badge) return;
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading chat unread count:", err);
  }
}

document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("notifDropdown");
  const bellBtn = document.getElementById("notifBell");
  if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

// ─── PROFILE ──────────────────────────────────────────────────────────────────

async function loadProfile() {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/auth/profile`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const user = await res.json();
    document.getElementById("p_name").innerText = user.name || "-";
    document.getElementById("p_email").innerText = user.email || "-";
    document.getElementById("p_role").innerText = (user.role || "-").charAt(0).toUpperCase() + (user.role || "-").slice(1);
    document.getElementById("p_bio").innerText = user.bio || "No bio added yet";
    document.getElementById("p_skills").innerText = (user.skills || []).join(", ") || "No skills added yet";
    const memberSinceEl = document.getElementById("p_memberSince");
    if (memberSinceEl && user.createdAt) {
      memberSinceEl.innerText = new Date(user.createdAt).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
    }
    if (user.role === "mentor") {
      const mentorFields = document.getElementById("mentorFields");
      if (mentorFields) {
        mentorFields.style.display = "block";
        document.getElementById("p_company").innerText = user.company || "-";
        document.getElementById("p_exp").innerText = user.experienceYears ? `${user.experienceYears} years` : "-";
        document.getElementById("p_expertise").innerText = (user.expertise || []).join(", ") || "-";
      }
    }
    if (user.role === "entrepreneur") {
      const entrepreneurFields = document.getElementById("entrepreneurFields");
      if (entrepreneurFields) {
        entrepreneurFields.style.display = "block";
        document.getElementById("p_startup").innerText = user.startupName || "-";
        document.getElementById("p_idea").innerText = user.idea || "-";
        document.getElementById("p_industry").innerText = user.industry || "-";
      }
    }
  } catch (err) {
    showToast("Failed to load profile", "error");
  }
}

function goToUpdate() { window.location.href = "update.html"; }

async function loadUpdateForm() {
  if (!requireAuth()) return;
  try {
    const res = await fetch(`${API}/auth/profile`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const user = await res.json();
    document.getElementById("u_name").value = user.name || "";
    document.getElementById("u_bio").value = user.bio || "";
    document.getElementById("u_skills").value = (user.skills || []).join(", ");
    if (user.role === "mentor") {
      const mentorFields = document.getElementById("u_mentorFields");
      if (mentorFields) {
        mentorFields.style.display = "block";
        document.getElementById("u_company").value = user.company || "";
        const roleEl = document.getElementById("u_currentRole");
        if (roleEl) roleEl.value = user.currentRole || "";
        document.getElementById("u_exp").value = user.experienceYears || "";
        document.getElementById("u_expertise").value = (user.expertise || []).join(", ");
      }
    }
    if (user.role === "entrepreneur") {
      const entrepreneurFields = document.getElementById("u_entrepreneurFields");
      if (entrepreneurFields) {
        entrepreneurFields.style.display = "block";
        document.getElementById("u_startup").value = user.startupName || "";
        document.getElementById("u_idea").value = user.idea || "";
        document.getElementById("u_industry").value = user.industry || "";
      }
    }
  } catch (err) {
    showToast("Failed to load profile data", "error");
  }
}

async function updateProfile() {
  if (!requireAuth()) return;
  const body = {
    name: document.getElementById("u_name").value,
    bio: document.getElementById("u_bio").value,
    skills: document.getElementById("u_skills").value.split(",").map(s => s.trim()).filter(s => s)
  };
  const mentorFields = document.getElementById("u_mentorFields");
  if (mentorFields && mentorFields.style.display === "block") {
    body.company = document.getElementById("u_company").value;
    const roleEl = document.getElementById("u_currentRole");
    if (roleEl) body.currentRole = roleEl.value;
    body.experienceYears = Number(document.getElementById("u_exp").value) || 0;
    body.expertise = document.getElementById("u_expertise").value.split(",").map(s => s.trim()).filter(s => s);
  }
  const entrepreneurFields = document.getElementById("u_entrepreneurFields");
  if (entrepreneurFields && entrepreneurFields.style.display === "block") {
    body.startupName = document.getElementById("u_startup").value;
    body.idea = document.getElementById("u_idea").value;
    body.industry = document.getElementById("u_industry").value;
  }
  try {
    const res = await fetch(`${API}/auth/profile`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify(body)
    });
    if (res.ok) {
      showToast("Profile updated successfully!", "success");
      setTimeout(() => window.location.href = "profile.html", 800);
    } else {
      showToast("Update failed", "error");
    }
  } catch (err) {
    showToast("Network error", "error");
  }
}

async function changePassword(e) {
  e.preventDefault();
  if (!requireAuth()) return;
  const currentPassword = document.getElementById("u_current_password").value;
  const newPassword = document.getElementById("u_new_password").value;
  if (!currentPassword || !newPassword) { showToast("Please enter both passwords", "warning"); return; }
  if (newPassword.length < 6) { showToast("New password must be at least 6 characters", "warning"); return; }
  try {
    const res = await fetch(`${API}/auth/change-password`, {
      method: "PUT",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Password updated successfully!", "success");
      document.getElementById("u_current_password").value = "";
      document.getElementById("u_new_password").value = "";
    } else {
      showToast(data.message || "Failed to update password", "error");
    }
  } catch (err) {
    showToast("Network error", "error");
  }
}

// view another user's public profile
async function loadViewProfile() {
  if (!requireAuth()) return;
  const userId = new URLSearchParams(window.location.search).get("id");
  if (!userId) { showToast("No user specified", "error"); return; }
  try {
    const [userRes, connRes] = await Promise.all([
      fetch(`${API}/users/${userId}`, { headers: authHeaders() }),
      fetch(`${API}/connections`, { headers: authHeaders() })
    ]);
    if (handleApiError(userRes)) return;
    const user = await userRes.json();
    const connData = await connRes.json();
    const myId = getUserIdFromToken();
    const connections = connData.connections.map(c => c.sender._id === myId ? c.receiver._id : c.sender._id);
    const sent = connData.sentRequests.map(r => r.receiver._id);
    const received = connData.requests.map(r => r.sender._id);
    const isMe = userId === myId;
    const safeName = escapeHtml(user.name).replace(/'/g, "&#39;");
    let actionBtn = "";
    if (isMe) {
      actionBtn = `<button onclick="goToUpdate()">Edit Profile</button>`;
    } else if (connections.includes(userId)) {
      actionBtn = `<button class="btn-success" onclick="startChatFromSearch('${userId}', '${safeName}')">Message</button>`;
    } else if (sent.includes(userId)) {
      actionBtn = `<button class="btn-muted" disabled>Request Sent</button>`;
    } else if (received.includes(userId)) {
      actionBtn = `<button class="btn-success" onclick="acceptFromSearch('${userId}')">Accept Request</button>`;
    } else {
      actionBtn = `<button onclick="sendRequest('${userId}')">Connect</button>`;
    }
    const card = document.getElementById("viewProfileCard");
    if (!card) return;
    const skillTags = (user.skills || []).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join("");
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
        <div class="avatar" style="width:56px;height:56px;font-size:20px;">${user.name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</div>
        <div>
          <h3 style="margin-bottom:4px;">${escapeHtml(user.name)}</h3>
          <p style="color:var(--text-secondary);font-size:14px;text-transform:capitalize;">${user.role}</p>
        </div>
        <div style="margin-left:auto;">${actionBtn}</div>
      </div>
      ${user.bio ? `<div class="profile-field"><span class="profile-label">Bio</span><span class="profile-value">${escapeHtml(user.bio)}</span></div>` : ""}
      ${user.skills?.length ? `<div class="profile-field"><span class="profile-label">Skills</span><span class="profile-value"><div class="skill-tags">${skillTags}</div></span></div>` : ""}
      ${user.role === "mentor" && user.company ? `<div class="profile-field"><span class="profile-label">Company</span><span class="profile-value">${escapeHtml(user.company)}</span></div>` : ""}
      ${user.role === "mentor" && user.currentRole ? `<div class="profile-field"><span class="profile-label">Role</span><span class="profile-value">${escapeHtml(user.currentRole)}</span></div>` : ""}
      ${user.role === "mentor" && user.experienceYears ? `<div class="profile-field"><span class="profile-label">Experience</span><span class="profile-value">${user.experienceYears} years</span></div>` : ""}
      ${user.role === "mentor" && user.expertise?.length ? `<div class="profile-field"><span class="profile-label">Expertise</span><span class="profile-value">${user.expertise.join(", ")}</span></div>` : ""}
      ${user.role === "entrepreneur" && user.startupName ? `<div class="profile-field"><span class="profile-label">Startup</span><span class="profile-value">${escapeHtml(user.startupName)}</span></div>` : ""}
      ${user.role === "entrepreneur" && user.industry ? `<div class="profile-field"><span class="profile-label">Industry</span><span class="profile-value">${escapeHtml(user.industry)}</span></div>` : ""}
      ${user.role === "entrepreneur" && user.idea ? `<div class="profile-field"><span class="profile-label">Idea</span><span class="profile-value">${escapeHtml(user.idea)}</span></div>` : ""}
      <div class="profile-field"><span class="profile-label">Member Since</span><span class="profile-value">${new Date(user.createdAt).toLocaleDateString([],{year:"numeric",month:"long",day:"numeric"})}</span></div>
    `;
  } catch (err) {
    showToast("Failed to load profile", "error");
  }
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

let socket;
let currentUserId;
let selectedUserId;
let roomId;
let typingTimeout;

async function loadChat() {
  if (!requireAuth()) return;
  try {
    const resUser = await fetch(`${API}/auth/profile`, { headers: authHeaders() });
    if (handleApiError(resUser)) return;
    const user = await resUser.json();
    currentUserId = user._id;

    // use the shared socket if already created, or make a new one
    socket = window._socket || io();
    window._socket = socket;
    socket.emit("registerUser", currentUserId);

    socket.on("receiveMessage", (data) => {
      displayMessage(data.senderId, data.message, data.createdAt);
      // mark as read since we're actively viewing this chat
      if (data.senderId === selectedUserId) {
        fetch(`${API}/messages/${selectedUserId}`, { headers: authHeaders() }).catch(() => {});
      }
    });

    socket.on("typing", (data) => {
      if (data.senderId === selectedUserId) {
        const indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.style.display = "block";
      }
    });

    socket.on("stopTyping", (data) => {
      if (data.senderId === selectedUserId) {
        const indicator = document.getElementById("typingIndicator");
        if (indicator) indicator.style.display = "none";
      }
    });

    const [connRes, lastMsgRes] = await Promise.all([
      fetch(`${API}/connections`, { headers: authHeaders() }),
      fetch(`${API}/messages/meta/last`, { headers: authHeaders() })
    ]);
    const data = await connRes.json();
    const lastMsgs = lastMsgRes.ok ? await lastMsgRes.json() : {};

    const usersDiv = document.getElementById("users");
    if (usersDiv) {
      usersDiv.innerHTML = "";
      if (!data.connections.length) {
        usersDiv.innerHTML = `<div class="empty-state"><p>No connections yet</p></div>`;
      } else {
        data.connections.forEach(conn => {
          const otherUser = conn.sender._id === currentUserId ? conn.receiver : conn.sender;
          const initials = otherUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          const msgMeta = lastMsgs[otherUser._id] || {};
          const preview = msgMeta.lastMessage ? msgMeta.lastMessage.slice(0, 28) + (msgMeta.lastMessage.length > 28 ? "…" : "") : "";
          const timeStr = msgMeta.lastMessageTime ? formatTime(msgMeta.lastMessageTime) : "";
          const unread = msgMeta.unreadCount || 0;

          const div = document.createElement("div");
          div.classList.add("chat-user-item");
          div.innerHTML = `
            <div class="avatar avatar-sm">${initials}</div>
            <div class="chat-user-meta">
              <div class="chat-user-top" style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span class="chat-user-name" style="font-weight:600;">${escapeHtml(otherUser.name)}</span>
                ${timeStr ? `<span class="chat-time" style="font-size:10px; opacity:0.6; margin-left:auto; white-space:nowrap; padding-left:8px;">${timeStr}</span>` : ""}
              </div>
              ${preview ? `<span class="chat-preview">${escapeHtml(preview)}</span>` : ""}
            </div>
            ${unread > 0 ? `<span class="chat-unread-badge">${unread}</span>` : ""}
          `;
          div.onclick = function () { selectChatUser(div, otherUser._id, otherUser.name); };
          usersDiv.appendChild(div);
        });
      }
    }

    // auto-open chat if redirected from Message button
    const chatUserId = localStorage.getItem("chatUserId");
    const chatUserName = localStorage.getItem("chatUserName");
    if (chatUserId && chatUserName) {
      localStorage.removeItem("chatUserId");
      localStorage.removeItem("chatUserName");
      openChat(chatUserId, chatUserName);
      // highlight the correct user in the list
      const items = document.querySelectorAll(".chat-user-item");
      items.forEach(item => {
        const nameEl = item.querySelector(".chat-user-name");
        if (nameEl && nameEl.textContent === chatUserName) item.classList.add("active-chat-user");
      });
    }
  } catch (err) {
    console.error("Error loading chat:", err);
  }
}

function selectChatUser(element, userId, name) {
  document.querySelectorAll(".chat-user-item").forEach(el => el.classList.remove("active-chat-user"));
  element.classList.add("active-chat-user");
  // clear unread badge on click
  const badge = element.querySelector(".chat-unread-badge");
  if (badge) badge.remove();
  openChat(userId, name);
}

async function openChat(userId, name) {
  selectedUserId = userId;
  const chatUserNameEl = document.getElementById("chatUserName");
  if (chatUserNameEl) chatUserNameEl.innerText = name;
  const chatPlaceholder = document.getElementById("chatPlaceholder");
  const chatActive = document.getElementById("chatActive");
  if (chatPlaceholder) chatPlaceholder.style.display = "none";
  if (chatActive) chatActive.style.display = "flex";

  roomId = [currentUserId, selectedUserId].sort().join("_");
  socket.emit("joinRoom", roomId);

  try {
    const res = await fetch(`${API}/messages/${userId}`, { headers: authHeaders() });
    const messages = await res.json();
    const msgList = document.getElementById("messages");
    if (msgList) {
      msgList.innerHTML = "";
      messages.forEach(msg => displayMessage(msg.sender, msg.message, msg.createdAt));
    }
    // clear sidebar chat badge since we're now reading
    loadChatUnreadCount();
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

function sendMessage() {
  const msgInput = document.getElementById("message");
  const message = msgInput ? msgInput.value.trim() : "";
  if (!message) return;
  socket.emit("sendMessage", { roomId, message, senderId: currentUserId, receiverId: selectedUserId });
  socket.emit("stopTyping", { roomId, senderId: currentUserId });
  if (msgInput) msgInput.value = "";
}

function displayMessage(senderId, message, createdAt) {
  const li = document.createElement("li");
  li.classList.add("message");
  const isMine = senderId === currentUserId || senderId?._id === currentUserId;
  li.classList.add(isMine ? "sent" : "received");
  // time on its own line below the message text — smaller and separate
  const timeStr = createdAt ? formatTime(createdAt) : "";
  li.style.display = "flex";
  li.style.flexDirection = "column";
  li.style.gap = "4px";

  li.innerHTML = `
    <span class="msg-text" style="display:block; font-size:14px; line-height:1.5; word-break:break-word;">${escapeHtml(message)}</span>
    ${timeStr ? `<span class="message-time" style="display:block; font-size:10px; opacity:0.6; text-align:${isMine ? 'right' : 'left'};">${timeStr}</span>` : ""}
  `;
  const messages = document.getElementById("messages");
  if (messages) { messages.appendChild(li); messages.scrollTop = messages.scrollHeight; }
}

function filterChatUsers() {
  const query = document.getElementById("chatSearch").value.toLowerCase();
  document.querySelectorAll(".chat-user-item").forEach(user => {
    const name = user.querySelector(".chat-user-name");
    user.style.display = (!name || name.textContent.toLowerCase().includes(query)) ? "flex" : "none";
  });
}

// ─── MEETINGS ────────────────────────────────────────────────────────────────

async function loadMeetingsPage() {
  if (!requireAuth()) return;
  const myId = getUserIdFromToken();

  // set minimum date to today so past dates are disabled in the date picker
  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`${API}/connections`, { headers: authHeaders() });
    if (handleApiError(res)) return;
    const data = await res.json();
    const select = document.getElementById("participantId");
    if (select) {
      select.innerHTML = `<option value="">Select a connection</option>`;
      data.connections.forEach(conn => {
        const otherUser = conn.sender._id === myId ? conn.receiver : conn.sender;
        const option = document.createElement("option");
        option.value = otherUser._id;
        option.textContent = otherUser.name;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Error populating participants:", err);
  }

  try {
    const res = await fetch(`${API}/meetings`, { headers: authHeaders() });
    const meetings = await res.json();
    const meetingsList = document.getElementById("meetingsList");
    if (meetingsList) {
      meetingsList.innerHTML = "";
      if (!meetings.length) {
        meetingsList.innerHTML = `<div class="empty-state"><p>No meetings scheduled yet</p></div>`;
      } else {
        meetings.forEach(meet => {
          const div = document.createElement("div");
          div.classList.add("meeting-item");
          const participants = meet.participants ? meet.participants.map(p => escapeHtml(p.name)).join(", ") : "";
          const isPast = new Date(`${meet.date}T${meet.time}`) < new Date();
          const canCancel = meet.createdBy && (meet.createdBy._id === myId || meet.createdBy === myId);
          div.innerHTML = `
            <div class="meeting-details">
              <div class="meeting-date-time">
                <strong>${escapeHtml(meet.date)}</strong>
                <span class="meeting-separator">-</span>
                <span>${escapeHtml(meet.time)}</span>
                ${isPast ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px;">(Past)</span>` : ""}
              </div>
              ${participants ? `<p class="meeting-participants">With: ${participants}</p>` : ""}
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              ${!isPast ? `<a href="${escapeHtml(meet.link)}" target="_blank" class="btn-small">Join</a>` : ""}
              ${canCancel && !isPast ? `<button class="btn-danger btn-small" onclick="confirmCancelMeeting('${meet._id}')">Cancel</button>` : ""}
            </div>
          `;
          meetingsList.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading meetings:", err);
  }
}

async function createMeeting() {
  if (!requireAuth()) return;
  const participantId = document.getElementById("participantId").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const link = document.getElementById("link").value;
  if (!participantId || !date || !time || !link) { showToast("Please fill in all fields", "warning"); return; }
  try {
    const res = await fetch(`${API}/meetings/create`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ participantId, date, time, link })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Meeting scheduled!", "success");
      document.getElementById("participantId").value = "";
      document.getElementById("date").value = "";
      document.getElementById("time").value = "";
      document.getElementById("link").value = "";
      loadMeetingsPage();
    } else {
      showToast(data.message || "Failed to create meeting", "error");
    }
  } catch (err) {
    showToast("Network error", "error");
  }
}

function confirmCancelMeeting(meetingId) {
  showConfirmDialog("Cancel this meeting? The other participant will be notified.", async () => {
    try {
      const res = await fetch(`${API}/meetings/${meetingId}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) {
        showToast("Meeting cancelled", "info");
        loadMeetingsPage();
      } else {
        showToast("Failed to cancel meeting", "error");
      }
    } catch (err) {
      showToast("Network error", "error");
    }
  });
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const searchInput = document.getElementById("searchInput");
    if (searchInput && document.activeElement === searchInput) handleSearch();
    const msgInput = document.getElementById("message");
    if (msgInput && document.activeElement === msgInput) sendMessage();
  }
  // typing indicator while user types in chat
  if (document.activeElement && document.activeElement.id === "message" && socket && roomId) {
    socket.emit("typing", { roomId, senderId: currentUserId });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", { roomId, senderId: currentUserId });
    }, 1500);
  }
});

// ─── ACCOUNT MANAGEMENT ───────────────────────────────────────────────────────

async function confirmDeleteAccount() {
  const confirmation = window.confirm(
    "Are you absolutely sure you want to delete your account?\n\n" +
    "This action CANNOT be undone. All your connections, messages, and profile data will be permanently erased."
  );

  if (!confirmation) return;

  try {
    const res = await fetch(`${API}/auth/profile`, {
      method: "DELETE",
      headers: authHeaders()
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert("Your account has been permanently deleted.");
      localStorage.removeItem("token");
      window.location.href = "login.html";
    } else {
      showToast(data.message || "Failed to delete account", "error");
    }
  } catch (err) {
    showToast("Network error occurred while trying to delete account.", "error");
  }
}