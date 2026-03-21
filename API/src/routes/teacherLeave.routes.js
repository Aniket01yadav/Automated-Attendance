import express from "express";
import protect, { allowRoles } from "../middleware/auth.middleware.js";
import {
  applyTeacherLeave,
  getMyLeaves,
  getSchoolLeaves,
  reviewTeacherLeave,
} from "../controllers/teacherLeave.controller.js";

const router = express.Router();

router.post("/apply", protect, allowRoles("Teacher"), applyTeacherLeave);
router.get("/my", protect, allowRoles("Teacher"), getMyLeaves);
router.get("/all", protect, allowRoles("Principal", "Admin"), getSchoolLeaves);
router.put("/:leaveId/review", protect, allowRoles("Principal", "Admin"), reviewTeacherLeave);

export default router;
