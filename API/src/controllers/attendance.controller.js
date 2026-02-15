import Attendance from "../models/attendance.model.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import Student from "../models/student.model.js";
import Class from "../models/class.model.js";


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

    // Fetch student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Fetch class
    const classData = await Class.findById(student.classId);

    // Fetch attendance
    const records = await Attendance.find({
      studentId,
      schoolId: resolvedSchoolId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const totalDays = records.length;
    const presentDays = records.filter(r => r.status === "Present").length;
    const absentDays = totalDays - presentDays;
    const percentage =
      totalDays > 0
        ? ((presentDays / totalDays) * 100).toFixed(2)
        : 0;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_${month}_${year}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ================= HEADER ================= */
    doc
      .fontSize(18)
      .text(req.user.schoolName || "School Name", {
        align: "center"
      });

    doc.moveDown(0.5);

    doc
      .fontSize(16)
      .text("Monthly Attendance Report", {
        align: "center"
      });

    doc.moveDown(1);

    /* ================= STUDENT INFO ================= */
    doc.fontSize(12);
    doc.text(`Student Name: ${student.name}`);
    doc.text(`Roll Number: ${student.rollNo}`);
    doc.text(
      `Class: ${classData?.className || ""} ${classData?.section || ""}`
    );
    doc.text(`Month: ${month}/${year}`);
    doc.moveDown();

    /* ================= SUMMARY ================= */
    doc.fontSize(14).text("Summary", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Total Days: ${totalDays}`);
    doc.text(`Present: ${presentDays}`);
    doc.text(`Absent: ${absentDays}`);
    doc.text(`Attendance Percentage: ${percentage}%`);

    doc.moveDown(1);

    /* ================= TABLE HEADER ================= */
    doc.fontSize(14).text("Daily Records", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const dateX = 60;
    const statusX = 300;

    doc.fontSize(12).text("Date", dateX, tableTop);
    doc.text("Status", statusX, tableTop);

    doc.moveDown();

    /* ================= TABLE ROWS ================= */
    let yPosition = doc.y;

    records.forEach((record) => {
      const formattedDate = new Date(
        record.date
      ).toLocaleDateString();

      doc.text(formattedDate, dateX, yPosition);

      doc.text(
        record.status,
        statusX,
        yPosition,
        {
          width: 100,
          align: "left"
        }
      );

      yPosition += 20;
    });

    doc.end();

  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ error: err.message });
  }
};