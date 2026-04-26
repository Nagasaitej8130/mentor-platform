const API = "/api";

// ================= GLOBAL STATE =================
let myConnections = [];
let sentRequests = [];
let receivedRequests = [];

// ================= TOAST SYSTEM =================
function showToast(message, type = "info") {
  // Remove existing toast
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

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ================= HELPERS =================

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
  return true;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };
}

function jsonAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`
  };
}

// ================= LAYOUT =================

async function loadLayout(pageTitle) {
  try {
    // SIDEBAR
    const sidebarRes = await fetch("../components/sidebar.html");
    const sidebarHtml = await sidebarRes.text();
    document.getElementById("sidebar").innerHTML = sidebarHtml;

    // NAVBAR
    const navRes = await fetch("../components/navbar.html");
    const navHtml = await navRes.text();
    document.getElementById("navbar").innerHTML = navHtml;

    // Set page title
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.innerText = pageTitle;

    // Highlight active sidebar link
    highlightActiveNav();

    // Load user name
    loadCurrentUserName();

    // Inject Sidebar Overlay for mobile if it doesnt exist
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

// Mobile sidebar toggle
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
    if (href && href.includes(currentPage)) {
      link.classList.add("active");
    }
  });
}

// ================= AUTH =================

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
  const role = document.getElementById("role").value;

  if (!name || !email || !password || !role) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "warning");
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

function logout() {
  localStorage.removeItem("token");
  showToast("Logged out", "info");
  setTimeout(() => window.location.href = "login.html", 600);
}

// ================= DASHBOARD =================

async function loadDashboard() {
  if (!requireAuth()) return;

  const token = localStorage.getItem("token");

  // Load connections state first
  await loadConnections();

  // Suggestions
  try {
    const res1 = await fetch(`${API}/match`, {
      headers: authHeaders()
    });
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
            btn = `<button class="btn-success" disabled>Connected</button>`;
          } else if (isSent) {
            btn = `<button class="btn-muted" disabled>Requested</button>`;
          } else if (isReceived) {
            btn = `<button class="btn-success" onclick="acceptFromSearch('${user._id}')">Accept</button>`;
          } else {
            btn = `<button onclick="sendRequest('${user._id}')">Connect</button>`;
          }

          const div = document.createElement("div");
          div.classList.add("user-card");
          div.innerHTML = `
            <div class="user-card-left">
              <div class="avatar">${initials}</div>
              <div class="user-info">
                <p class="user-name">${escapeHtml(user.name)}</p>
                <p class="user-role">${role}</p>
                ${item.score > 0 ? `<span class="match-badge">${item.score} skill match${item.score > 1 ? "es" : ""}</span>` : ""}
              </div>
            </div>
            <div class="user-actions">${btn}</div>
          `;
          suggestionsDiv.appendChild(div);
        });
      }
    }
  } catch (err) {
    console.error("Error loading suggestions:", err);
  }

  // Notifications
  loadNotifications();

  // Meetings
  try {
    const res2 = await fetch(`${API}/meetings`, {
      headers: authHeaders()
    });
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

// ================= CONNECTIONS =================

async function sendRequest(receiverId) {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/connections/send`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ receiverId })
    });

    const data = await res.json();

    if (res.ok) {
      showToast("Connection request sent!", "success");
    } else {
      showToast(data.message || "Failed to send request", "error");
    }

    await loadConnections();

    // Refresh search results if search is active
    const searchInput = document.getElementById("searchInput");
    if (searchInput && searchInput.value.trim()) {
      searchUsers(searchInput.value.trim());
    }

    // Refresh suggestions if on dashboard
    const suggestionsDiv = document.getElementById("suggestions");
    if (suggestionsDiv && window.location.pathname.includes("dashboard")) {
      loadDashboard();
    }
  } catch (err) {
    showToast("Network error", "error");
  }
}

