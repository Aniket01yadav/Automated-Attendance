import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  const isPrincipal = currentUser?.role === "Principal";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, teachersRes] = await Promise.all([
          axios.get("https://inclass-dnhc.onrender.com/api/auth/profile", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://inclass-dnhc.onrender.com/api/auth/get-all-teachers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setCurrentUser(profileRes.data.user);
        setTeachers(teachersRes.data.teachers || []);
      } catch (err) {
        toast.error("Failed to load data");
        navigate("/login");
      }
    };

    fetchData();
  }, [navigate]);

  const updateStatus = async (id, status) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `https://inclass-dnhc.onrender.com/api/auth/update-teacher-status/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(`Teacher ${status}`);
      setTeachers((prev) =>
        prev.map((t) => (t._id === id ? { ...t, status } : t))
      );
    } catch {
      toast.error("Action failed");
    }
  };

  const removeTeacher = async (id) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `https://inclass-dnhc.onrender.com/api/auth/remove-teacher/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Teacher removed");
      setTeachers((prev) => prev.filter((t) => t._id !== id));
    } catch {
      toast.error("Remove failed");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-800 to-cyan-200">
        <Toaster position="top-right" />
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 text-white py-10 px-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Teachers - {currentUser.schoolName}</h1>
          <p className="text-lg opacity-80">
            {isPrincipal ? "Principal Dashboard" : "Teacher View"}
          </p>
        </div>
        <button
          onClick={() => navigate("/AttendancePage")}
          className="bg-white text-blue-700 px-5 py-2 rounded-lg shadow-lg font-semibold"
        >
          Back
        </button>
      </div>

      {teachers.length === 0 && (
        <p className="mt-10 text-center text-white/80">
          No teachers found for this school.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <motion.div
            key={teacher._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/15 border border-white/20 rounded-xl p-4 backdrop-blur-md shadow-xl"
          >
            <h2 className="text-xl font-bold mb-1">{teacher.fullName}</h2>
            <p className="text-sm">
              <strong>Email:</strong> {teacher.email}
            </p>
            <p className="text-sm mt-1">
              <strong>Subject:</strong> {teacher.subjectName || "-"}
            </p>
            <p className="text-sm mt-1">
              <strong>Gender:</strong> {teacher.gender || "-"}
            </p>
            <p className="text-sm mt-1 flex items-center">
              <strong>Status:</strong>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${teacher.status === "Approved"
                  ? "bg-green-500"
                  : "bg-yellow-400 text-black"
                  }`}
              >
                {teacher.status}
              </span>
            </p>

            {/* Actions only for Principal */}
            {isPrincipal && (
              <div className="mt-4 flex gap-2 flex-wrap">
                {teacher.status !== "Approved" && (
                  <button
                    className="bg-green-500 px-3 py-1 rounded-lg text-sm"
                    onClick={() => updateStatus(teacher._id, "Approved")}
                  >
                    Approve
                  </button>
                )}

                <button
                  className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-sm"
                  onClick={() => updateStatus(teacher._id, "Pending")}
                >
                  Block
                </button>

                <button
                  className="bg-red-500 px-3 py-1 rounded-lg text-sm"
                  onClick={() => removeTeacher(teacher._id)}
                >
                  Remove
                </button>
              </div>
            )}

            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg mt-3 w-full"
              onClick={() => navigate(`/teacher-classes/${teacher._id}`)}
            >
              View Classes
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ManageTeachers;