🚀 Automated Attendance System

An AI-powered Attendance Management System designed to eliminate manual attendance, reduce proxy entries, and improve efficiency using Face Recognition and Role-Based Access Control.

📌 Overview

Traditional attendance systems are:

Time-consuming
Error-prone
Vulnerable to proxy attendance

This project solves these problems by integrating:

🤖 Face Recognition
🔐 Secure Authentication (JWT)
👨‍🏫 Teacher & Student Management
📊 Real-time Analytics Dashboard

🎯 Key Features

👨‍🎓 Student Attendance
Face recognition-based attendance marking
Real-time detection and validation
Prevents proxy attendance

👨‍🏫 Teacher Attendance
Attendance marked via Principal/Admin device
Face recognition-based verification
Check-in / Check-out system
Late arrival detection
Working hours calculation
15-minute validation rule for checkout

🧑‍💼 Admin Control
Full system access
Manage students, teachers, and classes
Configure attendance settings
View system analytics

📊 Dashboard & Analytics
Attendance trends
Monthly reports
Present / Absent / Late statistics
Visual charts for better insights

📄 Reports & Export
Generate attendance reports
Download PDF summaries

🔐 Authentication & Security
JWT-based authentication
Role-based access (Admin, Teacher, Student)
Protected API routes

🧠 Tech Stack
Frontend
React (Vite)
Axios
Recharts (for charts)
Backend
Node.js
Express.js
Database
MongoDB (Mongoose)
AI / Face Recognition
Face detection & recognition logic (custom integration)

🏗️ System Architecture
Frontend (React)
        ↓
REST API (Express.js)
        ↓
Authentication (JWT Middleware)
        ↓
Face Recognition Engine
        ↓
MongoDB Database

🔄 Attendance Flow
Student Attendance
Student appears in front of camera
Face is detected and verified
Attendance is marked instantly
Teacher Attendance
Admin opens teacher scanner
Teacher face is scanned
System marks:
Check-In OR Check-Out
Calculates:
Late status
Working hours

👨‍💻 Author

Abhinash Kumar

Final Year Engineering Student
Aspiring Software Developer
