import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './VerifyStudent.css';

function VerifyStudent() {
  const { regNo } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch(`/api/student/details/${regNo}`);
        if (!res.ok) throw new Error('Student not found');
        const data = await res.json();
        setStudent(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [regNo]);

  if (loading) return <div className="verify-container">Loading...</div>;
  if (error) return <div className="verify-container error">{error}</div>;

  return (
    <div className="verify-container">
      <div className="verify-card">
        <h2>Bus Pass Verification</h2>
        <div className="verify-photo-section">
          <img
            src={student.photo ? `/api/student/uploads/${student.photo}` : '/default-user.png'}
            alt="Applicant"
            className="verify-photo"
          />
        </div>
        <div className="verify-details">
          <p><strong>Name:</strong> {student.name}</p>
          <p><strong>Reg No:</strong> {student.regNo}</p>
          <p><strong>Route:</strong> {student.route}</p>
          <p><strong>Valid Till:</strong> {student.validTill}</p>
        </div>
        <div className="verify-status success">✔ Verified</div>
      </div>
    </div>
  );
}

export default VerifyStudent;
