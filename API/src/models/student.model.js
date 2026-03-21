import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    rollNo: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },

    email: {
      type: String,
      lowercase: true,
    },

    contact: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      required: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },


    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },

    // ===== FACE DATA =====
    faceDescriptor: {
      type: [Number], // 128-length float array
      default: [],
    },

  },
  {
    timestamps: true,
  }
);

// Prevent duplicate roll number IN SAME CLASS
studentSchema.index({ classId: 1, rollNo: 1 }, { unique: true });

const Student = mongoose.model("Student", studentSchema);

export default Student;
