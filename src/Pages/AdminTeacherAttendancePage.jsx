import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import TeacherAttendanceScannerPanel from "../Components/TeacherAttendanceScannerPanel";
import TeacherFaceCaptureModal from "../Components/TeacherFaceCaptureModal";
import StatusBadge from "../Components/StatusBadge";

const formatTime = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateInput = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AdminTeacherAttendancePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const today = useMemo(() => new Date(), []);

  const [user, setUser] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [summary, setSummary] = useState({
    totalTeachers: 0,
    onTime: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
    absent: 0,
  });
  const [selectedDate, setSelectedDate] = useState(formatDateInput(today));
  const [faceTeacher, setFaceTeacher] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);

  const [reportTeacherId, setReportTeacherId] = useState("");
  const [reportMonth, setReportMonth] = useState(today.getMonth() + 1);
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [downloading, setDownloading] = useState(false);
  const [reviewingId, setReviewingId] = useState("");

  const isAdmin = user?.role === "Principal" || user?.role === "Admin";
  const userInitial = user?.fullName?.charAt(0).toUpperCase() || "A";

  const scannerTeachers = teachers.filter(
    (t) =>
      t.status === "Approved" &&
      Array.isArray(t.faceDescriptor) &&
      t.faceDescriptor.length > 0
  );

  const fetchProfile = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUser(res.data.user);
  };

  const fetchTeachers = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/auth/get-all-teachers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = res.data.teachers || [];
    setTeachers(list);
    if (!reportTeacherId && list.length > 0) {
      setReportTeacherId(list[0]._id);
    }
  };

  const fetchDailyAttendance = async (dateValue) => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/teacher-attendance/daily", {
      params: { date: dateValue },
      headers: { Authorization: `Bearer ${token}` },
    });
    setAttendanceRows(res.data.attendance || []);
    setSummary(res.data.summary || {});
  };

  const fetchPendingLeaves = async () => {
    const res = await axios.get("https://inclass-dnhc.onrender.com/api/teacher-leave/all", {
      params: { status: "Pending" },
      headers: { Authorization: `Bearer ${token}` },
    });
    setPendingLeaves(res.data.leaves || []);
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const bootstrap = async () => {
      try {
        await fetchProfile();
      } catch {
        toast.error("Please login again");
        navigate("/login");
      }
    };

    bootstrap();
  }, [navigate, token]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "Principal" && user.role !== "Admin") {
      toast.error("Only principal/admin can access teacher scanner");
      navigate("/AttendancePage");
      return;
    }

    const loadAll = async () => {
      try {
        await Promise.all([
          fetchTeachers(),
          fetchDailyAttendance(selectedDate),
          fetchPendingLeaves(),
        ]);
      } catch (err) {
        const msg = err.response?.data?.error || "Failed to load teacher attendance";
        toast.error(msg);
      }
    };

    loadAll();
  }, [user]);

  const handleDateChange = async (nextDate) => {
    setSelectedDate(nextDate);
    try {
      await fetchDailyAttendance(nextDate);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to fetch daily attendance";
      toast.error(msg);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportTeacherId || !reportMonth || !reportYear) {
      toast.error("Please choose teacher and month/year");
      return;
    }

    setDownloading(true);
    try {
      const response = await axios.get(
        `https://inclass-dnhc.onrender.com/api/teacher-attendance/report/${reportTeacherId}`,
        {
          params: { month: reportMonth, year: reportYear },
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Teacher_Attendance_${reportMonth}_${reportYear}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const msg = err.response?.data?.error || "Report download failed";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  const reviewLeave = async (leaveId, status) => {
    try {
      setReviewingId(`${leaveId}-${status}`);
      await axios.put(
        `https://inclass-dnhc.onrender.com/api/teacher-leave/${leaveId}/review`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Leave ${status.toLowerCase()}`);
      await Promise.all([fetchPendingLeaves(), fetchDailyAttendance(selectedDate)]);
    } catch (err) {
      const msg = err.response?.data?.error || "Leave review failed";
      toast.error(msg);
    } finally {
      setReviewingId("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 flex flex-col items-center py-10 px-4">
      <Toaster position="top-right" />

      <div className="w-full flex justify-between items-center px-4 mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white">
          {user?.schoolName || "School"}
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/AttendancePage")}
            className="bg-white text-blue-700 px-5 py-2 rounded-lg shadow-lg font-semibold"
          >
            Back
          </button>
          <div
            className="w-12 h-12 bg-white text-blue-700 font-bold flex items-center justify-center rounded-full shadow-xl border border-blue-300"
            title={user?.fullName || "Admin"}
          >
            {userInitial}
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl flex flex-col items-center text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#89ff9b] mb-3">
          Teacher Attendance
        </h2>
        <p className="text-white text-lg mb-4 max-w-2xl">
          Scan attendance, monitor daily status, review leaves, and export reports.
        </p>
      </div>

      <div className="w-full max-w-5xl flex flex-wrap gap-3 mb-4">
        <button
          type="button"
          className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold"
        >
          Teacher Attendance
        </button>
        <button
          onClick={() => navigate("/manage-teachers")}
          className="bg-white/90 border border-gray-300 px-5 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-100 transition"
        >
          Teacher List
        </button>
        <button
          onClick={() => navigate("/admin/teacher-settings")}
          className="bg-white/90 border border-gray-300 px-5 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-100 transition"
        >
          Set Timing
        </button>
      </div>

      {isAdmin && (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Teachers</p>
            <p className="text-2xl font-bold mt-1">{summary.totalTeachers || 0}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">On Time</p>
            <p className="text-2xl font-bold mt-1 text-green-300">{summary.onTime || 0}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Late</p>
            <p className="text-2xl font-bold mt-1 text-yellow-200">{summary.late || 0}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Half Day</p>
            <p className="text-2xl font-bold mt-1 text-orange-200">{summary.halfDay || 0}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Leave</p>
            <p className="text-2xl font-bold mt-1 text-blue-200">{summary.leave || 0}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Absent</p>
            <p className="text-2xl font-bold mt-1 text-red-300">{summary.absent || 0}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 shadow-md">
          <TeacherAttendanceScannerPanel
            token={token}
            teachers={scannerTeachers}
            onAttendanceMarked={() => fetchDailyAttendance(selectedDate)}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Teacher Face Profiles</h3>
          <p className="text-sm text-gray-500 mb-3">
            Register or update teacher face embeddings.
          </p>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {teachers.map((teacher) => (
              <motion.div
                key={teacher._id}
                whileHover={{ scale: 1.01 }}
                className="border border-gray-200 rounded-xl p-3"
              >
                <p className="font-semibold text-gray-800">{teacher.fullName}</p>
                <p className="text-xs text-gray-500">{teacher.email}</p>
                <button
                  onClick={() => setFaceTeacher(teacher)}
                  className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold"
                >
                  Register Face
                </button>
              </motion.div>
            ))}
            {teachers.length === 0 && (
              <p className="text-sm text-gray-500">No approved teachers with face data yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-white rounded-2xl p-4 shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Daily Teacher Attendance</h3>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left px-3 py-2">Teacher</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Check-In</th>
                <th className="text-left px-3 py-2">Check-Out</th>
                <th className="text-left px-3 py-2">Hours</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row) => (
                <tr key={row.teacher?._id || row.attendanceId} className="border-t">
                  <td className="px-3 py-2 text-gray-700">{row.teacher?.fullName || "Unknown"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 text-gray-700">{formatTime(row.checkIn)}</td>
                  <td className="px-3 py-2 text-gray-700">{formatTime(row.checkOut)}</td>
                  <td className="px-3 py-2 text-gray-700">{row.totalHours || 0}</td>
                </tr>
              ))}
              {attendanceRows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={5}>
                    No attendance records found for selected date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Leave Approval Queue</h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {pendingLeaves.map((leave) => (
              <motion.div
                key={leave._id}
                whileHover={{ scale: 1.01 }}
                className="border border-gray-200 rounded-xl p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {leave.teacherId?.fullName || "Teacher"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(leave.fromDate).toLocaleDateString()} -{" "}
                      {new Date(leave.toDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{leave.reason}</p>
                  </div>
                  <StatusBadge status={leave.status} />
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => reviewLeave(leave._id, "Approved")}
                    disabled={reviewingId === `${leave._id}-Approved`}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-60 font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewLeave(leave._id, "Rejected")}
                    disabled={reviewingId === `${leave._id}-Rejected`}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-60 font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </motion.div>
            ))}
            {pendingLeaves.length === 0 && (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">Download Monthly PDF</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={reportTeacherId}
              onChange={(e) => setReportTeacherId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.fullName}
                </option>
              ))}
            </select>

            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>

            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {[2024, 2025, 2026, 2027, 2028].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60"
          >
            {downloading ? "Downloading..." : "Download Report"}
          </button>
        </div>
      </div>

      {faceTeacher && (
        <TeacherFaceCaptureModal
          teacher={faceTeacher}
          token={token}
          onClose={() => setFaceTeacher(null)}
          onSuccess={fetchTeachers}
        />
      )}
    </div>
  );
};

export default AdminTeacherAttendancePage;
