import mongoose from "mongoose";

const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolName: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["On Time", "Late", "Half Day", "Leave", "Absent"],
      default: "Absent",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

teacherAttendanceSchema.index(
  { teacherId: 1, schoolName: 1, date: 1 },
  { unique: true }
);

const TeacherAttendance = mongoose.model(
  "TeacherAttendance",
  teacherAttendanceSchema
);

export default TeacherAttendance;
