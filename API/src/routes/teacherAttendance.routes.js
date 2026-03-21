import express from "express";
import protect, { allowRoles } from "../middleware/auth.middleware.js";
import {
  downloadTeacherMonthlyReport,
  getDailyTeacherAttendance,
  getMonthlyTeacherAnalytics,
  getScannerTeachers,
  getTeacherAttendanceSettings,
  getTeacherTodayAttendance,
  registerTeacherFace,
  scanTeacherAttendance,
  updateTeacherAttendanceSettings,
} from "../controllers/teacherAttendance.controller.js";

const router = express.Router();

router.get("/settings", protect, allowRoles("Admin"), getTeacherAttendanceSettings);
router.put("/settings", protect, allowRoles("Admin"), updateTeacherAttendanceSettings);
router.get("/scanner-teachers", protect, allowRoles("Admin"), getScannerTeachers);
router.put("/face/:teacherId", protect, allowRoles("Admin"), registerTeacherFace);
router.post("/scan", protect, allowRoles("Admin"), scanTeacherAttendance);
router.get("/daily", protect, allowRoles("Admin"), getDailyTeacherAttendance);
router.get("/today", protect, allowRoles("Teacher", "Principal", "Admin"), getTeacherTodayAttendance);
router.get("/analytics", protect, allowRoles("Teacher", "Principal", "Admin"), getMonthlyTeacherAnalytics);
router.get("/report/:teacherId", protect, allowRoles("Admin"), downloadTeacherMonthlyReport);

export default router;