async function loadConnections() {
  if (!requireAuth()) return;

  const userId = getUserIdFromToken();

  try {
    const res = await fetch(`${API}/connections`, {
      headers: authHeaders()
    });

    const data = await res.json();

    const requestsDiv = document.getElementById("requests");
    const connectionsDiv = document.getElementById("connections");

    if (requestsDiv) requestsDiv.innerHTML = "";
    if (connectionsDiv) connectionsDiv.innerHTML = "";

    // Store states for search integration
    myConnections = data.connections.map(conn =>
      conn.sender._id === userId ? conn.receiver._id : conn.sender._id
    );
    sentRequests = data.sentRequests.map(r => r.receiver._id);
    receivedRequests = data.requests.map(r => r.sender._id);

    if (requestsDiv && connectionsDiv) {
      // Render pending requests
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
                <p class="user-name">${escapeHtml(req.sender.name)}</p>
                <p class="user-role">${escapeHtml(req.sender.role)}</p>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-success" onclick="respond('${req._id}', 'accept')">Accept</button>
              <button class="btn-danger" onclick="respond('${req._id}', 'reject')">Reject</button>
            </div>
          `;
          requestsDiv.appendChild(div);
        });
      }

      // Render accepted connections
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
                <p class="user-name">${escapeHtml(otherUser.name)}</p>
                <p class="user-role">${escapeHtml(otherUser.role)}</p>
              </div>
            </div>
            <div class="user-actions">
              <button class="btn-small" onclick="startChatFromSearch('${otherUser._id}', '${escapeHtml(otherUser.name.replace(/'/g, "\\'"))}')">Message</button>
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

// ================= CHAT =================

let socket;
let currentUserId;
let selectedUserId;
let roomId;

async function loadChat() {
  if (!requireAuth()) return;

  try {
    const resUser = await fetch(`${API}/auth/profile`, {
      headers: authHeaders()
    });
    const user = await resUser.json();
    currentUserId = user._id;

    socket = io();

    socket.on("receiveMessage", (data) => {
      displayMessage(data.senderId, data.message);
    });

    const res = await fetch(`${API}/connections`, {
      headers: authHeaders()
    });

    const data = await res.json();
    const usersDiv = document.getElementById("users");

    if (usersDiv) {
      usersDiv.innerHTML = "";

      if (!data.connections.length) {
        usersDiv.innerHTML = `<div class="empty-state"><p>No connections yet</p></div>`;
      } else {
        data.connections.forEach(conn => {
          const otherUser = conn.sender._id === currentUserId ? conn.receiver : conn.sender;
          const initials = otherUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

          const div = document.createElement("div");
          div.classList.add("chat-user-item");

          div.innerHTML = `
            <div class="avatar avatar-sm">${initials}</div>
            <span>${escapeHtml(otherUser.name)}</span>
          `;

          div.onclick = function () {
            selectChatUser(div, otherUser._id, otherUser.name);
          };

          usersDiv.appendChild(div);
        });
      }
    }

    // Auto-open chat if navigated from search
    const chatUserId = localStorage.getItem("chatUserId");
    const chatUserName = localStorage.getItem("chatUserName");
    if (chatUserId && chatUserName) {
      localStorage.removeItem("chatUserId");
      localStorage.removeItem("chatUserName");
      // Find the user element and select it
      const userItems = document.querySelectorAll(".chat-user-item");
      userItems.forEach(item => {
        if (item.onclick) {
          // Try to auto-open
        }
      });
      openChat(chatUserId, chatUserName);
    }
  } catch (err) {
    console.error("Error loading chat:", err);
  }
}

function selectChatUser(element, userId, name) {
  document.querySelectorAll(".chat-user-item").forEach(el => {
    el.classList.remove("active-chat-user");
  });

  element.classList.add("active-chat-user");
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
    const res = await fetch(`${API}/messages/${userId}`, {
      headers: authHeaders()
    });

    const messages = await res.json();
    const msgList = document.getElementById("messages");
    if (msgList) {
      msgList.innerHTML = "";
      messages.forEach(msg => {
        displayMessage(msg.sender, msg.message);
      });
    }
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

function sendMessage() {
  const msgInput = document.getElementById("message");
  const message = msgInput ? msgInput.value : "";
  if (!message.trim()) return;

  socket.emit("sendMessage", {
    roomId,
    message,
    senderId: currentUserId,
    receiverId: selectedUserId
  });

  if (msgInput) msgInput.value = "";
}

function displayMessage(senderId, message) {
  const li = document.createElement("li");
  li.classList.add("message");

  if (senderId === currentUserId) {
    li.classList.add("sent");
  } else {
    li.classList.add("received");
  }

  li.innerText = message;

  const messages = document.getElementById("messages");
  if (messages) {
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }
}

function filterChatUsers() {
  const query = document.getElementById("chatSearch").value.toLowerCase();
  const users = document.querySelectorAll(".chat-user-item");

  users.forEach(user => {
    const name = user.innerText.toLowerCase();
    user.style.display = name.includes(query) ? "flex" : "none";
  });
}

// ================= SEARCH =================

async function searchUsers(query) {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/users/search?q=${encodeURIComponent(query)}`, {
      headers: authHeaders()
    });

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
      // Use data attributes to safely pass name without XSS
      const safeName = escapeHtml(user.name);
      btn = `<button class="btn-success" data-userid="${user._id}" data-username="${safeName}" onclick="startChatFromSearch(this.dataset.userid, this.dataset.username)">Message</button>`;
    } else if (isSent) {
      btn = `<button class="btn-muted" disabled>Requested</button>`;
    } else if (isReceived) {
      btn = `
        <button class="btn-success" onclick="acceptFromSearch('${user._id}')">Accept</button>
        <button class="btn-danger" onclick="rejectFromSearch('${user._id}')">Reject</button>
      `;
    } else {
      btn = `<button onclick="sendRequest('${user._id}')">Connect</button>`;
    }

    div.classList.add("user-card");
    div.innerHTML = `
      <div class="user-card-left">
        <div class="avatar">${initials}</div>
        <div class="user-info">
          <p class="user-name">${escapeHtml(user.name)}</p>
          <p class="user-role">${escapeHtml(user.role)}</p>
        </div>
      </div>
      <div class="user-actions">${btn}</div>
    `;

    searchResults.appendChild(div);
  });
}

