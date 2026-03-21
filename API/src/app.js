import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import classRoutes from "./routes/class.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import teacherAttendanceRoutes from "./routes/teacherAttendance.routes.js";
import teacherLeaveRoutes from "./routes/teacherLeave.routes.js";


const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/class", classRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/teacher-attendance", teacherAttendanceRoutes);
app.use("/api/teacher-leave", teacherLeaveRoutes);


export default app;


