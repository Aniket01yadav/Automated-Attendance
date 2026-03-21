import React from "react";
import { useNavigate } from "react-router-dom";
import att from "../assets/attendance.png";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-blue-800 to-cyan-200 min-h-screen flex items-center justify-center">
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl px-6 mt-[-60px] gap-8">
        <div className="md:w-1/2 w-full mb-8 md:mb-0">
          <h1 className="text-white text-5xl md:text-5xl font-bold mb-6">
            Smart Attendance System for Rural School
          </h1>
          <p className="text-white text-xl mb-8">
            Empowering schools with automated, reliable attendance tracking.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/AttendancePage")}
              className="bg-white text-blue-700 px-5 py-4 rounded-xl shadow-lg font-semibold hover:bg-blue-50"
            >
              Student Attendance
            </button>
            <button
              onClick={() => navigate("/admin/teacher-attendance")}
              className="bg-blue-700 text-white px-5 py-4 rounded-xl shadow-lg font-semibold hover:bg-blue-800"
            >
              Teacher Attendance
            </button>
          </div>
        </div>

        <div className="md:w-1/2 w-full flex justify-center">
          <img
            src={att}
            alt="Attendance System"
            className="rounded-lg w-80 h-80 object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export default Hero;
