import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import User from "../models/user.model.js";
import TeacherAttendance from "../models/teacherAttendance.model.js";
import TeacherAttendanceSettings from "../models/teacherAttendanceSettings.model.js";
import TeacherLeave from "../models/teacherLeave.model.js";
import {
  HALF_DAY_MIN_HOURS,
  calculateHours,
  formatDateKey,
  getMonthRange,
  normalizeDayEnd,
  normalizeDayStart,
} from "../helpers/teacherAttendance.helper.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const MIN_CHECKOUT_GAP_MS = 15 * 60 * 1000;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_ATTENDANCE_SETTINGS = Object.freeze({
  checkInTime: "09:00",
  checkOutTime: "16:00",
  gracePeriod: 0,
});

const normalizeTeacherRole = (role = "") => {
  const normalized = String(role).toLowerCase();
  if (normalized === "principal") return "admin";
  return normalized;
};

const resolveAnalyticsTeacherId = (req) => {
  const userRole = normalizeTeacherRole(req.user?.role);

  if (userRole === "teacher") {
    return String(req.user._id);
  }

  return String(req.query.teacherId || "");
};

const getSummaryAggregation = (matchStage) => {
  return TeacherAttendance.aggregate([
    { $match: matchStage },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalPresentDays: {
                $sum: {
                  $cond: [{ $in: ["$status", ["On Time", "Late"]] }, 1, 0],
                },
              },
              totalLateDays: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Late"] }, 1, 0],
                },
              },
              totalHalfDays: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Half Day"] }, 1, 0],
                },
              },
              totalLeaveDays: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
                },
              },
              totalWorkingHours: {
                $sum: { $ifNull: ["$totalHours", 0] },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalPresentDays: 1,
              totalLateDays: 1,
              totalHalfDays: 1,
              totalLeaveDays: 1,
              totalWorkingHours: { $round: ["$totalWorkingHours", 2] },
            },
          },
        ],
        statusBreakdown: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              status: "$_id",
              count: 1,
            },
          },
        ],
        dailyRecords: [
          {
            $project: {
              _id: 1,
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
              status: 1,
              checkIn: 1,
              checkOut: 1,
              totalHours: { $ifNull: ["$totalHours", 0] },
            },
          },
          { $sort: { date: 1 } },
        ],
      },
    },
  ]);
};

const buildStatusMap = (statusBreakdown = []) => {
  const map = {
    "On Time": 0,
    Late: 0,
    "Half Day": 0,
    Leave: 0,
    Absent: 0,
  };

  for (const row of statusBreakdown) {
    if (Object.prototype.hasOwnProperty.call(map, row.status)) {
      map[row.status] = row.count;
    }
  }

  return map;
};

const normalizeTimeValue = (value, fallback) => {
  const text = String(value || "").trim();
  if (TIME_24H_REGEX.test(text)) return text;
  return fallback;
};

const normalizeGracePeriod = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.floor(numeric);
};

const parseTimeToMinutes = (timeText) => {
  const [hours, minutes] = String(timeText).split(":").map(Number);
  return (hours * 60) + minutes;
};

const getAttendanceSettingsForSchool = async (schoolName) => {
  const settings = await TeacherAttendanceSettings.findOne({
    schoolName,
  })
    .select("checkInTime checkOutTime gracePeriod")
    .lean();

  if (!settings) {
    return { ...DEFAULT_ATTENDANCE_SETTINGS };
  }

  return {
    checkInTime: normalizeTimeValue(
      settings.checkInTime,
      DEFAULT_ATTENDANCE_SETTINGS.checkInTime
    ),
    checkOutTime: normalizeTimeValue(
      settings.checkOutTime,
      DEFAULT_ATTENDANCE_SETTINGS.checkOutTime
    ),
    gracePeriod: normalizeGracePeriod(settings.gracePeriod, 0),
  };
};

