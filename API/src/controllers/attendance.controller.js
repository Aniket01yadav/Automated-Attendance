import Attendance from "../models/attendance.model.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";

/* ===============================
   MARK / TOGGLE ATTENDANCE (manual button)
================================ */
export const toggleAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, date } = req.body;

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      studentId,
      classId,
      schoolId: resolvedSchoolId,
      date: day
    });

    let record;

    if (existing) {
      existing.status =
        existing.status === "Present" ? "Absent" : "Present";

      record = await existing.save();
    } else {
      record = await Attendance.create({
        studentId,
        classId,
        schoolId: resolvedSchoolId,
        date: day,
        status: "Present"
      });
    }

    res.json({
      success: true,
      attendance: record
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===============================
   MARK PRESENT BY FACE (scanner)
================================ */
export const markPresentByFace = async (req, res) => {
  try {
    const { studentId, classId, date } = req.body;

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const record = await Attendance.findOneAndUpdate(
      {
        studentId,
        classId,
        schoolId: resolvedSchoolId,
        date: day
      },
      {
        $set: {
          status: "Present"
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    res.json({
      success: true,
      attendance: record
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===============================
   GET ATTENDANCE BY CLASS (+ date)
================================ */
export const getAttendanceByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const filter = {
      classId: new mongoose.Types.ObjectId(classId),
      schoolId: new mongoose.Types.ObjectId(resolvedSchoolId)
    };

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      filter.date = { $gte: start, $lte: end };
    }

    const attendance = await Attendance.find(filter)
      .populate("studentId");

    res.json({
      success: true,
      attendance
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===============================
   GET STUDENT ATTENDANCE (history)
================================ */
export const getAttendanceByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const data = await Attendance.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      schoolId: new mongoose.Types.ObjectId(resolvedSchoolId)
    }).sort({ date: -1 });

    res.json({
      success: true,
      attendance: data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ===============================
   GENERATE MONTHLY ATTENDANCE PDF (Professional Version)
================================ */
export const getMonthlyAttendanceReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and Year are required"
      });
    }

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      studentId: new mongoose.Types.ObjectId(studentId),
      schoolId: new mongoose.Types.ObjectId(resolvedSchoolId),
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === "Present").length;
    const absentDays = totalDays - presentDays;

    // Create PDF
    const doc = new PDFDocument({ margin: 40 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Monthly_Attendance_${month}_${year}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Header
    doc.fontSize(18).text("Monthly Attendance Report", {
      align: "center"
    });

    doc.moveDown();
    doc.fontSize(12).text(`Student ID: ${studentId}`);
    doc.text(`Month: ${month}/${year}`);
    doc.moveDown();

    // Summary Section
    doc.fontSize(14).text("Summary:");
    doc.fontSize(12).text(`Total Records: ${totalDays}`);
    doc.text(`Present: ${presentDays}`);
    doc.text(`Absent: ${absentDays}`);

    doc.moveDown();
    doc.fontSize(14).text("Daily Records:");
    doc.moveDown(0.5);

    // Table-like structure
    records.forEach((record, index) => {
      doc.fontSize(12).text(
        `${index + 1}. ${record.date.toDateString()}  -  ${record.status}`
      );
    });

    doc.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
