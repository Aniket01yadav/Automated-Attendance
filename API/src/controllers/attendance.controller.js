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

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classData = await Class.findById(student.classId);

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

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Attendance_${month}_${year}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ================== HEADER ================== */
    doc
      .fontSize(20)
      .text(req.user.schoolName || "School Name", {
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .fontSize(16)
      .text("MONTHLY ATTENDANCE CERTIFICATE", {
        align: "center",
      });

    doc.moveDown(1);

    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1);

    /* ================== STUDENT INFO ================== */
    doc.fontSize(12);
    doc.text(`Student Name : ${student.name}`);
    doc.text(`Roll Number  : ${student.rollNo}`);
    doc.text(
      `Class        : ${classData?.className || ""} ${classData?.section || ""}`
    );
    doc.text(`Month        : ${month}/${year}`);

    doc.moveDown(1);

    /* ================== SUMMARY ================== */
    doc.fontSize(14).text("Attendance Summary", { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(12);
    doc.text(`Total Working Days : ${totalDays}`);
    doc.text(`Days Present       : ${presentDays}`);
    doc.text(`Days Absent        : ${absentDays}`);
    doc.text(`Attendance %       : ${percentage}%`);

    doc.moveDown(1);

    /* ================== TABLE ================== */
    doc.fontSize(14).text("Detailed Attendance Record", {
      underline: true,
    });

    doc.moveDown(0.5);

    const tableTop = doc.y;
    const dateX = 60;
    const statusX = 350;

    // Table Header
    doc.rect(50, tableTop, 500, 25).stroke();
    doc.text("Date", dateX, tableTop + 7);
    doc.text("Status", statusX, tableTop + 7);

    let yPosition = tableTop + 25;

    // Table Rows
    records.forEach((record) => {
      doc.rect(50, yPosition, 500, 25).stroke();

      const formattedDate = new Date(
        record.date
      ).toLocaleDateString();

      doc.text(formattedDate, dateX, yPosition + 7);
      doc.text(record.status, statusX, yPosition + 7);

      yPosition += 25;
    });

    doc.moveDown(2);

    /* ================== CERTIFICATE TEXT ================== */
    doc.moveTo(50, yPosition + 10)
      .lineTo(550, yPosition + 10)
      .stroke();

    doc.moveDown(2);

    doc.fontSize(11).text(
      `This is to certify that ${student.name} of class ${classData?.className || ""
      } has maintained an attendance of ${percentage}% for the month ${month}/${year}.`,
      {
        align: "justify",
      }
    );

    doc.moveDown(3);

    /* ================== SIGNATURE BLOCK ================== */
    const signatureY = doc.y;

    doc.text("__________________________", 60, signatureY);
    doc.text("Class Teacher", 60, signatureY + 15);

    doc.text("__________________________", 350, signatureY);
    doc.text("Principal", 350, signatureY + 15);

    doc.moveDown(4);

    /* ================== FOOTER ================== */
    doc.moveDown(3);

    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1);

    const istDate = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    doc.fontSize(9).text(
      `Generated on: ${istDate} (IST)`
    );

    doc.text(
      "This is a system generated document.",
      { align: "right" }
    );


    doc.end();
  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(500).json({ error: err.message });
  }
};