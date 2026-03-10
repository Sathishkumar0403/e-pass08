import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import OfficialLogin from './pages/OfficialLogin';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import VerifyStudent from './pages/VerifyStudent';
import BusPassDisplay from './pages/BusPassDisplay';
import VerifyPass from './pages/VerifyPass';
import Navbar from './components/Navbar';
import CancellationDashboard from './pages/CancellationDashboard';
import StudentApplicationForm from './pages/StudentApplicationForm';


function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/apply" element={<StudentApplicationForm />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/admin" element={<OfficialLogin />} />
            <Route path="/admin/login" element={<OfficialLogin />} />
            <Route path="/hod" element={<OfficialLogin />} />
            <Route path="/principal" element={<OfficialLogin />} />
            <Route path="/cancellation/dashboard" element={<CancellationDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            <Route path="/verify/:regNo" element={<VerifyStudent />} />
            <Route path="/verify-pass/:regNo" element={<VerifyPass />} />
            <Route path="/pass/:regNo" element={<BusPassDisplay />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;