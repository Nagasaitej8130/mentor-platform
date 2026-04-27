# MentorConnect

MentorConnect is a full-stack web application designed to connect aspiring entrepreneurs with experienced mentors. I built this project to simplify the process of finding the right mentorship and managing professional relationships online.

Live URL: https://mentor-connect-hs6e.onrender.com

## Core Features
- Role-based profiles for Mentors and Entrepreneurs.
- Smart matching system based on skills and industry.
- Secure connection requests between users.
- Real-time chat functionality for accepted connections.
- Meeting scheduler to organize mentorship sessions.
- In-app notifications for new requests and meetings.
- Full authentication system with OTP password reset and account deletion options.

## Technologies Used
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express.js
- Database: MongoDB (with Mongoose)
- Real-time Communication: Socket.IO
- Security: JWT Authentication, bcrypt password hashing, Nodemailer for OTPs

## Setup Instructions

1. Clone the repository to your local machine.
2. Run "npm install" to install all required dependencies.
3. Create a .env file in the root directory and add your environment variables:
   - PORT (e.g., 5000)
   - MONGO_URI (your MongoDB connection string)
   - JWT_SECRET (your secret key for authentication)
   - EMAIL_USER (your gmail address for sending OTPs)
   - EMAIL_PASS (your gmail app password)
4. Start the server by running "npm run dev".
5. Open your browser and navigate to http://localhost:5000.

## Architecture and File Structure

The project follows a clean Client-Server architecture and uses the Model-View-Controller (MVC) pattern on the backend to keep the code organized and scalable.

### Backend Architecture
- **Controllers:** Business logic lives here. For example, the user controller handles profile lookups, the auth controller manages JWT generation and OTP logic, and the message controller fetches chat history.
- **Routes:** Express router files that define the API endpoints. They map incoming HTTP requests (like POST /api/auth/login) to their respective controller functions. All protected routes run through a JWT authentication middleware first.
- **Models:** Mongoose schemas that define the structure of the MongoDB database. The core models include User, Connection, Message, Meeting, and Notification.
- **Real-time Engine:** Socket.IO is attached directly to the Express server to handle bidirectional events. When a user sends a chat message, the backend saves it to MongoDB and immediately broadcasts the "receiveMessage" event to the recipient's active socket room.

### Directory Layout
- /client: Contains the entire frontend application. It uses pure HTML, CSS, and Vanilla JavaScript. The /pages folder holds individual views (login, dashboard, chat, etc.), and the /js folder holds the main client-side logic that interacts with the backend API.
- /server: Contains the Node.js application.
  - /config: Database connection setup.
  - /controllers: API logic and request handling.
  - /middleware: Security and authentication checks.
  - /models: Database schemas.
  - /routes: API endpoint definitions.
  - server.js: The main entry point that wires up Express, Socket.IO, and the database.
## Deployment
This project is currently deployed on Render. To deploy your own instance, connect your GitHub repository to a new Render Web Service, set the build command to "npm install", the start command to "npm start", and ensure all environment variables from your local .env file are added to the Render dashboard.

## License
This project is open source and available under the ISC License.
