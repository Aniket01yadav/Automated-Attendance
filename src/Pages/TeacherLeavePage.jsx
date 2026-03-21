import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../Components/StatusBadge";

const TeacherLeavePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [formData, setFormData] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const fetchProfile = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data.user);
    return res.data.user;
  };

  const fetchLeaves = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/teacher-leave/my", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setLeaves(res.data.leaves || []);
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const bootstrap = async () => {
      try {
        const profile = await fetchProfile();
        if (profile.role !== "Teacher") {
          toast.error("Only teachers can apply for leave");
          navigate("/AttendancePage");
          return;
        }
        await fetchLeaves();
      } catch (err) {
        const msg = err.response?.data?.error || "Failed to load leave page";
        toast.error(msg);
        navigate("/login");
      }
    };

    bootstrap();
  }, [navigate, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      toast.error("Please fill all leave fields");
      return;
    }

    setLoading(true);
    try {
      await axios.post("https://inclass-dnhc.onrender.com/api/teacher-leave/apply", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Leave request submitted");
      setFormData({
        fromDate: "",
        toDate: "",
        reason: "",
      });
      await fetchLeaves();
    } catch (err) {
      const msg = err.response?.data?.error || "Leave request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 py-8 px-4">
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Leave Application</h1>
              <p className="text-sm text-gray-500">{user?.fullName || "-"}</p>
            </div>
            <button
              onClick={() => navigate("/teacher/dashboard")}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Apply for Leave</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="date"
              value={formData.fromDate}
              onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
            <input
              type="date"
              value={formData.toDate}
              onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2"
              required
            />
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Reason"
              rows={3}
              className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="md:col-span-2 bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Leave History</h2>
          <div className="space-y-3">
            {leaves.map((leave) => (
              <div key={leave._id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-600">
                    {new Date(leave.fromDate).toLocaleDateString()} -{" "}
                    {new Date(leave.toDate).toLocaleDateString()}
                  </p>
                  <StatusBadge status={leave.status} />
                </div>
                <p className="text-sm text-gray-700 mt-2">{leave.reason}</p>
                {leave.adminRemark && (
                  <p className="text-xs text-gray-500 mt-1">Remark: {leave.adminRemark}</p>
                )}
              </div>
            ))}
            {leaves.length === 0 && (
              <p className="text-sm text-gray-500">No leave requests yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLeavePage;
