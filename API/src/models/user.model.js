import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, unique: true, required: true },
        password: { type: String, required: true },
        schoolName: { type: String, required: true },
        role: { type: String, enum: ["Principal", "Teacher"], default: "Teacher" },
        subjectName: { type: String, required: true },
        gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
        faceDescriptor: {
            type: [Number],
            default: []
        },

        status: { type: String, enum: ["Approved", "Pending"], default: "Pending" },
    },
    { timestamps: true }
);

export default mongoose.model("User", userSchema);



