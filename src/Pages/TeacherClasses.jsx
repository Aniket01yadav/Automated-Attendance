import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

const TeacherClasses = () => {
  const { id } = useParams(); // teacher _id
  const [classes, setClasses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [page, setPage] = useState(1);
  const perPage = 6;

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await axios.get(
          `https://inclass-dnhc.onrender.com/api/class/teacher-classes/${id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const cls = res.data.classes || [];
        setClasses(cls);
        setFiltered(cls);
        setTeacherName(res.data.teacherName || "Teacher");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load classes");
      }
    };

    fetchClasses();
  }, [id, navigate, token]);

  // derive filters
  const subjects = ["All", ...Array.from(new Set(classes.map((c) => c.subject)))];
  const sections = ["All", ...Array.from(new Set(classes.map((c) => c.section)))];

  // apply search + filters whenever search/filters change
  useEffect(() => {
    let result = [...classes];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.className.toLowerCase().includes(q) ||
          c.subject.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q)
      );
    }

    if (subjectFilter !== "All") {
      result = result.filter((c) => c.subject === subjectFilter);
    }

    if (sectionFilter !== "All") {
      result = result.filter((c) => c.section === sectionFilter);
    }

    setFiltered(result);
    setPage(1); // reset to first page when filters change
  }, [search, subjectFilter, sectionFilter, classes]);

  // pagination
  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const startIndex = (page - 1) * perPage;
  const currentPageItems = filtered.slice(startIndex, startIndex + perPage);

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 text-white py-10 px-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">
            Classes by {teacherName}
          </h1>
          <p className="opacity-80">
            Total Classes: {classes.length}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="bg-white text-blue-700 px-5 py-2 rounded-lg shadow-lg font-semibold"
        >
          Back
        </button>
      </div>

      {/* Search + Filters */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col gap-3">
        <motion.input
          whileFocus={{ scale: 1.01 }}
          type="text"
          placeholder="Search by class, subject or section..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 text-white outline-none shadow-sm"
        />

        <div className="flex flex-wrap gap-3 text-sm">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/90 text-black border border-gray-300 outline-none"
          >
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub === "All" ? "All Subjects" : sub}
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/90 text-black border border-gray-300 outline-none"
          >
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec === "All" ? "All Sections" : sec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Classes List */}
      {currentPageItems.length === 0 ? (
        <p className="text-center text-white/90 mt-10">
          No classes match your filter.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {currentPageItems.map((cls) => (
            <motion.div
              key={cls._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white/15 border border-white/20 rounded-xl p-4 backdrop-blur-md shadow-xl"
            >
              <p className="text-lg font-bold">
                Class {cls.className}
              </p>

              <p className="text-sm mt-1">
                <strong>Section:</strong> {cls.section}
              </p>
              <p className="text-sm mt-1">
                <strong>Subject:</strong> {cls.subject}
              </p>

              <button
                className="bg-blue-600 text-white px-3 py-2 rounded-lg mt-3 w-full"
                onClick={() => navigate("/AddStudent")}
              >
                Enter
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={goPrev}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg font-semibold ${page === 1 ? "bg-gray-400/60 cursor-not-allowed" : "bg-white text-blue-700"
              }`}
          >
            Prev
          </button>
          <span className="text-white/90">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={goNext}
            disabled={page === totalPages}
            className={`px-4 py-2 rounded-lg font-semibold ${page === totalPages
              ? "bg-gray-400/60 cursor-not-allowed"
              : "bg-white text-blue-700"
              }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default TeacherClasses;
