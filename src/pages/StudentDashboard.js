import React, { useState } from 'react';
import { FaUserGraduate, FaIdCard, FaCalendarAlt, FaSignInAlt, FaQrcode, FaInfoCircle, FaDownload } from 'react-icons/fa';
import styles from './StudentDashboard.module.css';
import { studentLogin } from '../utils/api';
import { QRCodeCanvas } from 'qrcode.react';
import BusPassTemplate from '../components/BusPassTemplate';
import { downloadBusPass } from '../utils/downloadPass';

function StudentDashboard() {
  const [form, setForm] = useState({ regNo: '', dob: '' });
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const response = await studentLogin(form.regNo, form.dob);
    if (response.error) {
      setError(response.error);
      setStudentData(null);
    } else {
      setStudentData(response);
      setError('');
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadBusPass('bus-pass-template', `bus-pass-${studentData.regNo}`);
    } catch (error) {
      console.error('Download failed:', error);
      setError('Failed to download bus pass. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.centerContent}>
        {!studentData ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <h2 className={styles.title}><FaUserGraduate style={{ marginRight: 8, color: '#6366f1', verticalAlign: 'middle' }} />Student Login</h2>
            <div className={styles.fieldGroup}>
              <label htmlFor="regNo" className={styles.label}><FaIdCard style={{ marginRight: 6, color: '#0ea5e9' }} />Register Number</label>
              <input
                type="text"
                id="regNo"
                name="regNo"
                placeholder="Enter your register number"
                value={form.regNo}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label htmlFor="dob" className={styles.label}><FaCalendarAlt style={{ marginRight: 6, color: '#818cf8' }} />Date of Birth</label>
              <input
                type="date"
                id="dob"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.button}><FaSignInAlt style={{ marginRight: 6, verticalAlign: 'middle' }} />Login</button>
            </div>
            {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
          </form>
        ) : studentData.status === 'approved' ? (
          <div className={styles.passCardWrapper}>
            <div className={styles.headerSection}>
              <h2 className={styles.title}>Your Digital Bus Pass</h2>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={styles.downloadBtn}
              >
                <FaDownload style={{ marginRight: 6 }} />
                {isDownloading ? 'Downloading...' : 'Download JPEG'}
              </button>
            </div>
            
            {/* New Bus Pass Template */}
            {
              (() => {
                const normalized = {
                  name: studentData.name,
                  regNo: studentData.regNo,
                  photo: studentData.photo || null,
                  dob: studentData.dob,
                  branch: studentData.branch || studentData.course || 'Branch',
                  year: studentData.year || studentData.branchYear || 'Year',
                  college: studentData.college || 'Your College Name',
                  address: studentData.address || studentData.collegeAddress || 'College Address',
                  validTill: studentData.validity || studentData.validTill || 'N/A',
                };
                return <BusPassTemplate studentData={normalized} />;
              })()
            }

            {/* QR Code Section */}
            <div className={styles.qrCodeSection}>
              <div className={styles.qrCodeTitle}>Scan QR Code for Verification</div>
              <div className={styles.qrCodeContainer}>
                <QRCodeCanvas 
                  value={studentData.qrData || JSON.stringify({
                    name: studentData.name,
                    regNo: studentData.regNo,
                    route: studentData.route,
                    validity: studentData.validity,
                    passUrl: `${window.location.origin}/pass/${studentData.regNo}`
                  })} 
                  size={150}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.passCardWrapper}>
            <h2 className={styles.title}>Your Digital Bus Pass</h2>
            <div className={styles.infoMsg}>
              Your bus pass and QR code will be displayed here after admin approval.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;