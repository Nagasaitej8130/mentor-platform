const API = "http://localhost:5000/api";

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

  // suggestions
  const res1 = await fetch(`${API}/match`, {
    headers: { Authorization: token }
  });
  const suggestions = await res1.json();

  const suggestionsDiv = document.getElementById("suggestions");
  suggestionsDiv.innerHTML = "";

  suggestions.forEach(item => {
    const user = item.user;

    const div = document.createElement("div");
    div.innerHTML = `
      <p><b>${user.name}</b> (${user.role})</p>
      <button onclick="sendRequest('${user._id}')">Connect</button>
      <hr/>
    `;
    suggestionsDiv.appendChild(div);
    loadNotifications();
  });

  // meetings
  const res2 = await fetch(`${API}/meetings`, {
    headers: { Authorization: token }
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

// ================= CONNECTIONS =================

async function sendRequest(receiverId) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/connections/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ receiverId })
  });

  alert("Request sent");
}

async function loadConnections() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const requestsDiv = document.getElementById("requests");
  const connectionsDiv = document.getElementById("connections");

  requestsDiv.innerHTML = "";
  connectionsDiv.innerHTML = "";

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
      conn.sender._id === getUserIdFromToken()
        ? conn.receiver
        : conn.sender;

    const div = document.createElement("div");
    div.innerHTML = `
      <p>${otherUser.name} (${otherUser.role})</p>
      <hr/>
    `;
    connectionsDiv.appendChild(div);
  });
}

async function respond(requestId, action) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/connections/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ requestId, action })
  });

  alert(`Request ${action}ed`);
  loadConnections();
}

if (window.location.pathname.includes("connections.html")) {
  loadConnections();
}

// ================= CHAT =================

let socket;
let currentUserId;
let selectedUserId;
let roomId;

async function loadChat() {
  const token = localStorage.getItem("token");

  const resUser = await fetch(`${API}/auth/profile`, {
    headers: { Authorization: token }
  });
  const user = await resUser.json();
  currentUserId = user._id;

  socket = io("http://localhost:5000");

  socket.on("receiveMessage", (data) => {
    displayMessage(data.senderId, data.message);
  });

  const res = await fetch(`${API}/connections`, {
    headers: { Authorization: token }
  });

  const data = await res.json();
  const usersDiv = document.getElementById("users");

  data.connections.forEach(conn => {
    const otherUser =
      conn.sender._id === currentUserId
        ? conn.receiver
        : conn.sender;

    const div = document.createElement("div");
    div.innerHTML = `
      <p onclick="openChat('${otherUser._id}', '${otherUser.name}')">
        ${otherUser.name}
      </p>
    `;
    usersDiv.appendChild(div);
  });
}

async function openChat(userId, name) {
  selectedUserId = userId;
  document.getElementById("chatWith").innerText = "Chat with " + name;

  roomId = [currentUserId, selectedUserId].sort().join("_");

  socket.emit("joinRoom", roomId);

  const token = localStorage.getItem("token");
  const res = await fetch(`${API}/messages/${userId}`, {
    headers: { Authorization: token }
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
  const label = senderId === currentUserId ? "You" : "Them";
  li.innerText = `${label}: ${message}`;
  document.getElementById("messages").appendChild(li);
}

if (window.location.pathname.includes("chat.html")) {
  loadChat();
}

// ================= MEETINGS =================

async function loadMeetings() {
  const token = localStorage.getItem("token");
  const userId = getUserIdFromToken();

  // load connections → dropdown
  const resConn = await fetch(`${API}/connections`, {
    headers: { Authorization: token }
  });

  const connData = await resConn.json();

  const dropdown = document.getElementById("participantId");
  dropdown.innerHTML = `<option value="">Select User</option>`;

  if (connData.connections.length === 0) {
    dropdown.innerHTML = `<option>No connections available</option>`;
  }

  connData.connections.forEach(conn => {
    const otherUser =
      conn.sender._id === userId
        ? conn.receiver
        : conn.sender;

    const option = document.createElement("option");
    option.value = otherUser._id;
    option.textContent = `${otherUser.name} (${otherUser.email})`;

    dropdown.appendChild(option);
  });

  // load meetings
  const resMeet = await fetch(`${API}/meetings`, {
    headers: { Authorization: token }
  });

  const meetings = await resMeet.json();

  const meetingsDiv = document.getElementById("meetingsList");
  meetingsDiv.innerHTML = "";

  meetings.forEach(m => {
    const otherUser = m.participants.find(p => p._id !== userId);

    const div = document.createElement("div");
    div.innerHTML = `
      <p>
        <b>With:</b> ${otherUser?.name || "Unknown"} <br/>
        <b>Date:</b> ${m.date} <br/>
        <b>Time:</b> ${m.time}
      </p>
      <a href="${m.link}" target="_blank">Join Meeting</a>
      <hr/>
    `;
    meetingsDiv.appendChild(div);
  });
}

// CREATE MEETING
async function createMeeting() {
  const token = localStorage.getItem("token");

  const participantId = document.getElementById("participantId").value;
  const date = document.getElementById("date").value;
  const time = document.getElementById("time").value;
  const link = document.getElementById("link").value;

  if (!participantId || !date || !time || !link) {
    alert("Please fill all fields");
    return;
  }

  await fetch(`${API}/meetings/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ participantId, date, time, link })
  });

  alert("Meeting created");
  loadMeetings();
}

if (window.location.pathname.includes("meetings.html")) {
  loadMeetings();
}

// ================= HELPER =================

function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.id;
}


// LOAD NOTIFICATIONS
async function loadNotifications() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}/notifications`, {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const dropdown = document.getElementById("notifDropdown");
  const count = document.getElementById("notifCount");

  dropdown.innerHTML = "";

  let unread = 0;

  data.forEach(n => {
    if (!n.isRead) unread++;

    const div = document.createElement("div");
    div.style.padding = "5px";
    div.style.borderBottom = "1px solid #ddd";

    div.innerHTML = `
      <p>${n.message}</p>
    `;

    dropdown.appendChild(div);
  });

  count.innerText = unread > 0 ? `(${unread})` : "";
}

// TOGGLE DROPDOWN
function toggleNotifications() {
  const dropdown = document.getElementById("notifDropdown");

  if (dropdown.style.display === "none") {
    dropdown.style.display = "block";
    loadNotifications();
    markNotificationsRead();
  } else {
    dropdown.style.display = "none";
  }
}

// MARK AS READ
async function markNotificationsRead() {
  const token = localStorage.getItem("token");

  await fetch(`${API}/notifications/read`, {
    method: "PUT",
    headers: { Authorization: token }
  });
}