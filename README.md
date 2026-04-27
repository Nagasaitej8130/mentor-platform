# 🚀 MentorConnect

**A full-stack mentorship platform that connects entrepreneurs with experienced mentors.**

> MentorConnect helps aspiring entrepreneurs find the right mentors, build meaningful professional relationships, and manage their learning journey — all in one place.

🔗 **Live URL:** [mentor-connect-hs6e.onrender.com](https://mentor-connect-hs6e.onrender.com)
[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Click_Here-blue?style=for-the-badge)](https://mentor-connect-hs6e.onrender.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Screenshots](#-screenshots)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Secure user registration & login with JWT-based auth and bcrypt password hashing |
| 👤 **Role-based Profiles** | Separate profile flows for **Mentors** and **Entrepreneurs** with tailored fields |
| 🤝 **Smart Matching** | Algorithm-driven mentor-entrepreneur matching based on skills, expertise & goals |
| 🔗 **Connection System** | Send, accept, and manage connection requests between users |
| 💬 **Real-time Chat** | Instant messaging powered by **Socket.IO** with persistent message history |
| 📅 **Meeting Scheduler** | Propose and manage mentorship sessions with date, time & meeting links |
| 🔔 **Notifications** | Stay updated with in-app notifications for connection requests and meetings |
| 🔑 **Change Password** | Secure password update functionality for authenticated users |
| 📱 **Responsive Design** | Clean, mobile-friendly UI that works across all device sizes |

---

## 🛠 Tech Stack

### Frontend
- **HTML5** — Semantic markup
- **CSS3** — Custom properties, responsive grid layouts, glassmorphism effects
- **Vanilla JavaScript** — No framework dependencies, lightweight & fast

### Backend
- **Node.js** — Runtime environment
- **Express.js v5** — Web framework
- **MongoDB + Mongoose** — NoSQL database & ODM
- **Socket.IO** — Real-time bidirectional communication
- **JWT** — Token-based authentication
- **bcryptjs** — Password hashing

---

## 📁 Project Structure

```
mentor-platform/
├── client/                     # Frontend
│   ├── index.html              # Landing page
│   ├── css/
│   │   └── style.css           # Global styles & design system
│   ├── js/
│   │   └── main.js             # Client-side application logic
│   ├── components/             # Reusable UI components
│   └── pages/
│       ├── login.html          # Login page
│       ├── register.html       # Registration page
│       ├── dashboard.html      # User dashboard
│       ├── profile.html        # View profile
│       ├── update.html         # Edit profile
│       ├── connections.html    # Manage connections
│       ├── chat.html           # Real-time messaging
│       └── meetings.html       # Meeting scheduler
│
├── server/                     # Backend
│   ├── server.js               # Entry point — Express + Socket.IO setup
│   ├── config/
│   │   └── db.js               # MongoDB connection config
│   ├── models/
│   │   ├── User.js             # User schema (mentor/entrepreneur)
│   │   ├── Connection.js       # Connection request schema
│   │   ├── Message.js          # Chat message schema
│   │   ├── Meeting.js          # Meeting schema
│   │   └── Notification.js     # Notification schema
│   ├── controllers/
│   │   ├── authController.js   # Auth logic (register, login, profile)
│   │   ├── connectionController.js
│   │   ├── matchController.js
│   │   ├── meetingController.js
│   │   ├── messageController.js
│   │   ├── notificationController.js
│   │   └── userController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── connectionRoutes.js
│   │   ├── matchRoutes.js
│   │   ├── meetingRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── userRoutes.js
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification middleware
│   └── socket/                 # Socket.IO event handlers
│
├── .env                        # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (local instance or [MongoDB Atlas](https://www.mongodb.com/atlas))
- [Git](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mentor-platform.git
   cd mentor-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

---

## 🔐 Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port number | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mentorDB` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `my_super_secret_key_123` |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login & get JWT token | ❌ |
| `GET` | `/api/auth/profile` | Get current user profile | ✅ |
| `PUT` | `/api/auth/profile` | Update user profile | ✅ |
| `PUT` | `/api/auth/change-password` | Change password | ✅ |

### Connections
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/connections` | Send a connection request | ✅ |
| `GET` | `/api/connections` | Get user's connections | ✅ |
| `PUT` | `/api/connections/:id` | Accept/update a connection | ✅ |

### Matching
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/match` | Get mentor/entrepreneur matches | ✅ |

### Messages
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/messages/:userId` | Get chat history with a user | ✅ |

### Meetings
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/meetings` | Schedule a new meeting | ✅ |
| `GET` | `/api/meetings` | Get user's meetings | ✅ |

### Notifications
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/notifications` | Get user's notifications | ✅ |
| `PUT` | `/api/notifications/:id` | Mark notification as read | ✅ |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/users` | Get all users | ✅ |
| `GET` | `/api/users/:id` | Get a specific user | ✅ |

---

## 🌐 Deployment

This project is deployed on **Render**.

🔗 **Live URL:** [mentor-connect-hs6e.onrender.com](https://mentor-connect-hs6e.onrender.com)

### Deploy Your Own

1. Push the code to a GitHub repository
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repo
4. Configure the following:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add your environment variables (`MONGO_URI`, `JWT_SECRET`) in Render's dashboard
6. Deploy! 🎉

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

## 👨‍💻 Author

Made with ❤️ for connecting mentors and entrepreneurs.

---

> ⭐ If you found this project helpful, please consider giving it a star!
