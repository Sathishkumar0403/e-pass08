import React, { useState, useEffect, useCallback } from 'react';
import { FaUserGraduate, FaIdCard, FaCalendarAlt, FaSignInAlt, FaInfoCircle, FaDownload, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import styles from './StudentDashboard.module.css';
import { studentLogin, uploadFeesBill, requestPassCancellation, checkCancellationStatus } from '../utils/api';
import { QRCodeCanvas } from 'qrcode.react';
import BusPassTemplate from '../components/BusPassTemplate';
import { downloadBusPass } from '../utils/downloadPass';

function StudentDashboard() {
  const [form, setForm] = useState({ regNo: '', dob: '' });
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [cancellationStatus, setCancellationStatus] = useState({
    cancellationRequested: false,
    cancellationReason: '',
    isCancelled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const checkStatus = useCallback(async () => {
    if (!studentData?.regNo) return;
    
    try {
      console.log('Checking cancellation status for:', studentData.regNo);
      const status = await checkCancellationStatus(studentData.regNo);
      console.log('Cancellation status:', status);
      setCancellationStatus({
        cancellationRequested: status.cancellationRequested,
        cancellationReason: status.cancellationReason,
        isCancelled: status.isCancelled
      });
    } catch (err) {
      console.error('Error checking cancellation status:', {
        message: err.message,
        status: err.status,
        data: err.data,
        stack: err.stack
      });
    }
  }, [studentData?.regNo]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await studentLogin(form.regNo, form.dob);
      if (response.error) {
        setError(response.error);
        setStudentData(null);
      } else {
        setStudentData(response);
        setError('');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
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

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      const response = await uploadFeesBill(studentData.regNo, selectedFile);
      alert(response.message);
    } catch (error) {
      setError(error.message || 'An error occurred during file upload.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPass = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancellation.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      console.log('Submitting cancellation request:', {
        regNo: studentData.regNo,
        reason: cancelReason
      });
      
      const response = await requestPassCancellation(studentData.regNo, cancelReason);
      console.log('Cancellation response:', response);
      
      if (response.error) {
        setError(`Error: ${response.error}`);
        return;
      }
      
      // Update UI on success
      setCancellationStatus(prev => ({
        ...prev,
        cancellationRequested: true,
        cancellationReason: cancelReason,
        isCancelled: false
      }));
      
      setShowCancelModal(false);
      setCancelReason('');
      
      // Show success message
      alert('Your cancellation request has been submitted for admin approval.');
      
      // Refresh status after a short delay
      setTimeout(checkStatus, 1000);
      
    } catch (err) {
      console.error('Cancellation error details:', {
        message: err.message,
        status: err.status,
        data: err.data,
        stack: err.stack
      });
      
      // More user-friendly error messages
      let errorMessage = 'Failed to submit cancellation request. ';
      
      if (err.status === 400) {
        errorMessage = err.data?.error || 'Invalid request. Please check your input.';
      } else if (err.status === 404) {
        errorMessage = 'Student record not found. Please contact support.';
      } else if (err.status === 500) {
        errorMessage = 'Server error. Please try again later or contact support.';
      } else if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else {
        errorMessage += err.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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
              <div className={styles.headerActions}>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading || cancellationStatus.cancelled}
                  className={`${styles.downloadBtn} ${cancellationStatus.cancelled ? styles.disabledBtn : ''}`}
                  title={cancellationStatus.cancelled ? 'Pass is cancelled' : ''}
                >
                  <FaDownload style={{ marginRight: 6 }} />
                  {isDownloading ? 'Downloading...' : 'Download JPEG'}
                </button>
                {!cancellationStatus.cancelled && !cancellationStatus.cancellationRequested && (
                  <button 
                    onClick={() => setShowCancelModal(true)}
                    className={`${styles.cancelBtn} ${styles.buttonInline}`}
                    disabled={isLoading}
                  >
                    <FaTimesCircle style={{ marginRight: 6 }} />
                    Request Cancellation
                  </button>
                )}
                {cancellationStatus.cancellationRequested && (
                  <div className={styles.statusBadge}>
                    <FaInfoCircle style={{ marginRight: 6 }} />
                    Cancellation Pending
                  </div>
                )}
                {cancellationStatus.cancelled && (
                  <div className={`${styles.statusBadge} ${styles.cancelledBadge}`}>
                    <FaTimesCircle style={{ marginRight: 6 }} />
                    Pass Cancelled
                  </div>
                )}
                <div className={styles.uploadSectionInline}>
                  <input
                    type="file"
                    id="feesBill"
                    name="feesBill"
                    onChange={handleFileChange}
                    className={styles.inputInline}
                    disabled={cancellationStatus.cancelled}
                  />
                  <button 
                    onClick={handleFileUpload} 
                    className={styles.buttonInline}
                    disabled={isLoading || cancellationStatus.cancelled}
                  >
                    {isLoading ? <FaSpinner className="fa-spin" /> : 'Upload Fees Bill'}
                  </button>
                </div>
              </div>
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
                  busNo: studentData.busNo || '-',
                  userType: studentData.userType || 'student',
                  passNo: studentData.passNo || '-',
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

        {/* The upload section has been moved inline with the header actions */}
      </div>
      
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Request Pass Cancellation</h3>
            <p>Please provide a reason for cancelling your bus pass:</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className={styles.cancelReasonInput}
              rows={4}
              placeholder="Enter your reason for cancellation..."
            />
            {error && <div className={styles.errorText}>{error}</div>}
            <div className={styles.modalActions}>
              <button 
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                  setError('');
                }}
                className={styles.secondaryButton}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleCancelPass}
                className={styles.primaryButton}
                disabled={isLoading || !cancelReason.trim()}
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="fa-spin" style={{ marginRight: '8px' }} />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;