// SEARCH ACTIONS
async function acceptFromSearch(userId) {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/connections`, {
      headers: authHeaders()
    });

    const data = await res.json();
    const request = data.requests.find(r => r.sender._id === userId);

    if (!request) {
      showToast("Request not found", "warning");
      return;
    }

    await respond(request._id, "accept");
  } catch (err) {
    showToast("Error accepting request", "error");
  }
}

async function rejectFromSearch(userId) {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/connections`, {
      headers: authHeaders()
    });

    const data = await res.json();
    const request = data.requests.find(r => r.sender._id === userId);

    if (!request) {
      showToast("Request not found", "warning");
      return;
    }

    await respond(request._id, "reject");
  } catch (err) {
    showToast("Error rejecting request", "error");
  }
}

function startChatFromSearch(userId, name) {
  localStorage.setItem("chatUserId", userId);
  localStorage.setItem("chatUserName", name);
  window.location.href = "chat.html";
}

function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) {
    showToast("Type something to search", "warning");
    return;
  }
  searchUsers(query);
}

function searchConnections() {
  const query = document.getElementById("connectionSearch").value.toLowerCase();
  const container = document.getElementById("connections");

  if (!query) {
    loadConnections();
    return;
  }

  const cards = container.getElementsByClassName("user-card");
  for (let card of cards) {
    const nameEl = card.querySelector(".user-name");
    if (nameEl) {
      const name = nameEl.innerText.toLowerCase();
      card.style.display = name.includes(query) ? "flex" : "none";
    }
  }
}

// ================= NOTIFICATIONS =================

async function loadNotifications() {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/notifications`, {
      headers: authHeaders()
    });

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

        div.innerHTML = `
          <p>${escapeHtml(n.message)}</p>
          <small>${new Date(n.createdAt).toLocaleString()}</small>
        `;

        dropdown.appendChild(div);
      });
    }

    count.innerText = unread > 0 ? unread : "";
    if (unread > 0) {
      count.style.display = "flex";
    } else {
      count.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading notifications:", err);
  }
}

async function toggleNotifications() {
  const dropdown = document.getElementById("notifDropdown");

  if (dropdown.style.display === "block") {
    dropdown.style.display = "none";
    return;
  }

  dropdown.style.display = "block";

  // Reload and mark as read
  await loadNotifications();
  await markNotificationsRead();
}

async function markNotificationsRead() {
  if (!requireAuth()) return;

  try {
    await fetch(`${API}/notifications/read`, {
      method: "PUT",
      headers: authHeaders()
    });

    // Update count after marking read
    const count = document.getElementById("notifCount");
    if (count) {
      count.innerText = "";
      count.style.display = "none";
    }
  } catch (err) {
    console.error("Error marking notifications read:", err);
  }
}

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("notifDropdown");
  const bellBtn = document.getElementById("notifBell");
  if (dropdown && bellBtn && !bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

// ================= PROFILE =================

async function loadCurrentUserName() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/auth/profile`, {
      headers: authHeaders()
    });

    const user = await res.json();

    const nameEl = document.getElementById("currentUserName");
    if (nameEl) {
      nameEl.innerText = user.name;
    }
  } catch (err) {
    console.error("Error loading user:", err);
  }
}