const createTimeForDate = (inputDate, timeText, extraMinutes = 0) => {
  const date = normalizeDayStart(inputDate);
  const safeTime = normalizeTimeValue(
    timeText,
    DEFAULT_ATTENDANCE_SETTINGS.checkInTime
  );
  const [hours, minutes] = safeTime.split(":").map(Number);
  date.setHours(hours, minutes + extraMinutes, 0, 0);
  return date;
};

const getHalfDayThresholdHours = (settings) => {
  const checkInMinutes = parseTimeToMinutes(settings.checkInTime);
  const checkOutMinutes = parseTimeToMinutes(settings.checkOutTime);

  if (checkOutMinutes <= checkInMinutes) return HALF_DAY_MIN_HOURS;

  const shiftHours = (checkOutMinutes - checkInMinutes) / 60;
  return Math.max(1, Math.round((shiftHours / 2) * 100) / 100);
};

export const getTeacherAttendanceSettings = async (req, res) => {
  try {
    const settings = await getAttendanceSettingsForSchool(req.user.schoolName);
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const updateTeacherAttendanceSettings = async (req, res) => {
  try {
    const checkInTime = String(req.body?.checkInTime || "").trim();
    const checkOutTime = String(req.body?.checkOutTime || "").trim();
    const gracePeriod = Number(req.body?.gracePeriod);

    if (!TIME_24H_REGEX.test(checkInTime) || !TIME_24H_REGEX.test(checkOutTime)) {
      return res.status(400).json({
        success: false,
        error: "checkInTime and checkOutTime must be in HH:mm format",
      });
    }

    if (!Number.isFinite(gracePeriod) || gracePeriod < 0) {
      return res.status(400).json({
        success: false,
        error: "gracePeriod must be 0 or more minutes",
      });
    }

    const checkInMinutes = parseTimeToMinutes(checkInTime);
    const checkOutMinutes = parseTimeToMinutes(checkOutTime);
    if (checkOutMinutes <= checkInMinutes) {
      return res.status(400).json({
        success: false,
        error: "checkOutTime must be later than checkInTime",
      });
    }

    const settings = await TeacherAttendanceSettings.findOneAndUpdate(
      { schoolName: req.user.schoolName },
      {
        $set: {
          checkInTime,
          checkOutTime,
          gracePeriod: Math.floor(gracePeriod),
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).select("checkInTime checkOutTime gracePeriod");

    return res.status(200).json({
      success: true,
      message: "Teacher attendance settings saved",
      settings: {
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
        gracePeriod: settings.gracePeriod,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getScannerTeachers = async (req, res) => {
  try {
    const teachers = await User.find({
      role: "Teacher",
      schoolName: req.user.schoolName,
      status: "Approved",
      "faceDescriptor.0": { $exists: true },
    }).select("_id fullName email subjectName status faceDescriptor");

    return res.status(200).json({
      success: true,
      teachers,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const registerTeacherFace = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { descriptor } = req.body;

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, error: "Invalid teacherId" });
    }

    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Face descriptor is required" });
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "Teacher",
      schoolName: req.user.schoolName,
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    teacher.faceDescriptor = descriptor;
    await teacher.save();

    return res.status(200).json({
      success: true,
      message: "Teacher face data saved successfully",
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const scanTeacherAttendance = async (req, res) => {
  try {
    const { teacherId, timestamp } = req.body;

    if (!teacherId || !isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, error: "Valid teacherId is required" });
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "Teacher",
      schoolName: req.user.schoolName,
      status: "Approved",
    }).select("_id fullName email schoolName");

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    const now = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(now.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid timestamp" });
    }
    const settings = await getAttendanceSettingsForSchool(req.user.schoolName);

    const dayStart = normalizeDayStart(now);
    const dayEnd = normalizeDayEnd(now);

    const approvedLeave = await TeacherLeave.findOne({
      teacherId: teacher._id,
      schoolName: req.user.schoolName,
      status: "Approved",
      fromDate: { $lte: dayEnd },
      toDate: { $gte: dayStart },
    });

    if (approvedLeave) {
      const leaveAttendance = await TeacherAttendance.findOneAndUpdate(
        {
          teacherId: teacher._id,
          schoolName: req.user.schoolName,
          date: dayStart,
        },
        {
          $setOnInsert: {
            teacherId: teacher._id,
            schoolName: req.user.schoolName,
            date: dayStart,
          },
          $set: {
            status: "Leave",
            totalHours: 0,
            markedBy: req.user._id,
          },
        },
        {
          new: true,
          upsert: true,
        }
      );

      return res.status(200).json({
        success: true,
        action: "ON_LEAVE",
        message: "Teacher is on approved leave for today",
        attendance: leaveAttendance,
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
        },
      });
    }

    let attendance = await TeacherAttendance.findOne({
      teacherId: teacher._id,
      schoolName: req.user.schoolName,
      date: dayStart,
    });

    if (!attendance) {
      const checkInDeadline = createTimeForDate(
        now,
        settings.checkInTime,
        settings.gracePeriod
      );
      const status = now <= checkInDeadline ? "On Time" : "Late";

      attendance = await TeacherAttendance.create({
        teacherId: teacher._id,
        schoolName: req.user.schoolName,
        date: dayStart,
        checkIn: now,
        status,
        markedBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        action: "CHECK_IN",
        message: `Check-in marked as ${status}`,
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
        },
        attendance,
      });
    }

    if (attendance.checkOut) {
      return res.status(200).json({
        success: true,
        action: "ALREADY_COMPLETED",
        message: "Check-in and check-out already marked for today",
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
        },
        attendance,
      });
    }

    if (!attendance.checkIn) {
      const checkInDeadline = createTimeForDate(
        now,
        settings.checkInTime,
        settings.gracePeriod
      );
      attendance.checkIn = now;
      attendance.status = now <= checkInDeadline ? "On Time" : "Late";
      attendance.markedBy = req.user._id;
      await attendance.save();

      return res.status(200).json({
        success: true,
        action: "CHECK_IN",
        message: `Check-in marked as ${attendance.status}`,
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
        },
        attendance,
      });
    }

    const checkInTime = new Date(attendance.checkIn).getTime();
    const currentTime = now.getTime();
    const diffMs = currentTime - checkInTime;

    if (diffMs < MIN_CHECKOUT_GAP_MS) {
      const remainingMs = MIN_CHECKOUT_GAP_MS - diffMs;
      const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));

      return res.status(400).json({
        success: false,
        action: "CHECK_OUT_BLOCKED",
        message: "Check-Out allowed after 15 minutes",
        remainingMinutes: remainingMinutes > 0 ? remainingMinutes : 1,
        teacher: {
          _id: teacher._id,
          fullName: teacher.fullName,
        },
        attendance,
      });
    }

    attendance.checkOut = now;
    attendance.totalHours = calculateHours(attendance.checkIn, now);
    const scheduledCheckOut = createTimeForDate(now, settings.checkOutTime);
    const halfDayThreshold = getHalfDayThresholdHours(settings);

    if (now < scheduledCheckOut || attendance.totalHours < halfDayThreshold) {
      attendance.status = "Half Day";
    }
    attendance.markedBy = req.user._id;
    await attendance.save();

    return res.status(200).json({
      success: true,
      action: "CHECK_OUT",
      message: "Check-out marked successfully",
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
      },
      attendance,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Attendance already exists for this teacher and date",
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getDailyTeacherAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    if (Number.isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid date" });
    }

    const dayStart = normalizeDayStart(targetDate);
    const dayEnd = normalizeDayEnd(targetDate);

    const [teachers, attendanceRecords, approvedLeaves] = await Promise.all([
      User.find({
        role: "Teacher",
        schoolName: req.user.schoolName,
        status: "Approved",
      }).select("_id fullName email subjectName status"),
      TeacherAttendance.find({
        schoolName: req.user.schoolName,
        date: { $gte: dayStart, $lte: dayEnd },
      }).select("teacherId date checkIn checkOut status totalHours"),
      TeacherLeave.find({
        schoolName: req.user.schoolName,
        status: "Approved",
        fromDate: { $lte: dayEnd },
        toDate: { $gte: dayStart },
      }).select("teacherId"),
    ]);

    const attendanceMap = new Map(
      attendanceRecords.map((row) => [String(row.teacherId), row])
    );
    const leaveTeacherIds = new Set(approvedLeaves.map((l) => String(l.teacherId)));

    const rows = teachers.map((teacher) => {
      const attendance = attendanceMap.get(String(teacher._id));

      if (attendance) {
        return {
          teacher,
          status: attendance.status,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          totalHours: attendance.totalHours || 0,
          attendanceId: attendance._id,
        };
      }

      if (leaveTeacherIds.has(String(teacher._id))) {
        return {
          teacher,
          status: "Leave",
          checkIn: null,
          checkOut: null,
          totalHours: 0,
          attendanceId: null,
        };
      }

      return {
        teacher,
        status: "Absent",
        checkIn: null,
        checkOut: null,
        totalHours: 0,
        attendanceId: null,
      };
    });

    const summary = {
      totalTeachers: rows.length,
      onTime: rows.filter((r) => r.status === "On Time").length,
      late: rows.filter((r) => r.status === "Late").length,
      halfDay: rows.filter((r) => r.status === "Half Day").length,
      leave: rows.filter((r) => r.status === "Leave").length,
      absent: rows.filter((r) => r.status === "Absent").length,
    };

    return res.status(200).json({
      success: true,
      date: formatDateKey(dayStart),
      summary,
      attendance: rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getTeacherTodayAttendance = async (req, res) => {
  try {
    const userRole = normalizeTeacherRole(req.user.role);
    const teacherId =
      userRole === "teacher"
        ? String(req.user._id)
        : String(req.query.teacherId || req.user._id);

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, error: "Invalid teacherId" });
    }

    const teacher = await User.findOne({
      _id: teacherId,
      schoolName: req.user.schoolName,
      role: "Teacher",
    }).select("_id fullName email schoolName");

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    const todayStart = normalizeDayStart(new Date());
    const todayEnd = normalizeDayEnd(new Date());

    const attendance = await TeacherAttendance.findOne({
      teacherId: teacher._id,
      schoolName: req.user.schoolName,
      date: todayStart,
    }).select("date checkIn checkOut totalHours status");

    if (attendance) {
      return res.status(200).json({
        success: true,
        teacher,
        attendance,
      });
    }

    const leave = await TeacherLeave.findOne({
      teacherId: teacher._id,
      schoolName: req.user.schoolName,
      status: "Approved",
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart },
    });

    return res.status(200).json({
      success: true,
      teacher,
      attendance: {
        date: todayStart,
        checkIn: null,
        checkOut: null,
        totalHours: 0,
        status: leave ? "Leave" : "Absent",
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const getMonthlyTeacherAnalytics = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        error: "month and year are required",
      });
    }

    const teacherId = resolveAnalyticsTeacherId(req);
    if (!teacherId || !isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        error: "teacherId is required for admin requests",
      });
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "Teacher",
      schoolName: req.user.schoolName,
    }).select("_id fullName email subjectName schoolName");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        error: "Teacher not found",
      });
    }

    const { start, end } = getMonthRange(year, month);

    const matchStage = {
      teacherId: new mongoose.Types.ObjectId(teacherId),
      schoolName: req.user.schoolName,
      date: { $gte: start, $lte: end },
    };

    const [aggregateData] = await getSummaryAggregation(matchStage);

    const summary = aggregateData?.summary?.[0] || {
      totalPresentDays: 0,
      totalLateDays: 0,
      totalHalfDays: 0,
      totalLeaveDays: 0,
      totalWorkingHours: 0,
    };

    return res.status(200).json({
      success: true,
      teacher,
      period: {
        month: Number(month),
        year: Number(year),
      },
      summary,
      statusBreakdown: buildStatusMap(aggregateData?.statusBreakdown || []),
      records: aggregateData?.dailyRecords || [],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const downloadTeacherMonthlyReport = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { month, year } = req.query;

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({ success: false, error: "Invalid teacherId" });
    }

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, error: "month and year are required" });
    }

    const teacher = await User.findOne({
      _id: teacherId,
      role: "Teacher",
      schoolName: req.user.schoolName,
    }).select("_id fullName email subjectName schoolName");

    if (!teacher) {
      return res.status(404).json({ success: false, error: "Teacher not found" });
    }

    const { start, end } = getMonthRange(year, month);

    const matchStage = {
      teacherId: new mongoose.Types.ObjectId(teacherId),
      schoolName: req.user.schoolName,
      date: { $gte: start, $lte: end },
    };

    const [aggregateData, attendanceRows] = await Promise.all([
      getSummaryAggregation(matchStage),
      TeacherAttendance.find(matchStage)
        .sort({ date: 1 })
        .select("date status checkIn checkOut totalHours"),
    ]);

    const summary = aggregateData?.[0]?.summary?.[0] || {
      totalPresentDays: 0,
      totalLateDays: 0,
      totalHalfDays: 0,
      totalLeaveDays: 0,
      totalWorkingHours: 0,
    };

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Teacher_Attendance_${teacher.fullName}_${month}_${year}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(18).text("Teacher Monthly Attendance Report", { align: "center" });
    doc.moveDown(1);
    doc.fontSize(12).text(`School: ${teacher.schoolName}`);
    doc.text(`Teacher: ${teacher.fullName}`);
    doc.text(`Email: ${teacher.email}`);
    doc.text(`Subject: ${teacher.subjectName || "-"}`);
    doc.text(`Month/Year: ${month}/${year}`);
    doc.moveDown(1);

    doc.fontSize(13).text("Summary", { underline: true });
    doc.moveDown(0.4);
    doc.fontSize(11).text(`Present Days: ${summary.totalPresentDays}`);
    doc.text(`Late Days: ${summary.totalLateDays}`);
    doc.text(`Half Days: ${summary.totalHalfDays}`);
    doc.text(`Leave Days: ${summary.totalLeaveDays}`);
    doc.text(`Working Hours: ${summary.totalWorkingHours}`);
    doc.moveDown(1);

    doc.fontSize(13).text("Daily Records", { underline: true });
    doc.moveDown(0.5);

    const tableHeaderY = doc.y;
    const columns = {
      date: 45,
      status: 145,
      checkIn: 255,
      checkOut: 365,
      hours: 475,
    };

    doc.rect(40, tableHeaderY - 2, 515, 22).stroke();
    doc.fontSize(10).text("Date", columns.date, tableHeaderY + 4);
    doc.text("Status", columns.status, tableHeaderY + 4);
    doc.text("Check-In", columns.checkIn, tableHeaderY + 4);
    doc.text("Check-Out", columns.checkOut, tableHeaderY + 4);
    doc.text("Hours", columns.hours, tableHeaderY + 4);

    let y = tableHeaderY + 22;

    for (const row of attendanceRows) {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      const dateText = formatDateKey(row.date);
      const checkInText = row.checkIn
        ? new Date(row.checkIn).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "-";
      const checkOutText = row.checkOut
        ? new Date(row.checkOut).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "-";

      doc.rect(40, y - 2, 515, 20).stroke();
      doc.fontSize(9).text(dateText, columns.date, y + 4);
      doc.text(row.status || "-", columns.status, y + 4);
      doc.text(checkInText, columns.checkIn, y + 4);
      doc.text(checkOutText, columns.checkOut, y + 4);
      doc.text(String(row.totalHours || 0), columns.hours, y + 4);

      y += 20;
    }

    doc.moveDown(2);
    doc.fontSize(9).text("Generated by Automated Attendance System", {
      align: "right",
    });

    doc.end();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
