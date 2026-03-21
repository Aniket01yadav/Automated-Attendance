import mongoose from "mongoose";
import TeacherLeave from "../models/teacherLeave.model.js";
import TeacherAttendance from "../models/teacherAttendance.model.js";
import User from "../models/user.model.js";
import {
  eachDayInRange,
  normalizeDayEnd,
  normalizeDayStart,
} from "../helpers/teacherAttendance.helper.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const markAttendanceAsLeave = async (leave, adminId) => {
  const days = eachDayInRange(leave.fromDate, leave.toDate);

  for (const day of days) {
    const existing = await TeacherAttendance.findOne({
      teacherId: leave.teacherId,
      schoolName: leave.schoolName,
      date: day,
    });

    if (existing) {
      // Do not override already captured working-day attendance.
      if (existing.checkIn || existing.checkOut) {
        continue;
      }

      existing.status = "Leave";
      existing.totalHours = 0;
      existing.markedBy = adminId;
      await existing.save();
      continue;
    }

    await TeacherAttendance.create({
      teacherId: leave.teacherId,
      schoolName: leave.schoolName,
      date: day,
      status: "Leave",
      totalHours: 0,
      markedBy: adminId,
    });
  }
};

export const applyTeacherLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        error: "fromDate, toDate and reason are required",
      });
    }

    const start = normalizeDayStart(new Date(fromDate));
    const end = normalizeDayStart(new Date(toDate));

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid leave date" });
    }

    if (end < start) {
      return res
        .status(400)
        .json({ success: false, error: "toDate must be greater than or equal to fromDate" });
    }

    const overlap = await TeacherLeave.findOne({
      teacherId: req.user._id,
      schoolName: req.user.schoolName,
      status: { $in: ["Pending", "Approved"] },
      fromDate: { $lte: normalizeDayEnd(end) },
      toDate: { $gte: start },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        error: "Overlapping leave request already exists",
      });
    }

    const leave = await TeacherLeave.create({
      teacherId: req.user._id,
      schoolName: req.user.schoolName,
      fromDate: start,
      toDate: end,
      reason: String(reason).trim(),
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      message: "Leave request submitted",
      leave,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await TeacherLeave.find({
      teacherId: req.user._id,
      schoolName: req.user.schoolName,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      leaves,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getSchoolLeaves = async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : null;
    const query = { schoolName: req.user.schoolName };

    if (status) {
      query.status = status;
    }

    const leaves = await TeacherLeave.find(query)
      .populate("teacherId", "fullName email subjectName")
      .populate("reviewedBy", "fullName role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      leaves,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const reviewTeacherLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, adminRemark } = req.body;

    if (!isValidObjectId(leaveId)) {
      return res.status(400).json({ success: false, error: "Invalid leaveId" });
    }

    if (!["Approved", "Rejected"].includes(String(status))) {
      return res.status(400).json({
        success: false,
        error: "status must be Approved or Rejected",
      });
    }

    const leave = await TeacherLeave.findOne({
      _id: leaveId,
      schoolName: req.user.schoolName,
    });

    if (!leave) {
      return res.status(404).json({ success: false, error: "Leave request not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(409).json({
        success: false,
        error: "Leave request has already been reviewed",
      });
    }

    const teacher = await User.findOne({
      _id: leave.teacherId,
      schoolName: req.user.schoolName,
      role: "Teacher",
    }).select("_id fullName email");

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.adminRemark = adminRemark ? String(adminRemark).trim() : "";
    await leave.save();

    if (status === "Approved") {
      await markAttendanceAsLeave(leave, req.user._id);
    }

    return res.status(200).json({
      success: true,
      message: `Leave ${status.toLowerCase()} successfully`,
      leave,
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