async function loadProfile() {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/auth/profile`, {
      headers: authHeaders()
    });

    const user = await res.json();

    document.getElementById("p_name").innerText = user.name || "-";
    document.getElementById("p_email").innerText = user.email || "-";
    document.getElementById("p_role").innerText = (user.role || "-").charAt(0).toUpperCase() + (user.role || "-").slice(1);
    document.getElementById("p_bio").innerText = user.bio || "No bio added yet";
    document.getElementById("p_skills").innerText = (user.skills || []).join(", ") || "No skills added yet";

    // ROLE BASED UI
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

function goToUpdate() {
  window.location.href = "update.html";
}

async function loadUpdateForm() {
  if (!requireAuth()) return;

  try {
    const res = await fetch(`${API}/auth/profile`, {
      headers: authHeaders()
    });

    const user = await res.json();

    // COMMON
    document.getElementById("u_name").value = user.name || "";
    document.getElementById("u_bio").value = user.bio || "";
    document.getElementById("u_skills").value = (user.skills || []).join(", ");

    // ROLE BASED
    if (user.role === "mentor") {
      const mentorFields = document.getElementById("u_mentorFields");
      if (mentorFields) {
        mentorFields.style.display = "block";
        document.getElementById("u_company").value = user.company || "";
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

  // Mentor fields
  const mentorFields = document.getElementById("u_mentorFields");
  if (mentorFields && mentorFields.style.display === "block") {
    body.company = document.getElementById("u_company").value;
    body.experienceYears = Number(document.getElementById("u_exp").value) || 0;
    body.expertise = document.getElementById("u_expertise").value.split(",").map(s => s.trim()).filter(s => s);
  }

  // Entrepreneur fields
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

  if (!currentPassword || !newPassword) {
    showToast("Please enter both current and new password", "warning");
    return;
  }

  if (newPassword.length < 6) {
    showToast("New password must be at least 6 characters", "warning");
    return;
  }

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

// ================= MEETINGS =================

async function loadMeetingsPage() {
  if (!requireAuth()) return;

  // Populate participant dropdown from connections
  try {
    const userId = getUserIdFromToken();
    const res = await fetch(`${API}/connections`, {
      headers: authHeaders()
    });

    const data = await res.json();
    const select = document.getElementById("participantId");

    if (select) {
      select.innerHTML = `<option value="">Select a connection</option>`;

      data.connections.forEach(conn => {
        const otherUser = conn.sender._id === userId ? conn.receiver : conn.sender;
        const option = document.createElement("option");
        option.value = otherUser._id;
        option.textContent = otherUser.name;
        select.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Error populating participants:", err);
  }

  // Load existing meetings
  try {
    const res = await fetch(`${API}/meetings`, {
      headers: authHeaders()
    });

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

          const participants = meet.participants
            ? meet.participants.map(p => escapeHtml(p.name)).join(", ")
            : "";

          div.innerHTML = `
            <div class="meeting-details">
              <div class="meeting-date-time">
                <strong>${escapeHtml(meet.date)}</strong>
                <span class="meeting-separator">-</span>
                <span>${escapeHtml(meet.time)}</span>
              </div>
              ${participants ? `<p class="meeting-participants">With: ${participants}</p>` : ""}
            </div>
            <a href="${escapeHtml(meet.link)}" target="_blank" class="btn-small">Join</a>
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

  if (!participantId || !date || !time || !link) {
    showToast("Please fill in all fields", "warning");
    return;
  }

  try {
    const res = await fetch(`${API}/meetings/create`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ participantId, date, time, link })
    });

    const data = await res.json();

    if (res.ok) {
      showToast("Meeting scheduled!", "success");
      // Clear form
      document.getElementById("participantId").value = "";
      document.getElementById("date").value = "";
      document.getElementById("time").value = "";
      document.getElementById("link").value = "";

      // Reload meetings list
      loadMeetingsPage();
    } else {
      showToast(data.message || "Failed to create meeting", "error");
    }
  } catch (err) {
    showToast("Network error", "error");
  }
}

// ================= PAGE ROUTING =================

// Auto-detect page and call correct initializer
const currentPage = window.location.pathname.split("/").pop();

if (currentPage === "dashboard.html") {
  // loadDashboard called from body onload
} else if (currentPage === "chat.html") {
  // loadChat called from body onload
} else if (currentPage === "connections.html") {
  // loadConnections called from body onload
} else if (currentPage === "meetings.html") {
  // loadMeetingsPage called from body onload
}

// Allow Enter key on search
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const searchInput = document.getElementById("searchInput");
    if (searchInput && document.activeElement === searchInput) {
      handleSearch();
    }

    const msgInput = document.getElementById("message");
    if (msgInput && document.activeElement === msgInput) {
      sendMessage();
    }
  }
});