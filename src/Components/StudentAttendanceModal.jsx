import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentAttendanceModal = ({
  student,
  onClose,
  onDownloadReport,
}) => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  const token = localStorage.getItem("token");

  // 🗓 Default current month/year
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  // ================= FETCH MONTHLY DATA =================
  const fetchMonthlyAttendance = async () => {
    if (!student) return;

    setLoading(true);

    try {
      const res = await axios.get(
        `https://inclass-dnhc.onrender.com/api/attendance/student/${student._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Filter monthly in frontend (safe because backend already secured by schoolId)
      const filtered = (res.data.attendance || []).filter((r) => {
        const d = new Date(r.date);
        return (
          d.getMonth() + 1 === Number(month) &&
          d.getFullYear() === Number(year)
        );
      });

      setRecords(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyAttendance();
  }, [student, month, year]);

  const totalPresent = records.filter(
    (r) => r.status === "Present"
  ).length;

  const totalAbsent = records.length - totalPresent;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6">

        <h2 className="text-lg font-bold mb-3">
          Attendance – {student.name}
        </h2>

        {/* MONTH + YEAR SELECTOR */}
        <div className="flex gap-3 mb-4">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="border px-3 py-2 rounded-md"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              onDownloadReport(student._id, month, year)
            }
            className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Download PDF
          </button>
        </div>

        {/* SUMMARY */}
        <p className="text-sm mb-3">
          Present: <b className="text-green-600">{totalPresent}</b> | Absent:{" "}
          <b className="text-red-600">{totalAbsent}</b>
        </p>

        <div className="border rounded-md max-h-72 overflow-y-auto">

          <div className="grid grid-cols-2 font-semibold bg-gray-100 px-3 py-2">
            <span>Date</span>
            <span>Status</span>
          </div>

          {loading && (
            <div className="p-3 text-center">Loading...</div>
          )}

          {!loading && records.length === 0 && (
            <div className="p-3 text-center text-gray-500">
              No attendance found for selected month
            </div>
          )}

          {records.map((row) => (
            <div
              key={row._id}
              className="grid grid-cols-2 px-3 py-2 border-t text-sm"
            >
              <span>
                {new Date(row.date).toLocaleDateString()}
              </span>

              <span
                className={
                  row.status === "Present"
                    ? "text-green-600 font-semibold"
                    : "text-red-600 font-semibold"
                }
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-700 text-white py-2 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StudentAttendanceModal;
