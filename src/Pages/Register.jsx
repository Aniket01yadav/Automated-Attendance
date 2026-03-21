import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import TeacherRegistrationForm from "../Components/TeacherRegistrationForm";

const Register = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 relative overflow-hidden">
      <Toaster position="top-right" />

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

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 bg-white/10 p-10 rounded-2xl shadow-2xl backdrop-blur-lg w-[90%] max-w-lg text-white border border-white/20 mt-5"
      >
        <TeacherRegistrationForm onSuccess={() => navigate("/login")} />
      </motion.div>
    </div>
  );
};

export default Register;
