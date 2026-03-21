import mongoose from "mongoose";

const teacherAttendanceSettingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    checkInTime: {
      type: String,
      default: "09:00",
    },
    checkOutTime: {
      type: String,
      default: "16:00",
    },
    gracePeriod: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const TeacherAttendanceSettings = mongoose.model(
  "TeacherAttendanceSettings",
  teacherAttendanceSettingsSchema
);

export default TeacherAttendanceSettings;
