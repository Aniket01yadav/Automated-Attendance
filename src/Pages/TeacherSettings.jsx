import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";


const TeacherSettings = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    checkInTime: "09:00",
    checkOutTime: "16:00",
    gracePeriod: "0",
  });

  const token = localStorage.getItem("token");
  const requestConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await axios.get(
          "https://inclass-dnhc.onrender.com/api/auth/profile",
          requestConfig
        );

        setCurrentUser(res.data.user);
      } catch {
        toast.error("Session expired! Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchProfile();
  }, [navigate, requestConfig, token]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchSettings = async () => {
      try {
        const res = await axios.get(
          "https://inclass-dnhc.onrender.com/api/teacher-attendance/settings",
          requestConfig
        );
        const settings = res.data.settings || {};
        setFormData({
          checkInTime: settings.checkInTime || "09:00",
          checkOutTime: settings.checkOutTime || "16:00",
          gracePeriod: String(settings.gracePeriod ?? 0),
        });
      } catch (err) {
        const msg = err.response?.data?.error || "Failed to load attendance settings.";
        toast.error(msg);
      }
    };

    fetchSettings();
  }, [currentUser, requestConfig]);

  const handleInputChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    const grace = Number(formData.gracePeriod);
    if (Number.isNaN(grace) || grace < 0) {
      toast.error("Grace period must be 0 or more minutes.");
      return;
    }

    const parseMinutes = (timeText) => {
      const [hours, minutes] = String(timeText).split(":").map(Number);
      return (hours * 60) + minutes;
    };

    if (parseMinutes(formData.checkOutTime) <= parseMinutes(formData.checkInTime)) {
      toast.error("Check-out time must be later than check-in time.");
      return;
    }

    try {
      await axios.put(
        "https://inclass-dnhc.onrender.com/api/teacher-attendance/settings",
        {
          checkInTime: formData.checkInTime,
          checkOutTime: formData.checkOutTime,
          gracePeriod: grace,
        },
        requestConfig
      );
      toast.success("Teacher attendance settings saved.");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save attendance timing.";
      toast.error(msg);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 flex flex-col items-center py-10 px-4">
      <Toaster position="top-right" />

      <div className="w-full flex justify-between items-center px-4 mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white">
          {currentUser.schoolName}
        </h1>

        <button
          onClick={() => navigate("/AttendancePage")}
          className="bg-white text-blue-700 px-5 py-2 rounded-lg shadow-lg font-semibold"
        >
          Back
        </button>
      </div>

      <div className="w-full max-w-5xl flex flex-col items-center text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#89ff9b] mb-3">
          Time Settings
        </h2>
        <p className="text-white text-lg mb-4 max-w-2xl">
          Configure attendance timing and register teachers from one place.
        </p>
      </div>

      <div className="w-full max-w-5xl flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => navigate("/manage-teachers")}
          className="bg-white/90 border border-gray-300 px-5 py-2 rounded-xl font-semibold text-gray-800 hover:bg-gray-100 transition"
        >
          Teacher List
        </button>
        <button
          className="bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold"
          type="button"
        >
          Settings
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Check-In Time</p>
          <p className="text-2xl font-bold mt-1">{formData.checkInTime}</p>
        </div>
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Check-Out Time</p>
          <p className="text-2xl font-bold mt-1">{formData.checkOutTime}</p>
        </div>
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Grace Period</p>
          <p className="text-2xl font-bold mt-1">{formData.gracePeriod} min</p>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-2xl font-semibold text-gray-800 mb-2">
            Attendance Timing
          </h3>
          <p className="text-gray-600 mb-5">
            Set teacher check-in/check-out time and optional grace period.
          </p>

          <form
            onSubmit={handleSaveSettings}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Teacher Check-In Time
              </label>
              <input
                type="time"
                name="checkInTime"
                value={formData.checkInTime}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Teacher Check-Out Time
              </label>
              <input
                type="time"
                name="checkOutTime"
                value={formData.checkOutTime}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Optional Grace Period (minutes)
              </label>
              <input
                type="number"
                min="0"
                name="gracePeriod"
                value={formData.gracePeriod}
                onChange={handleInputChange}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Save Attendance Timing
              </button>
            </div>
          </form>
        </div>


      </div>
    </div>
  );
};

export default TeacherSettings;
