const API = "http://localhost:5000/api";

// ================= GLOBAL STATE =================
let myConnections = [];
let sentRequests = [];
let receivedRequests = [];

//nav bar and side bar loading 
async function loadLayout(pageTitle) {
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

  // Load user name
  loadCurrentUserName();
}
// ================= AUTH =================

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    alert("Login successful");
    window.location.href = "dashboard.html";
  } else {
    alert(data.message);
  }
}

// REGISTER
async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role })
  });

  const data = await res.json();

  if (res.ok) {
    alert("Registration successful");
    window.location.href = "login.html";
  } else {
    alert(data.message);
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// ================= DASHBOARD =================

async function loadDashboard() {
  const token = localStorage.getItem("token");

  // 🔥 load connections first
  await loadConnections();

  // suggestions
  const res1 = await fetch(`${API}/match`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const suggestions = await res1.json();

  const suggestionsDiv = document.getElementById("suggestions");
  suggestionsDiv.innerHTML = "";

  suggestions.forEach(item => {
    const user = item.user;

    const div = document.createElement("div");
div.classList.add("user-card");

const role = user.role.charAt(0).toUpperCase() + user.role.slice(1);

div.innerHTML = `
  <div class="user-info">
    <p class="user-name">${user.name}</p>
    <p class="user-role">${role}</p>
  </div>

  <div class="user-actions">
    <button onclick="sendRequest('${user._id}')">Connect</button>
  </div>
`;
    suggestionsDiv.appendChild(div);
  });

  // 🔔 notifications
  loadNotifications();

  // meetings
  const res2 = await fetch(`${API}/meetings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const meetings = await res2.json();

  const meetingsDiv = document.getElementById("meetings");
  meetingsDiv.innerHTML = "";

  meetings.forEach(meet => {
    const div = document.createElement("div");
    div.innerHTML = `
      <p>${meet.date} - ${meet.time}</p>
      <a href="${meet.link}" target="_blank">Join Meeting</a>
      <hr/>
    `;
    meetingsDiv.appendChild(div);
  });
}

if (window.location.pathname.includes("dashboard.html")) {
  loadDashboard();
}
if (window.location.pathname.includes("chat.html")) {
  loadChat();
}
// ================= CONNECTIONS =================

async function sendRequest(receiverId) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/connections/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ receiverId })
  });

  await loadConnections();

 if (searchInput && searchInput.value.trim()) {
  searchUsers(searchInput.value.trim());
}
}

async function loadConnections() {
  const token = localStorage.getItem("token");
  const userId = getUserIdFromToken();

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  const requestsDiv = document.getElementById("requests");
  const connectionsDiv = document.getElementById("connections");

  if (requestsDiv) requestsDiv.innerHTML = "";
  if (connectionsDiv) connectionsDiv.innerHTML = "";

  // store states
  myConnections = data.connections.map(conn =>
    conn.sender._id === userId
      ? conn.receiver._id
      : conn.sender._id
  );

  sentRequests = data.sentRequests.map(r => r.receiver._id);
  receivedRequests = data.requests.map(r => r.sender._id);

  if (requestsDiv && connectionsDiv) {
    data.requests.forEach(req => {
      const div = document.createElement("div");
      div.innerHTML = `
        <p>${req.sender.name}</p>
        <button onclick="respond('${req._id}', 'accept')">Accept</button>
        <button onclick="respond('${req._id}', 'reject')">Reject</button>
        <hr/>
      `;
      requestsDiv.appendChild(div);
    });

    data.connections.forEach(conn => {
  const otherUser =
    conn.sender._id === userId
      ? conn.receiver
      : conn.sender;

  const div = document.createElement("div"); // ✅ THIS WAS MISSING

  div.innerHTML = `
    <p onclick="selectChatUser(this, '${otherUser._id}', '${otherUser.name}')">
      ${otherUser.name}
    </p>
  `;

  connectionsDiv.appendChild(div);
});
  }
}

async function respond(requestId, action) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/connections/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ requestId, action })
  });

  await loadConnections();
}

// ================= CHAT =================
// (unchanged)

let socket;
let currentUserId;
let selectedUserId;
let roomId;

async function loadChat() {
  const token = localStorage.getItem("token");

  const resUser = await fetch(`${API}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const user = await resUser.json();
  currentUserId = user._id;

  socket = io("http://localhost:5000");

  socket.on("receiveMessage", (data) => {
    displayMessage(data.senderId, data.message);
  });

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  const usersDiv = document.getElementById("users");

  usersDiv.innerHTML = "";

  data.connections.forEach(conn => {
  const otherUser =
    conn.sender._id === currentUserId
      ? conn.receiver
      : conn.sender;

  const p = document.createElement("p"); // ✅ no div confusion

  p.innerText = otherUser.name;

  p.onclick = function () {
    selectChatUser(p, otherUser._id, otherUser.name);
  };

  usersDiv.appendChild(p);
});
}

function selectChatUser(element, userId, name) {
  // remove previous active
  document.querySelectorAll("#users p").forEach(p => {
    p.classList.remove("active-chat-user");
  });

  element.classList.add("active-chat-user");

  // 🔥 THIS MUST PASS NAME
  openChat(userId, name);
}

async function openChat(userId, name) {
  selectedUserId = userId;
  document.getElementById("chatUserName").innerText = name;

  roomId = [currentUserId, selectedUserId].sort().join("_");

  socket.emit("joinRoom", roomId);

  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/messages/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const messages = await res.json();

  const msgList = document.getElementById("messages");
  msgList.innerHTML = "";

  messages.forEach(msg => {
    displayMessage(msg.sender, msg.message);
  });
}

function sendMessage() {
  const message = document.getElementById("message").value;
  if (!message.trim()) return;

  socket.emit("sendMessage", {
    roomId,
    message,
    senderId: currentUserId,
    receiverId: selectedUserId
  });

  document.getElementById("message").value = "";
}

function displayMessage(senderId, message) {
  const li = document.createElement("li");

  // base class
  li.classList.add("message");

  // alignment
  if (senderId === currentUserId) {
    li.classList.add("sent");
    li.innerText = message; // no "You:" needed
  } else {
    li.classList.add("received");
    li.innerText = message;
  }

  const messages = document.getElementById("messages");
  messages.appendChild(li);

  // auto scroll to latest message
  messages.scrollTop = messages.scrollHeight;
}

function filterChatUsers() {
  const query = document.getElementById("chatSearch").value.toLowerCase();
  const users = document.querySelectorAll("#users p");

  users.forEach(user => {
    const name = user.innerText.toLowerCase();
    user.style.display = name.includes(query) ? "block" : "none";
  });
}

// ================= SEARCH =================

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");

async function searchUsers(query) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/users/search?q=${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const users = await res.json();

  displaySearchResults(users);
}


function displaySearchResults(users) {
  searchResults.innerHTML = "";

  if (!users.length) {
    searchResults.innerHTML = "<p>No users found</p>";
    return;
  }

  users.forEach(user => {
    const div = document.createElement("div");

    const isConnected = myConnections.includes(user._id);
    const isSent = sentRequests.includes(user._id);
    const isReceived = receivedRequests.includes(user._id);

    let btn = "";

    if (isConnected) {
      btn = `<button onclick="startChatFromSearch('${user._id}', '${user.name}')">Message</button>`;
    } 
    else if (isSent) {
      btn = `<button disabled>Requested</button>`;
    } 
    else if (isReceived) {
      btn = `
        <button onclick="acceptFromSearch('${user._id}')">Accept</button>
        <button onclick="rejectFromSearch('${user._id}')">Reject</button>
      `;
    } 
    else {
      btn = `<button onclick="sendRequest('${user._id}')">Connect</button>`;
    }

    div.classList.add("user-card");

div.innerHTML = `
  <div class="user-info">
    <p class="user-name">${user.name}</p>
    <p class="user-role">${user.role}</p>
  </div>

  <div class="user-actions">
    ${btn}
  </div>
`;

    searchResults.appendChild(div);
  });
}

// SEARCH ACTIONS
async function acceptFromSearch(userId) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  const request = data.requests.find(r => r.sender._id === userId);

  if (!request) return;

  await respond(request._id, "accept");
}

async function rejectFromSearch(userId) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  const request = data.requests.find(r => r.sender._id === userId);

  if (!request) return;

  await respond(request._id, "reject");
}

function startChatFromSearch(userId, name) {
  localStorage.setItem("chatUserId", userId);
  localStorage.setItem("chatUserName", name);
  window.location.href = "chat.html";
}

// ================= NOTIFICATIONS =================

// ================= NOTIFICATIONS =================

function renderNotifications(notifs) {
  const dropdown = document.getElementById("notifDropdown");
  dropdown.innerHTML = "";

  notifs.forEach(n => {
    const div = document.createElement("div");

    if (n.type === "request") {
      div.innerText = `${n.sender.name} sent you a connection request`;
    } else {
      div.innerText = n.message || "Notification";
    }

    dropdown.appendChild(div);
  });
}

async function loadNotifications() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();

  const dropdown = document.getElementById("notifDropdown");
  const count = document.getElementById("notifCount");

  if (!dropdown || !count) return;

  dropdown.innerHTML = "";

  let unread = 0;

  data.forEach(n => {
    if (!n.isRead) unread++;

    const div = document.createElement("div");
    div.style.padding = "5px";
    div.style.borderBottom = "1px solid #ddd";

    div.innerHTML = `<p>${n.message}</p>`;

    dropdown.appendChild(div);
  });

  count.innerText = unread > 0 ? `(${unread})` : "";
}

