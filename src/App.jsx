import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React from 'react';
import Navbar from './Components/Navbar'
import Hero from './Pages/Hero'
import About from './Pages/About'
import Contect from './Pages/Contect'
import Register from './Pages/Register'
import Login from './Pages/Login'
import AttendancePage from './Pages/AttendancePage'
import AddStudentPage from './Pages/AddStudent'
import AutoAttendanceScanner from './Pages/AutoAttendanceScanner'
import ManageTeachers from './Pages/manageTeachers'
import TeacherClasses from './Pages/TeacherClasses'
import TeacherSettings from './Pages/TeacherSettings'
import AdminTeacherAttendancePage from './Pages/AdminTeacherAttendancePage'
import TeacherDashboard from './Pages/TeacherDashboard'
import TeacherLeavePage from './Pages/TeacherLeavePage'

function App() {

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Hero />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contect />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/AutoAttendanceScanner" element={<AutoAttendanceScanner />} />
        <Route path="/AttendancePage" element={<AttendancePage />} />
        <Route path="/manage-teachers" element={<ManageTeachers />} />
        <Route path="/admin/teacher-settings" element={<TeacherSettings />} />
        <Route path="/admin/teacher-attendance" element={<AdminTeacherAttendancePage />} />
        <Route path="/AddStudent" element={<AddStudentPage />} />
        <Route path="/AddStudent/:classId" element={<AddStudentPage />} />
        <Route path="/teacher-classes/:id" element={<TeacherClasses />} />
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher-leave" element={<TeacherLeavePage />} />
      </Routes>
    </Router>
  )
}

export default App
