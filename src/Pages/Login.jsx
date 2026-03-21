import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import API_BASE_URL from "../utils/apiBaseUrl";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); // ✅ Clear previous errors
    setLoading(true); // ✅ Set loading to true

    const encryptedPassword = password;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password: encryptedPassword,
      });

      localStorage.setItem("token", res.data.token);
      toast.success("Login successful!");
      navigate("/AttendancePage");
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Login failed!";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Background Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 6 }}
        className="absolute w-64 h-64 bg-white/20 rounded-full top-10 left-10 blur-3xl"
      />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 5 }}
        className="absolute w-72 h-72 bg-cyan-300/20 rounded-full bottom-10 right-10 blur-3xl"
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 bg-white/10 p-10 rounded-2xl shadow-2xl backdrop-blur-lg w-[90%] max-w-md text-center border border-white/20 mt-[-50px]"
      >
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-3xl font-bold text-white mb-6 tracking-wide"
        >
          Welcome
        </motion.h1>

        {/* Login Form */}
        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="flex flex-col gap-4"
        >
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg bg-white/20 text-white placeholder-gray-100 outline-none focus:ring-2 focus:ring-cyan-400 transition"
          />

          <input
            type="password"
            placeholder="Enter your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg bg-white/20 text-white placeholder-gray-100 outline-none focus:ring-2 focus:ring-cyan-400 transition"
          />

          {error && (
            <p className="text-red-400 text-sm -mt-2">{error}</p>
          )}

          <motion.button
            type="submit"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            disabled={loading}
            className="mt-2 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </motion.button>
        </motion.form>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-gray-100 text-sm"
        >
          Don&apos;t have an account?{" "}
          <a
            href="/register"
            className="text-blue-800 cursor-pointer hover:underline"
          >
            Register
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
