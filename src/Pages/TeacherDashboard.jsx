import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../Components/StatusBadge";
import SummaryCard from "../Components/SummaryCard";
import TeacherAttendanceChart from "../Components/TeacherAttendanceChart";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const now = useMemo(() => new Date(), []);

  const [user, setUser] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState({
    totalPresentDays: 0,
    totalLateDays: 0,
    totalHalfDays: 0,
    totalLeaveDays: 0,
    totalWorkingHours: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState({
    "On Time": 0,
    Late: 0,
    "Half Day": 0,
    Leave: 0,
    Absent: 0,
  });

  const formatTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const fetchProfile = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data.user);
    return res.data.user;
  };

  const fetchTodayStatus = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/teacher-attendance/today", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTodayAttendance(res.data.attendance || null);
  };

  const fetchAnalytics = async (selectedMonth, selectedYear) => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/teacher-attendance/analytics", {
      params: { month: selectedMonth, year: selectedYear },
      headers: { Authorization: `Bearer ${token}` },
    });

    setSummary(res.data.summary || {});
    setStatusBreakdown(res.data.statusBreakdown || {});
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
          toast.error("Teacher dashboard is only for teachers");
          navigate("/AttendancePage");
          return;
        }
        await Promise.all([fetchTodayStatus(), fetchAnalytics(month, year)]);
      } catch (err) {
        const msg = err.response?.data?.error || "Failed to load dashboard";
        toast.error(msg);
        navigate("/login");
      }
    };

    bootstrap();
  }, [navigate, token]);

  useEffect(() => {
    if (!user || user.role !== "Teacher") return;
    fetchAnalytics(month, year).catch((err) => {
      const msg = err.response?.data?.error || "Failed to load analytics";
      toast.error(msg);
    });
  }, [month, year]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 py-8 px-4">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
              <p className="text-sm text-gray-500">
                {user?.fullName || "-"} | {user?.schoolName || "-"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate("/teacher-leave")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Apply Leave
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Today</h2>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={todayAttendance?.status || "Absent"} />
            <p className="text-sm text-gray-600">Check-In: {formatTime(todayAttendance?.checkIn)}</p>
            <p className="text-sm text-gray-600">Check-Out: {formatTime(todayAttendance?.checkOut)}</p>
            <p className="text-sm text-gray-600">Hours: {todayAttendance?.totalHours || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Monthly Summary</h2>
            <div className="flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="Present Days" value={summary.totalPresentDays || 0} valueClass="text-green-700" />
            <SummaryCard label="Late Days" value={summary.totalLateDays || 0} valueClass="text-yellow-700" />
            <SummaryCard label="Half Days" value={summary.totalHalfDays || 0} valueClass="text-orange-700" />
            <SummaryCard label="Leave Days" value={summary.totalLeaveDays || 0} valueClass="text-blue-700" />
            <SummaryCard label="Working Hours" value={summary.totalWorkingHours || 0} valueClass="text-indigo-700" />
          </div>
        </div>

        <TeacherAttendanceChart breakdown={statusBreakdown} />
      </div>
    </div>
  );
};

export default TeacherDashboard;
