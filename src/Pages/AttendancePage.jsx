import React, { useState, useEffect } from "react";
import AutoAttendanceScanner from "./AutoAttendanceScanner";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import ClassAttendanceScanner from "../Components/ClassAttendanceScanner";


const AttendancePage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [showForm, setShowForm] = useState(false);
  const [classList, setClassList] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [changePass, setChangePass] = useState(false);

  const [openScanner, setOpenScanner] = useState(false);
  const [scanClassId, setScanClassId] = useState(null);


  const [user, setUser] = useState(null);
  const [editingClass, setEditingClass] = useState(null);

  const [formData, setFormData] = useState({
    className: "",
    section: "",
    subject: "",
  });

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    schoolName: "",
    role: "",
    subjectName: "",
    gender: "",
  });

  const [passwords, setPasswords] = useState({
    oldPassword: "",
    newPassword: "",
  });

  // ================= FETCH PROFILE =================
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get("https://inclass-dnhc.onrender.com/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data.user);
        setProfileData(res.data.user);
        fetchClasses(res.data.user);
      })
      .catch(() => {
        localStorage.removeItem("token");
        toast.error("Session expired! Please login again.");
        navigate("/login");
      });
  }, [navigate, token]);

  // ================= FETCH CLASSES FROM DB =================
  const fetchClasses = async (userdata) => {
    try {
      const url =
        userdata.role === "Principal"
          ? "https://inclass-dnhc.onrender.com/api/class/school-classes"
          : "https://inclass-dnhc.onrender.com/api/class/my-classes";

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const classes = (res.data.classes || []).reverse();
      setClassList(classes);
      setFilteredClasses(classes);
    } catch (err) {
      console.error("Error fetching classes", err);
    }
  };

  const userInitial = user?.fullName?.charAt(0).toUpperCase() || "T";
  const isPrincipal = user?.role === "Principal";
  const isApproved = user?.status === "Approved";

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully!");
    navigate("/login");
  };

  // ================= UPDATE PROFILE =================
  const handleUpdateProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        "https://inclass-dnhc.onrender.com/api/auth/update-profile",
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser(profileData);
      toast.success("Profile updated!");
      setProfileEdit(false);
    } catch (err) {
      const msg = err.response?.data?.error || "Profile update failed!";
      toast.error(msg);
    }
  };

  // ================= CHANGE PASSWORD (with AES encryption) =================
  const handlePasswordUpdate = async () => {
    const token = localStorage.getItem("token");

    if (!passwords.oldPassword || !passwords.newPassword) {
      return toast.error("Both fields are required!");
    }

    try {
      const res = await axios.put(
        "https://inclass-dnhc.onrender.com/api/auth/change-password",
        {
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(res.data.message || "Password changed successfully!");
      setPasswords({ oldPassword: "", newPassword: "" });
      setChangePass(false);
    } catch (err) {
      const msg = err.response?.data?.error || "Password change failed!";
      toast.error(msg);
    }
  };


  // ================= CLASS FORM HANDLERS =================
  const handleChangeClass = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateClassModal = () => {
    if (!isPrincipal && !isApproved) {
      toast.error("You need principal approval to create classes!");
      return;
    }
    setEditingClass(null);
    setFormData({ className: "", section: "", subject: "" });
    setShowForm(true);
  };

  const openEditClassModal = (cls) => {
    // Principal can edit any; teacher only own classes
    const teacherId = cls.teacherId?._id || cls.teacherId;
    if (!isPrincipal && teacherId !== user?.id && teacherId !== user?._id) {
      toast.error("You can only edit your own classes!");
      return;
    }
    setEditingClass(cls);
    setFormData({
      className: cls.className,
      section: cls.section,
      subject: cls.subject,
    });
    setShowForm(true);
  };

  const handleSubmitClass = async (e) => {
    e.preventDefault();

    if (!isPrincipal && !isApproved) {
      toast.error("You need principal approval to create or edit classes!");
      setShowForm(false);
      return;
    }

    if (!formData.className || !formData.section || !formData.subject) {
      toast.error("All fields are required!");
      return;
    }

    try {
      if (editingClass) {
        await axios.put(
          `https://inclass-dnhc.onrender.com/api/class/${editingClass._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success("Class updated!");
      } else {
        await axios.post("https://inclass-dnhc.onrender.com/api/class/create", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Class added!");
      }

      setFormData({ className: "", section: "", subject: "" });
      setEditingClass(null);
      setShowForm(false);
      fetchClasses(user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save class!");
    }
  };

  // ================= DELETE CLASS =================
  const handleDeleteClass = async (cls) => {
    const teacherId = cls.teacherId?._id || cls.teacherId;
    if (!isPrincipal && teacherId !== user?.id && teacherId !== user?._id) {
      toast.error("You can only delete your own classes!");
      return;
    }

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this class?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`https://inclass-dnhc.onrender.com/api/class/${cls._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Class deleted!");
      fetchClasses(user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed!");
    }
  };

  // ================= SEARCH & SORT =================
  const handleSearch = (text) => {
    const query = text.toLowerCase();
    const filtered = classList.filter((cls) => {
      const teacherName = cls.teacherId?.fullName || "";
      return (
        cls.className.toLowerCase().includes(query) ||
        cls.section.toLowerCase().includes(query) ||
        cls.subject.toLowerCase().includes(query) ||
        teacherName.toLowerCase().includes(query)
      );
    });
    setFilteredClasses(filtered);
  };

  const sortAZ = () => {
    setFilteredClasses((prev) =>
      [...prev].sort((a, b) => a.className.localeCompare(b.className))
    );
  };

  const sortZA = () => {
    setFilteredClasses((prev) =>
      [...prev].sort((a, b) => b.className.localeCompare(a.className))
    );
  };

  const sortNewest = () => {
    setFilteredClasses((prev) =>
      [...prev].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
  };

  const sortOldest = () => {
    setFilteredClasses((prev) =>
      [...prev].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      )
    );
  };

  if (!user) {
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

      {/* HEADER: School left, Profile right */}
      <div className="w-full flex justify-between items-center px-4 mb-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white">
          {user.schoolName}
        </h1>

        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowProfileModal(true)}
          className="w-12 h-12 bg-white text-blue-700 font-bold flex items-center 
                     justify-center rounded-full cursor-pointer shadow-xl 
                     border border-blue-300"
        >
          {userInitial}
        </motion.div>
      </div>      {/* PENDING APPROVAL BANNER */}
      {!isPrincipal && !isApproved && (
        <div className="w-full max-w-5xl mb-6">
          <div className="bg-yellow-500/20 border-2 border-yellow-500 rounded-xl p-4 text-white backdrop-blur-md">
            <p className="text-center font-semibold">
              ⏳ Your account is pending approval from the Principal. You cannot
              create classes until approved.
            </p>
          </div>
        </div>
      )}

      {/* HERO TEXT */}
      <div className="w-full max-w-5xl flex flex-col items-center text-center mb-2">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#89ff9b] mb-3">
          Automated Attendance System
        </h2>
        <p className="text-white text-lg mb-4 max-w-2xl">
          Making attendance faster and smoother using AI-based face detection.
        </p>
      </div>

      {/* Create Class Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={openCreateClassModal}
        className="bg-white/90 border border-gray-300 text-lg px-8 py-3 rounded-2xl font-semibold 
                   hover:bg-gray-100 transition shadow-md mb-4"
      >
        {editingClass ? "Edit Class" : "Create Class"}
      </motion.button>

      {/* STATS */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Total Classes</p>
          <p className="text-2xl font-bold mt-1">{classList.length}</p>
        </div>
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Teacher</p>
          <p className="text-lg font-semibold mt-1">{user.fullName}</p>
        </div>
        <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
          <p className="text-sm text-cyan-100">Status</p>
          <p className="text-lg font-semibold mt-1">
            {isPrincipal ? "Principal" : isApproved ? "✅ Approved" : "⏳ Pending"}
          </p>
        </div>
      </div>

      {/* Teacher management quick actions */}
      <div className="w-full max-w-5xl flex justify-end mb-4 gap-2">
        {!isPrincipal && (
          <button
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-indigo-700"
            onClick={() => navigate("/teacher-dashboard")}
          >
            Teacher Attendance (Dashboard)
          </button>
        )}
        {isPrincipal && (
          <>
            <button
              className="bg-purple-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-purple-700"
              onClick={() => navigate("/manage-teachers")}
            >
              Teacher Management
            </button>
            <button
              className="bg-sky-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-sky-700"
              onClick={() => navigate("/admin/teacher-attendance")}
            >
              Teacher Attendance
            </button>
          </>
        )}
      </div>

      {/* SEARCH + FILTER JUST ABOVE HEADING */}
      <div className="w-full max-w-5xl flex flex-col gap-3 mb-4">
        <motion.input
          whileFocus={{ scale: 1.01 }}
          type="text"
          placeholder="Search by class, section, subject or teacher..."
          className="p-3 rounded-xl border border-gray-300 outline-none text-white shadow-sm"
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            onClick={sortAZ}
            className="bg-blue-700 text-white px-3 py-2 rounded-lg"
          >
            Sort A–Z
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            onClick={sortZA}
            className="bg-blue-700 text-white px-3 py-2 rounded-lg"
          >
            Sort Z–A
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            onClick={sortNewest}
            className="bg-blue-700 text-white px-3 py-2 rounded-lg"
          >
            Newest
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            onClick={sortOldest}
            className="bg-blue-700 text-white px-3 py-2 rounded-lg"
          >
            Oldest
          </motion.button>
        </div>
      </div>

      {/* CLASS LIST */}
      {filteredClasses.length > 0 && (
        <div className="w-full max-w-5xl mt-2">
          <h3 className="text-xl font-semibold text-white mb-4">
            {isPrincipal ? "All Classes in School" : "Your Classes"}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredClasses.map((cls) => (
              <motion.div
                key={cls._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="mb-3 md:mb-0 text-left">
                  <p className="text-sm text-gray-500">Class</p>
                  <p className="text-lg font-semibold">{cls.className}</p>

                  <p className="text-sm text-gray-500 mt-1">Section</p>
                  <p className="text-md font-medium">{cls.section}</p>

                  <p className="text-sm text-gray-500 mt-1">Subject</p>
                  <p className="text-md font-medium">{cls.subject}</p>

                  {/* 🧑‍🏫 TEACHER NAME BADGE */}
                  <div className="mt-3 inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                    🧑‍🏫 {cls.teacherId?.fullName || "Unknown Teacher"}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/AddStudent/${cls._id}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition hover:cursor-pointer"
                  >
                    Enter
                  </button>
                  <button
                    onClick={() => {
                      setScanClassId(cls._id);
                      setOpenScanner(true);
                    }}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:cursor-pointer"
                  >
                    Scanner
                  </button>

                  <button
                    onClick={() => openEditClassModal(cls)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition hover:cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition hover:cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* FACE SCANNER POPUP */}
      {scannerOpen && <AutoAttendanceScanner onClose={() => setScannerOpen(false)} />}

      {/* ========= CREATE / EDIT CLASS MODAL ========= */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForm(false);
                setEditingClass(null);
              }}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center px-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                <button
                  className="absolute right-4 top-3 text-gray-500 font-bold"
                  onClick={() => {
                    setShowForm(false);
                    setEditingClass(null);
                  }}
                >
                  X
                </button>
                <h3 className="text-center text-2xl font-semibold mb-6 text-gray-700">
                  {editingClass ? "Edit Class" : "Class Details"}
                </h3>

                <form
                  onSubmit={handleSubmitClass}
                  className="flex flex-col gap-4"
                >
                  <input
                    type="text"
                    name="className"
                    value={formData.className}
                    onChange={handleChangeClass}
                    placeholder="Class"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleChangeClass}
                    placeholder="Section"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChangeClass}
                    placeholder="Subject"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    className="mt-4 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {editingClass ? "Save Changes" : "Enter"}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= PROFILE DRAWER ================= */}
      <AnimatePresence>
        {showProfileModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProfileModal(false);
                setProfileEdit(false);
                setChangePass(false);
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 90 }}
              className="fixed right-0 top-0 h-full w-80 bg-gradient-to-br 
                         from-blue-700 to-cyan-400 p-6 shadow-2xl text-white"
            >
              {/* Close X */}
              <button
                className="text-xl font-bold absolute right-4 top-3"
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileEdit(false);
                  setChangePass(false);
                }}
              >
                X
              </button>

              <h2 className="text-2xl font-bold mb-4">Profile</h2>
              <hr className="border-white/30 mb-4" />

              {!profileEdit && !changePass && (
                <>
                  <p>
                    <strong>Name:</strong> {user.fullName}
                  </p>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p>
                    <strong>Role:</strong> {user.role}
                  </p>
                  <p>
                    <strong>Subject:</strong> {user.subjectName}
                  </p>
                  <p>
                    <strong>Gender:</strong> {user.gender}
                  </p>
                  <p>
                    <strong>School:</strong> {user.schoolName}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {isPrincipal ? "Principal" : user.status}
                  </p>
                  <p>
                    <strong>Total Classes:</strong> {classList.length}
                  </p>

                  <button
                    className="mt-5 bg-yellow-300 text-blue-900 py-2 rounded-lg font-bold hover:bg-yellow-400 w-full"
                    onClick={() => setProfileEdit(true)}
                  >
                    ✏️ Edit Profile
                  </button>

                  <button
                    className="mt-4 bg-blue-500 py-2 rounded-lg font-bold hover:bg-blue-600 w-full"
                    onClick={() => setChangePass(true)}
                  >
                    🔐 Change Password
                  </button>

                  <button
                    className="mt-4 bg-red-500 py-2 rounded-lg font-bold hover:bg-red-600 w-full"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </>
              )}

              {profileEdit && (
                <div className="flex flex-col gap-3 mt-2">
                  <input
                    className="p-2 rounded bg-white/30 border text-white"
                    name="fullName"
                    value={profileData.fullName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        fullName: e.target.value,
                      })
                    }
                  />
                  <input
                    className="p-2 rounded bg-white/30 border text-white"
                    name="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        email: e.target.value,
                      })
                    }
                  />
                  <input
                    className="p-2 rounded bg-white/30 border text-white"
                    name="schoolName"
                    value={profileData.schoolName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        schoolName: e.target.value,
                      })
                    }
                  />
                  <button
                    className="bg-green-500 py-2 rounded font-bold"
                    onClick={handleUpdateProfile}
                  >
                    💾 Save
                  </button>
                  <button
                    className="bg-gray-400 py-2 rounded font-bold"
                    onClick={() => setProfileEdit(false)}
                  >
                    🔙 Cancel
                  </button>
                </div>
              )}

              {changePass && (
                <div className="flex flex-col gap-3 mt-2">
                  <input
                    type="password"
                    placeholder="Old Password"
                    className="p-2 rounded bg-white/30 border text-white"
                    value={passwords.oldPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        oldPassword: e.target.value,
                      })
                    }
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="p-2 rounded bg-white/30 border text-white"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    className="bg-green-500 py-2 rounded font-bold"
                    onClick={handlePasswordUpdate}
                  >
                    ✔ Change
                  </button>
                  <button
                    className="bg-gray-400 py-2 rounded font-bold"
                    onClick={() => setChangePass(false)}
                  >
                    🔙 Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {openScanner && scanClassId && (
        <ClassAttendanceScanner
          classId={scanClassId}
          token={token}
          onClose={() => {
            setOpenScanner(false);
            setScanClassId(null);
          }}
        />
      )}

    </div>
  );
};

export default AttendancePage;
