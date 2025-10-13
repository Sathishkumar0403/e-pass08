import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import VerifyStudent from './pages/VerifyStudent';
import BusPassDisplay from './pages/BusPassDisplay';
import StudentApplicationForm from './pages/StudentApplicationForm';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Router>
        <Navbar />
        {/* Add top padding to account for fixed navbar */}
        <div className="pt-20">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apply" element={<StudentApplicationForm />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/verify/:regNo" element={<VerifyStudent />} />
            <Route path="/pass/:regNo" element={<BusPassDisplay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;