async function toggleNotifications() {
  const dropdown = document.getElementById("notifDropdown");

  if (dropdown.style.display === "block") {
    dropdown.style.display = "none";
    return;
  }

  dropdown.style.display = "block";

  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const notifications = await res.json();

  renderNotifications(notifications);
}

async function markNotificationsRead() {
  const token = localStorage.getItem("token");

  await fetch(`${API}/notifications/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` }
  });
}

async function loadCurrentUserName() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
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

// ================= HELPER =================

function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.id;
}

function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();

  if (!query) return; // do nothing if empty

  searchUsers(query);
}

function searchConnections() {
  const query = document.getElementById("connectionSearch").value.toLowerCase();
  const container = document.getElementById("connections");

  if (!query) {
    loadConnections(); // reload full list
    return;
  }

  const cards = container.getElementsByClassName("user-card");

  for (let card of cards) {
    const name = card.querySelector(".user-name").innerText.toLowerCase();

    if (name.includes(query)) {
      card.style.display = "flex";
    } else {
      card.style.display = "none";
    }
  }
}
if (window.location.pathname.includes("connections.html")) {
  loadConnections();
}

async function loadProfile() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const user = await res.json();

  document.getElementById("p_name").innerText = user.name;
  document.getElementById("p_email").innerText = user.email;
  document.getElementById("p_role").innerText = user.role;
  document.getElementById("p_bio").innerText = user.bio || "-";
  document.getElementById("p_skills").innerText = (user.skills || []).join(", ");

  // ROLE BASED UI
  if (user.role === "mentor") {
    document.getElementById("mentorFields").style.display = "block";

    document.getElementById("p_company").innerText = user.company || "-";
    document.getElementById("p_exp").innerText = user.experienceYears || "-";
    document.getElementById("p_expertise").innerText = (user.expertise || []).join(", ");
  }

  if (user.role === "entrepreneur") {
    document.getElementById("entrepreneurFields").style.display = "block";

    document.getElementById("p_startup").innerText = user.startupName || "-";
    document.getElementById("p_idea").innerText = user.idea || "-";
    document.getElementById("p_industry").innerText = user.industry || "-";
  }
}

