import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import FaceRegistrationScanner from "../Components/FaceRegistrationScanner";
import StudentAttendanceModal from "../Components/StudentAttendanceModal";



const AddStudentPage = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [activeClassId, setActiveClassId] = useState(classId || '');
  const [classes, setClasses] = useState([]);

  const [user, setUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEdit, setProfileEdit] = useState(false);
  const [changePass, setChangePass] = useState(false);
  const [openFaceScanner, setOpenFaceScanner] = useState(false);
  const [newStudentId, setNewStudentId] = useState(null);

  const [showAttendance, setShowAttendance] = useState(false);
  const [attendanceStudent, setAttendanceStudent] = useState(null);

  const [openScanner, setOpenScanner] = useState(false);
  const [scanClassId, setScanClassId] = useState(null);




  const [formData, setFormData] = useState({
    name: '',
    fatherName: '',
    dateOfBirth: '',
    address: '',
    contact: '',
    email: '',
    gender: 'Male',
    rollNo: ''
  });

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    schoolName: '',
    role: '',
    subjectName: '',
    gender: '',
  });

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });

  const userInitial = user?.fullName?.charAt(0).toUpperCase() || 'T';

  // ================= FETCH STUDENTS =================
  const fetchStudents = useCallback(async (classIdArg) => {
    const cid = classIdArg || activeClassId;
    if (!cid || !token) {
      console.log('⚠️ No classId or token available');
      return;
    }

    try {
      console.log('👥 Fetching students for class:', cid);
      const res = await axios.get(
        `https://inclass-dnhc.onrender.com/api/student/class/${cid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('📥 Students response:', res.data);

      const studentsData = res.data.students || res.data.data || res.data || [];
      console.log('👥 Students array:', studentsData);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's attendance
      let attendanceList = [];
      try {
        const attendanceRes = await axios.get(
          `https://inclass-dnhc.onrender.com/api/attendance/class/${cid}?date=${today}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        attendanceList = attendanceRes.data.attendance || attendanceRes.data || [];
      } catch (attErr) {
        console.warn('Attendance fetch failed:', attErr);
        attendanceList = [];
      }

      // Build attendance map
      const attendanceMap = new Map();
      (attendanceList || []).forEach((att) => {
        const sid = att.studentId?._id || att.studentId || att.student || att.student?._id;
        if (sid) attendanceMap.set(String(sid), att.status || att.state || att.attendanceStatus || 'Present');
      });

      const studentsWithAttendance = (studentsData || []).map((student) => {
        const sid = student._id || student.id || '';
        const status = attendanceMap.get(String(sid));
        return { ...student, todayStatus: status || 'Absent' };
      });

      setStudents(studentsWithAttendance);
      setFilteredStudents(studentsWithAttendance);
      console.log('✅ Students loaded:', studentsWithAttendance.length);
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      setStudents([]);
      setFilteredStudents([]);
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      toast.error(serverMsg || 'Failed to load students');
    }
  }, [activeClassId, token]);

  // ================= FETCH USER PROFILE =================
  useEffect(() => {
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const res = await axios.get('https://inclass-dnhc.onrender.com/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('👤 User profile:', res.data.user);
        setUser(res.data.user);
        setProfileData(res.data.user);
        setLoading(false);
      } catch (err) {
        console.error('Profile fetch error:', err);
        localStorage.removeItem('token');
        toast.error('Session expired! Please login again.');
        setLoading(false);
        navigate('/login');
      }
    };

    fetchUserProfile();
  }, [token, navigate]);

  // ================= FETCH CLASSES & CLASS DATA =================
  useEffect(() => {
    if (!token || !user) return;

    const fetchClasses = async () => {
      try {
        const res = await axios.get('https://inclass-dnhc.onrender.com/api/class/my-classes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const returned = res.data.classes || res.data || [];
        const normalized = (Array.isArray(returned) ? returned : []).filter(c => c && (c._id || c.id));
        setClasses(normalized);

        // If no classId in URL and we have classes, pick the first
        if (!activeClassId && normalized.length > 0) {
          const firstClassId = String(normalized[0]._id || normalized[0].id);
          setActiveClassId(firstClassId);
        }
      } catch (err) {
        console.warn('Failed to fetch classes:', err);
      }
    };

    // Only fetch classes if no classId from URL
    if (!activeClassId) {
      fetchClasses();
    }
  }, [token, user, activeClassId]);

  // ================= FETCH CLASS DATA & STUDENTS WHEN CLASS CHANGES =================
  useEffect(() => {
    if (!activeClassId || !token || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('📚 Fetching data for classId:', activeClassId);

        // Fetch class details
        try {
          const classRes = await axios.get(
            `https://inclass-dnhc.onrender.com/api/class/${activeClassId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('📖 Class data:', classRes.data);
          setClassData(classRes.data.class || classRes.data);
        } catch (err) {
          console.log('Class details API not found, using default');
          setClassData({
            className: 'Class',
            section: 'Section',
            subject: 'Subject'
          });
        }

        // Fetch students for THIS SPECIFIC CLASS
        await fetchStudents(activeClassId);
      } catch (err) {
        console.error('Data fetch error:', err);
        toast.error(err.response?.data?.error || 'Failed to load data!');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeClassId, token, user, fetchStudents]);

  // ================= AUTO-GENERATE ROLL NUMBER =================
  const generateRollNo = () => {
    const maxRollNo = students.length > 0
      ? Math.max(...students.map(s => {
        const n = parseInt(s.rollNo, 10);
        return Number.isNaN(n) ? 0 : n;
      }))
      : 0;
    return String(maxRollNo + 1);
  };

  // ================= FORM HANDLERS =================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      fatherName: '',
      dateOfBirth: '',
      address: '',
      contact: '',
      email: '',
      gender: 'Male',
      rollNo: generateRollNo()
    });
    setShowAddForm(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      fatherName: student.fatherName,
      dateOfBirth: student.dateOfBirth?.split('T')[0] || '',
      address: student.address,
      contact: student.contact,
      email: student.email,
      gender: student.gender || 'Male',
      rollNo: student.rollNo
    });
    setShowAddForm(true);
  };

  // ================= SUBMIT STUDENT (CREATE/UPDATE) =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields
    if (!formData.name || !formData.fatherName || !formData.dateOfBirth ||
      !formData.address || !formData.contact || !formData.email || !formData.rollNo) {
      toast.error('All fields are required!');
      return;
    }

    // CRITICAL: Validate active class selection
    if (!activeClassId) {
      toast.error('❌ No class selected! Please select a class first.');
      return;
    }

    try {
      // Prepare complete student data with EXPLICIT classId
      const studentData = {
        name: formData.name,
        fatherName: formData.fatherName,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        contact: formData.contact,
        email: formData.email,
        gender: formData.gender,
        rollNo: formData.rollNo,
        classId: String(activeClassId)
      };

      console.log('📤 Sending student data:', studentData);
      console.log('🎯 Active Class ID:', activeClassId);

      if (editingStudent) {
        // Update existing student
        const response = await axios.put(
          `https://inclass-dnhc.onrender.com/api/student/${editingStudent._id}`,
          studentData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('✅ Update response:', response.data);
        toast.success('Student updated successfully!');
      } else {
        // Create new student
        const response = await axios.post(
          'https://inclass-dnhc.onrender.com/api/student/create',
          studentData,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        toast.success("Student added! Now register face...");

        // 👉 Save new studentId and open face scanner
        const createdStudent = response.data.data || response.data.student || response.data;
        setNewStudentId(createdStudent._id);
        setOpenFaceScanner(true);
      }

      // Reset form and close modal
      setShowAddForm(false);
      setEditingStudent(null);
      setFormData({
        name: '',
        fatherName: '',
        dateOfBirth: '',
        address: '',
        contact: '',
        email: '',
        gender: 'Male',
        rollNo: ''
      });

      await fetchStudents(activeClassId);
    } catch (err) {
      console.error('Error:', err);
      console.error('Error response:', err.response?.data);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to save student!';
      toast.error(errorMsg);
    }
  };

  // ================= DELETE STUDENT =================
  const handleDeleteStudent = async (studentId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this student?');
    if (!confirmDelete) return;

    try {
      await axios.delete(
        `https://inclass-dnhc.onrender.com/api/student/${studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Student deleted successfully!');
      await fetchStudents(activeClassId);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.error || 'Failed to delete student!');
    }
  };

  // ================= TOGGLE ATTENDANCE =================
  const toggleAttendance = async (studentId) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      await axios.put(
        `https://inclass-dnhc.onrender.com/api/attendance/toggle/${studentId}`,
        { classId: activeClassId, date: today },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ always refresh from server (no local flip logic)
      await fetchStudents(activeClassId);

      toast.success("Attendance updated!");
    } catch (err) {
      console.error("Attendance toggle error:", err);
      toast.error(err.response?.data?.error || "Failed to update attendance!");
    }
  };


  // ================= SEARCH =================
  const handleSearch = (text) => {
    const query = text.toLowerCase();
    const filtered = students.filter((student) =>
      student.name.toLowerCase().includes(query) ||
      student.rollNo.toString().includes(query) ||
      student.email.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  };

  // ================= SORT FUNCTIONS =================
  const sortByRollNo = () => {
    setFilteredStudents([...filteredStudents].sort((a, b) =>
      parseInt(a.rollNo) - parseInt(b.rollNo)
    ));
  };

  const sortByName = () => {
    setFilteredStudents([...filteredStudents].sort((a, b) =>
      a.name.localeCompare(b.name)
    ));
  };

  const sortByPresent = () => {
    setFilteredStudents([...filteredStudents].sort((a, b) =>
      (b.todayStatus === 'Present' ? 1 : 0) - (a.todayStatus === 'Present' ? 1 : 0)
    ));
  };

  const sortByAbsent = () => {
    setFilteredStudents([...filteredStudents].sort((a, b) =>
      (b.todayStatus === 'Absent' ? 1 : 0) - (a.todayStatus === 'Absent' ? 1 : 0)
    ));
  };

  // ================= DOWNLOAD MONTHLY REPORT =================
  const downloadMonthlyReport = async (studentId, month, year) => {
    if (!month || !year) {
      toast.error("Please select month and year");
      return;
    }

    try {
      const response = await axios.get(
        `https://inclass-dnhc.onrender.com/api/attendance/student/${studentId}/monthly-report?month=${month}&year=${year}`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Attendance_${month}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download report");
    }
  };



  // ================= CLASS CHANGE HANDLER =================
  const handleClassChange = async (newClassId) => {
    console.log('🔄 Changing class to:', newClassId);
    setActiveClassId(newClassId);
    setStudents([]);
    setFilteredStudents([]);
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.removeItem('token');
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  // ================= UPDATE PROFILE =================
  const handleUpdateProfile = async () => {
    try {
      await axios.put(
        'https://inclass-dnhc.onrender.com/api/auth/update-profile',
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUser(profileData);
      toast.success('Profile updated!');
      setProfileEdit(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Profile update failed!';
      toast.error(msg);
    }
  };

  // ================= CHANGE PASSWORD =================
  const handlePasswordUpdate = async () => {
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





  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-800 to-cyan-200">
        <Toaster position="top-right" />
        <div className="text-center">
          <p className="text-white text-xl mb-4">Loading...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-800 to-cyan-200">
        <Toaster position="top-right" />
        <p className="text-white text-xl">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 to-cyan-200 flex flex-col items-center py-10 px-4">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="w-full flex justify-between items-center px-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-white">
            {user.schoolName}
          </h1>
        </div>

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
      </div>

      {/* HERO TEXT */}
      <div className="w-full max-w-5xl flex flex-col items-center text-center mb-6">
        <h2 className="text-3xl md:text-4xl font-semibold text-[#89ff9b] mb-3">
          Student Management
        </h2>
        <p className="text-white text-lg mb-4 max-w-2xl">
          Add, edit, and manage student attendance efficiently
        </p>
      </div>

      {/* CLASS SELECT */}
      {classes.length > 0 && (
        <div className="w-full max-w-5xl mb-4">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-white/30">
            <label className="text-white font-semibold">Select Class:</label>
            <select
              value={activeClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="">-- Choose a class --</option>
              {classes.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.className} {c.section ? `- ${c.section}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* SHOW MESSAGE IF NO CLASS SELECTED */}
      {!activeClassId && classes.length > 0 && (
        <div className="w-full max-w-5xl bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg mb-6">
          <p className="text-yellow-700 font-semibold">
            ⚠️ Please select a class to view and manage students
          </p>
        </div>
      )}

      {/* ADD STUDENT BUTTON - Only show if class is selected */}
      {activeClassId && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={openCreateModal}
          className="bg-white/90 border border-gray-300 text-lg px-8 py-3 rounded-2xl font-semibold 
                     hover:bg-gray-100 transition shadow-md mb-6"
        >
          Add Student
        </motion.button>
      )}

      {/* STATS - Only show if class is selected */}
      {activeClassId && (
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Total Students</p>
            <p className="text-2xl font-bold mt-1">{students.length}</p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Present Today</p>
            <p className="text-2xl font-bold mt-1 text-green-300">
              {students.filter(s => s.todayStatus === 'Present').length}
            </p>
          </div>
          <div className="bg-white/15 border border-white/20 rounded-2xl p-4 text-white backdrop-blur-md shadow-md">
            <p className="text-sm text-cyan-100">Absent Today</p>
            <p className="text-2xl font-bold mt-1 text-red-300">
              {students.filter(s => s.todayStatus === 'Absent' || !s.todayStatus).length}
            </p>
          </div>
        </div>
      )}

      {/* SEARCH & SORT - Only show if class is selected and has students */}
      {activeClassId && students.length > 0 && (
        <div className="w-full max-w-5xl flex flex-col gap-3 mb-6">
          <motion.input
            whileFocus={{ scale: 1.01 }}
            type="text"
            placeholder="Search by name, roll no, or email..."
            className="p-3 rounded-xl border border-gray-300 outline-none text-white shadow-sm"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 text-sm">
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={sortByRollNo}
              className="bg-blue-700 text-white px-3 py-2 rounded-lg"
            >
              Sort by Roll No
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={sortByName}
              className="bg-blue-700 text-white px-3 py-2 rounded-lg"
            >
              Sort by Name
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={sortByPresent}
              className="bg-green-600 text-white px-3 py-2 rounded-lg"
            >
              Present First
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              onClick={sortByAbsent}
              className="bg-red-600 text-white px-3 py-2 rounded-lg"
            >
              Absent First
            </motion.button>
          </div>
        </div>
      )}

      {/* STUDENTS LIST */}
      {activeClassId && filteredStudents.length > 0 ? (
        <div className="w-full max-w-5xl">
          <h3 className="text-xl font-semibold text-white mb-4">
            Students List ({filteredStudents.length})
          </h3>

          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <motion.div
                key={student._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="bg-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="mb-3 md:mb-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
                      Roll: {student.rollNo}
                    </span>
                    <p className="text-lg font-semibold">{student.name}</p>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">
                    Father: {student.fatherName}
                  </p>
                  <p className="text-sm text-gray-600">
                    Email: {student.email} | Contact: {student.contact}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleAttendance(student._id, student.todayStatus || 'Absent')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${student.todayStatus === 'Present'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                      }`}
                  >
                    {student.todayStatus === 'Present' ? 'Present' : 'Absent'}
                  </button>
                  <button
                    onClick={() => {
                      setAttendanceStudent(student);
                      setShowAttendance(true);
                    }}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Attendance
                  </button>

                  <button
                    onClick={() => setSelectedStudent(student)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(student)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student._id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : activeClassId ? (
        <div className="text-center text-white text-lg mt-10">
          No students found in this class. Add your first student!
        </div>
      ) : null}

      {/* ADD/EDIT STUDENT MODAL */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddForm(false);
                setEditingStudent(null);
              }}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center px-4 z-50"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                <button
                  className="absolute right-4 top-3 text-gray-500 font-bold text-2xl hover:text-gray-700"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStudent(null);
                  }}
                >
                  ×
                </button>
                <h3 className="text-center text-2xl font-semibold mb-6 text-gray-700">
                  {editingStudent ? 'Edit Student' : 'Add Student'}
                </h3>

                {/* Show selected class info */}
                {activeClassId && classes.length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <span className="font-semibold">Adding to Class:</span>{' '}
                      {classes.find(c => (c._id || c.id) === activeClassId)?.className || 'Unknown'}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <input
                    type="text"
                    name="rollNo"
                    value={formData.rollNo}
                    onChange={handleChange}
                    placeholder="Roll Number"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="text"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleChange}
                    placeholder="Father's Name"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Address"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Contact Number"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />

                  <button
                    type="submit"
                    className="mt-4 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    {editingStudent ? 'Update Student' : 'Add Student'}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* STUDENT DETAILS MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center px-4 z-50"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="absolute right-4 top-3 text-gray-500 font-bold text-2xl hover:text-gray-700"
                >
                  ×
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Student Details</h2>
                <div className="space-y-4">
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Roll No:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.rollNo}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Name:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.name}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Father's Name:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.fatherName}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Date of Birth:</span>
                    <span className="text-gray-600 flex-1">
                      {selectedStudent.dateOfBirth?.split('T')[0]}
                    </span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Gender:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.gender}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Address:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.address}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Contact:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.contact}</span>
                  </div>
                  <div className="flex border-b border-gray-200 pb-3">
                    <span className="font-semibold text-gray-700 w-36">Email:</span>
                    <span className="text-gray-600 flex-1">{selectedStudent.email}</span>
                  </div>
                  <div className="flex pt-2">
                    <span className="font-semibold text-gray-700 w-36">Today's Status:</span>
                    <span className={`font-bold flex-1 ${selectedStudent.todayStatus === 'Present' ? 'text-green-600' : 'text-red-600'
                      }`}>
                      {selectedStudent.todayStatus || 'Absent'}
                    </span>
                  </div>
                </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
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
                         from-blue-700 to-cyan-400 p-6 shadow-2xl text-white z-50"
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
                ×
              </button>

              <h2 className="text-2xl font-bold mb-4">Profile</h2>
              <hr className="border-white/30 mb-4" />

              {!profileEdit && !changePass && (
                <>
                  <p className="mb-2">
                    <strong>Name:</strong> {user?.fullName}
                  </p>
                  <p className="mb-2">
                    <strong>Email:</strong> {user?.email}
                  </p>
                  <p className="mb-2">
                    <strong>Role:</strong> {user?.role}
                  </p>
                  <p className="mb-2">
                    <strong>Subject:</strong> {user?.subjectName}
                  </p>
                  <p className="mb-2">
                    <strong>Gender:</strong> {user?.gender}
                  </p>
                  <p className="mb-2">
                    <strong>School:</strong> {user?.schoolName}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong>{" "}
                    {user?.role === 'Principal' ? "Principal" : user?.status}
                  </p>
                  <p className="mb-2">
                    <strong>Total Students:</strong> {students.length}
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
                    className="mt-4 bg-green-600 py-2 rounded-lg font-bold hover:bg-green-700 w-full"
                    onClick={() => navigate('/attendance')}
                  >
                    🏠 Back to Classes
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
                    className="p-2 rounded bg-white/30 border text-white placeholder-white/70"
                    placeholder="Full Name"
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
                    className="p-2 rounded bg-white/30 border text-white placeholder-white/70"
                    placeholder="Email"
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
                    className="p-2 rounded bg-white/30 border text-white placeholder-white/70"
                    placeholder="School Name"
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
                    className="p-2 rounded bg-white/30 border text-white placeholder-white/70"
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
                    className="p-2 rounded bg-white/30 border text-white placeholder-white/70"
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

      {openFaceScanner && newStudentId && (
        <FaceRegistrationScanner
          studentId={newStudentId}
          token={token}
          onClose={() => {
            setOpenFaceScanner(false);
            setNewStudentId(null);
          }}
        />
      )}

      {showAttendance && attendanceStudent && (
        <StudentAttendanceModal
          student={attendanceStudent}
          token={token}
          onDownloadReport={downloadMonthlyReport}
          onClose={() => {
            setShowAttendance(false);
            setAttendanceStudent(null);
          }}
        />
      )}


      {openScanner && scanClassId && (
        <ClassAttendanceScanner
          classId={scanClassId}
          onClose={async () => {
            setOpenScanner(false);
            setScanClassId(null);

            await fetchStudents(scanClassId);
          }}
        />
      )}


    </div>


  );
};

export default AddStudentPage;