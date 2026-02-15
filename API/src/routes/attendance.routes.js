import express from "express";
import protect from "../middleware/auth.middleware.js";
import { getMonthlyAttendanceReport } from "../controllers/attendance.controller.js";

import {
  toggleAttendance,
  getAttendanceByClass,
  getAttendanceByStudent,
  markPresentByFace
} from "../controllers/attendance.controller.js";

const router = express.Router();

/* manual toggle (button) */
router.put(
  "/toggle/:studentId",
  protect,
  toggleAttendance
);

/* face scanner (present only) */
router.post(
  "/mark-present",
  protect,
  markPresentByFace
);

/* class attendance */
router.get(
  "/class/:classId",
  protect,
  getAttendanceByClass
);

/* monthly PDF report */
router.get(
  "/student/:studentId/monthly-report",
  protect,
  getMonthlyAttendanceReport
);

/* student attendance history */
router.get(
  "/student/:studentId",
  protect,
  getAttendanceByStudent
);

export default router;