function goToUpdate() {
  window.location.href = "update.html";
}

async function loadUpdateForm() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const user = await res.json();

  // COMMON
  document.getElementById("u_name").value = user.name || "";
  document.getElementById("u_bio").value = user.bio || "";
  document.getElementById("u_skills").value = (user.skills || []).join(", ");

  // ROLE BASED
  if (user.role === "mentor") {
    document.getElementById("u_mentorFields").style.display = "block";

    document.getElementById("u_company").value = user.company || "";
    document.getElementById("u_exp").value = user.experienceYears || "";
    document.getElementById("u_expertise").value = (user.expertise || []).join(", ");
  }

  if (user.role === "entrepreneur") {
    document.getElementById("u_entrepreneurFields").style.display = "block";

    document.getElementById("u_startup").value = user.startupName || "";
    document.getElementById("u_idea").value = user.idea || "";
    document.getElementById("u_industry").value = user.industry || "";
  }
}

async function updateProfile() {
  const token = localStorage.getItem("token");

  const body = {
    name: document.getElementById("u_name").value,
    bio: document.getElementById("u_bio").value,
    skills: document.getElementById("u_skills").value.split(",").map(s => s.trim())
  };

  // mentor fields
  if (document.getElementById("u_mentorFields").style.display === "block") {
    body.company = document.getElementById("u_company").value;
    body.experienceYears = Number(document.getElementById("u_exp").value);
    body.expertise = document.getElementById("u_expertise").value.split(",").map(s => s.trim());
  }

  // entrepreneur fields
  if (document.getElementById("u_entrepreneurFields").style.display === "block") {
    body.startupName = document.getElementById("u_startup").value;
    body.idea = document.getElementById("u_idea").value;
    body.industry = document.getElementById("u_industry").value;
  }

  const res = await fetch(`${API}/auth/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (res.ok) {
    alert("Profile updated successfully");
    window.location.href = "profile.html";
  } else {
    alert("Update failed");
  }
}

loadCurrentUserName();