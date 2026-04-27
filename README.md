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

## Project Structure
The project is split into a client and server architecture. 
The client folder contains all the frontend pages, CSS styles, and client-side scripts. 
The server folder handles the backend logic, containing the Express API routes, MongoDB models, controllers, and socket configuration for the real-time chat.

## Deployment
This project is currently deployed on Render. To deploy your own instance, connect your GitHub repository to a new Render Web Service, set the build command to "npm install", the start command to "npm start", and ensure all environment variables from your local .env file are added to the Render dashboard.

## License
This project is open source and available under the ISC License.
