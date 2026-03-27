import Attendance from "../models/attendance.model.js";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import Student from "../models/student.model.js";
import Class from "../models/class.model.js";


/* ===============================
   HELPER: MARK ALL OTHER STUDENTS ABSENT
================================ */
const markAllOthersAbsent = async (classId, schoolId, date, excludeStudentId) => {
  try {
    // Get all students in the class
    const students = await Student.find({
      classId,
      schoolId
    }).select('_id');

    // Mark all students as absent except the one who was marked present
    const bulkOps = students
      .filter(student => student._id.toString() !== excludeStudentId.toString())
      .map(student => ({
        updateOne: {
          filter: {
            studentId: student._id,
            classId,
            schoolId,
            date
          },
          update: {
            $set: {
              status: "Absent"
            }
          },
          upsert: true
        }
      }));

    if (bulkOps.length > 0) {
      await Attendance.bulkWrite(bulkOps);
      console.log(`Marked ${bulkOps.length} students as absent for class ${classId} on ${date}`);
    }
  } catch (error) {
    console.error('Error marking all others absent:', error);
  }
};


/* ===============================
   MARK / TOGGLE ATTENDANCE (manual button) - AUTO MARK OTHERS ABSENT
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
    let isFirstPresent = false;

    if (existing) {
      // If changing from Absent to Present, only mark others absent when
      // there are no other "Present" records for this class/day.
      if (existing.status === "Absent") {
        const existingPresents = await Attendance.countDocuments({
          classId,
          schoolId: resolvedSchoolId,
          date: day,
          status: "Present",
        });
        isFirstPresent = existingPresents === 0;
      }
      existing.status =
        existing.status === "Present" ? "Absent" : "Present";

      record = await existing.save();
    } else {
      // New record - check if this is the first present for the class today
      const existingAttendance = await Attendance.find({
        classId,
        schoolId: resolvedSchoolId,
        date: day,
        status: "Present"
      });

      isFirstPresent = existingAttendance.length === 0;

      record = await Attendance.create({
        studentId,
        classId,
        schoolId: resolvedSchoolId,
        date: day,
        status: "Present"
      });
    }

    // If this is the first student marked present, mark all other students as absent
    if (isFirstPresent && record.status === "Present") {
      await markAllOthersAbsent(classId, resolvedSchoolId, day, studentId);
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
   MARK PRESENT BY FACE (scanner) - AUTO MARK OTHERS ABSENT
================================ */
export const markPresentByFace = async (req, res) => {
  try {
    const { studentId, classId, date } = req.body;

    const resolvedSchoolId =
      req.user?.schoolId || req.user?._id;

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    // Check if this is the first present for the class today
    const existingAttendance = await Attendance.find({
      classId,
      schoolId: resolvedSchoolId,
      date: day,
      status: "Present"
    });

    const isFirstPresent = existingAttendance.length === 0;

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

    // If this is the first student marked present, mark all other students as absent
    if (isFirstPresent) {
      await markAllOthersAbsent(classId, resolvedSchoolId, day, studentId);
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
   GET CLASS MONTHLY ATTENDANCE CSV
================================ */
export const getMonthlyClassAttendanceReport = async (req, res) => {
  try {
    const { classId } = req.params;
    const { month, year } = req.query;

    if (!classId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "classId/month/year are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: "Invalid classId" });
    }

    const resolvedSchoolId = req.user?.schoolId || req.user?._id;

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(Number(year), Number(month), 0);
    endDate.setHours(23, 59, 59, 999);

    const students = await Student.find({
      classId: new mongoose.Types.ObjectId(classId),
      schoolId: new mongoose.Types.ObjectId(resolvedSchoolId)
    }).sort({ rollNo: 1 });

    const classAttendance = await Attendance.find({
      classId: new mongoose.Types.ObjectId(classId),
      schoolId: new mongoose.Types.ObjectId(resolvedSchoolId),
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    const dateList = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateList.push(new Date(d));
    }

    const attendanceMap = new Map();
    classAttendance.forEach((rec) => {
      const sid = rec.studentId?.toString();
      if (!sid || !rec.date) return;
      const dateKey = new Date(rec.date).toISOString().slice(0, 10);
      attendanceMap.set(`${sid}|${dateKey}`, rec.status || "Present");
    });

    const rows = students.map((student) => {
      let presentCount = 0;
      let absentCount = 0;
      let notScannedCount = 0;

      const statusByDate = {};
      dateList.forEach((dt) => {
        const dateKey = dt.toISOString().slice(0, 10);
        const status = attendanceMap.get(`${student._id.toString()}|${dateKey}`) || "Not Scanned";
        if (status === "Present") presentCount += 1;
        else if (status === "Absent") absentCount += 1;
        else notScannedCount += 1;
        statusByDate[dateKey] = status;
      });

      return {
        studentName: student.name,
        rollNo: student.rollNo,
        statusByDate,
        presentCount,
        absentCount,
        notScannedCount
      };
    });

    const escapeCsv = (text) => {
      if (text === null || text === undefined) return "";
      const str = String(text);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const headers = ["Student Name", "Roll No", ...dateList.map((dt) => dt.toISOString().slice(0, 10)), "Present", "Absent", "Not Scanned"];

    const classData = await Class.findById(classId);

    const csvMeta = [
      ["School", escapeCsv(req.user?.schoolName || "")],
      ["Class", escapeCsv(`${classData?.className || ""}${classData?.section ? ` - ${classData.section}` : ""}`)],
      ["Teacher", escapeCsv(req.user?.fullName || req.user?.name || "")],
      ["Month", escapeCsv(`${month}/${year}`)],
      ["Generated At", escapeCsv(new Date().toLocaleString())],
      []
    ];

    const csvRows = [
      ...csvMeta.map((row) => row.join(",")),
      headers.join(",")
    ];

    rows.forEach((row) => {
      const rowData = [
        escapeCsv(row.studentName),
        escapeCsv(row.rollNo),
        ...dateList.map((dt) => escapeCsv(row.statusByDate[dt.toISOString().slice(0, 10)] || "Not Scanned")),
        escapeCsv(row.presentCount),
        escapeCsv(row.absentCount),
        escapeCsv(row.notScannedCount)
      ];
      csvRows.push(rowData.join(","));
    });

    // Build formatted Excel file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Attendance");

    worksheet.addRow(["School", req.user?.schoolName || ""]);
    worksheet.addRow(["Class", `${classData?.className || ""}${classData?.section ? ` - ${classData.section}` : ""}`]);
    worksheet.addRow(["Teacher", req.user?.fullName || req.user?.name || ""]);
    worksheet.addRow(["Month", `${month}/${year}`]);
    worksheet.addRow(["Generated At", new Date().toLocaleString()]);
    worksheet.addRow([]);

    const headerRow = ["Student Name", "Roll No", ...dateList.map((dt) => dt.toISOString().slice(0, 10)), "Present", "Absent", "Not Scanned"];
    const header = worksheet.addRow(headerRow);
    header.font = { bold: true };

    worksheet.views = [{ state: 'frozen', ySplit: 7 }];

    for (const row of rows) {
      const dataRow = [
        row.studentName,
        row.rollNo,
        ...dateList.map((dt) => row.statusByDate[dt.toISOString().slice(0, 10)] || "Not Scanned"),
        row.presentCount,
        row.absentCount,
        row.notScannedCount
      ];
      const excelRow = worksheet.addRow(dataRow);

      for (let i = 2; i < 2 + dateList.length; i++) {
        const cell = excelRow.getCell(i + 1);
        if (cell.value === "Present") {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB6F5B2' }
          };
          cell.font = { color: { argb: 'FF145214' } };
        } else if (cell.value === "Absent") {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8A8A8' }
          };
          cell.font = { color: { argb: 'FF8B0000' } };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
          };
          cell.font = { color: { argb: 'FF4A4A4A' } };
        }
      }
    }

    worksheet.columns = [
      { width: 30 },
      { width: 12 },
      ...dateList.map(() => ({ width: 12 })),
      { width: 10 },
      { width: 10 },
      { width: 12 }
    ];

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=class_${classId}_attendance_${month}_${year}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
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
