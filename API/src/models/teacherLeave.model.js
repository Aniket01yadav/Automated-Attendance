import mongoose from "mongoose";

const teacherLeaveSchema = new mongoose.Schema(
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
    fromDate: {
      type: Date,
      required: true,
      index: true,
    },
    toDate: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    adminRemark: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

const TeacherLeave = mongoose.model("TeacherLeave", teacherLeaveSchema);

export default TeacherLeave;
