import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import API_BASE_URL from "../utils/apiBaseUrl";

const TeacherRegistrationForm = ({
  onSuccess,
  mode = "default",
  showLoginLink = true,
}) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    schoolName: "",
    role: "",
    subjectName: "",
    gender: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEmbedded = mode === "embedded";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      schoolName: "",
      role: "",
      subjectName: "",
      gender: "",
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      const encryptedPassword = formData.password;

      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        fullName: formData.fullName,
        email: formData.email,
        password: encryptedPassword,
        schoolName: formData.schoolName,
        role: formData.role,
        subjectName: formData.subjectName,
        gender: formData.gender,
      });

      toast.success("Registration successful!");
      resetForm();

      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = isEmbedded
    ? "p-3 rounded-lg border border-gray-300 text-gray-700 placeholder-gray-500 outline-none focus:ring-2 focus:ring-cyan-400"
    : "p-3 rounded-lg bg-white/20 text-white placeholder-gray-200 outline-none focus:ring-2 focus:ring-cyan-400";

  const selectClass = isEmbedded
    ? "p-3 rounded-lg border border-gray-300 text-gray-700 outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
    : "p-3 rounded-lg bg-white/20 text-white outline-none focus:ring-2 focus:ring-cyan-400";

  const titleClass = isEmbedded
    ? "text-2xl font-bold text-center mb-8 tracking-wide text-gray-800"
    : "text-3xl font-bold text-center mb-8 tracking-wide text-white";

  const radioTextClass = isEmbedded ? "text-gray-600" : "text-gray-200";

  const loginTextClass = isEmbedded
    ? "mt-6 text-sm text-center text-gray-600"
    : "mt-6 text-sm text-center text-gray-200";

  return (
    <>
      <h2 className={titleClass}>Teacher Registration</h2>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          required
          value={formData.fullName}
          onChange={handleChange}
          className={inputClass}
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          required
          value={formData.email}
          onChange={handleChange}
          className={inputClass}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          value={formData.password}
          onChange={handleChange}
          className={inputClass}
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`${inputClass} ${error ? "ring-red-500" : ""}`}
        />

        {error && <p className="text-red-400 text-sm text-center -mt-2">{error}</p>}

        <input
          type="text"
          name="schoolName"
          placeholder="School Name"
          required
          value={formData.schoolName}
          onChange={handleChange}
          className={inputClass}
        />

        <select
          name="role"
          required
          value={formData.role}
          onChange={handleChange}
          className={selectClass}
        >
          <option value="" className="bg-blue-400">
            Select Role
          </option>
          <option value="Principal" className="bg-blue-400">
            Principal
          </option>
          <option value="Teacher" className="bg-blue-400">
            Teacher
          </option>
        </select>

        <input
          type="text"
          name="subjectName"
          placeholder="Subject Name"
          required
          value={formData.subjectName}
          onChange={handleChange}
          className={inputClass}
        />

        <div className={`flex justify-center gap-6 mt-2 ${radioTextClass}`}>
          {["Male", "Female", "Other"].map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value={g}
                onChange={handleChange}
                checked={formData.gender === g}
                className="accent-cyan-400"
              />
              {g}
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-lg shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {showLoginLink && (
        <p className={loginTextClass}>
          Already have an account?{" "}
          <a href="/login" className="text-blue-200 underline">
            Login
          </a>
        </p>
      )}
    </>
  );
};

export default TeacherRegistrationForm;
