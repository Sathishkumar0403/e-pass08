import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationAlert from '../components/NotificationAlert';
import {
  FaInfoCircle, FaDownload, FaTimes, FaTimesCircle, FaSpinner,
  FaCreditCard, FaCheckCircle, FaUpload, FaKey, FaUser,
  FaSignInAlt, FaArrowLeft, FaShieldAlt, FaExternalLinkAlt, FaCalendarAlt
} from 'react-icons/fa';
import styles from './StudentDashboard.module.css';
import {
  studentLogin, uploadFeesBill, requestPassCancellation,
  checkCancellationStatus, createPaymentOrder, verifyPayment,
  getPaymentStatus, getRouteFee, getSystemSettings, getStudentStatus
} from '../utils/api';
import BusPassTemplate from '../components/BusPassTemplate';
import { downloadBusPass } from '../utils/downloadPass';

// Dynamically loads the Razorpay checkout script once
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

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
  const [paymentStatus, setPaymentStatus] = useState({
    payment_status: 'pending',
    payment_id: null,
    payment_amount: null,
    payment_date: null
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [routeFee, setRouteFee] = useState(null);
  const [showActionSidebar, setShowActionSidebar] = useState(false);
  const [systemSettings, setSystemSettings] = useState({});
  const [showTandC, setShowTandC] = useState(false);

  // Fetch system settings immediately on mount (before login)
  useEffect(() => {
    getSystemSettings()
      .then(s => setSystemSettings(s || {}))
      .catch(() => {});
  }, []);

  const checkStatus = useCallback(async () => {
    if (!studentData?.regNo) return;

    try {
      // 1. Refresh full student object from database
      const updatedStudent = await getStudentStatus(studentData.regNo);
      let currentStudent = studentData;
      if (updatedStudent && !updatedStudent.error) {
        currentStudent = updatedStudent.student || updatedStudent;
        setStudentData(currentStudent);
      }

      // 2. Refresh cancellation status
      const status = await checkCancellationStatus(currentStudent.regNo || studentData.regNo);
      setCancellationStatus({
        cancellationRequested: status.cancellationRequested,
        cancellationReason: status.cancellationReason,
        isCancelled: status.isCancelled
      });

      try {
        const paymentData = await getPaymentStatus(currentStudent.regNo || studentData.regNo);
        setPaymentStatus(paymentData);
      } catch (err) {
        setPaymentStatus({
          payment_status: 'pending',
          payment_id: null,
          payment_amount: null,
          payment_date: null
        });
      }

      if (currentStudent.route) {
        try {
          const fee = await getRouteFee(currentStudent.route);
          if (fee && fee.fee_amount > 0) {
            setRouteFee(fee);
          } else if (currentStudent.fee_amount) {
            setRouteFee({ fee_amount: currentStudent.fee_amount });
          } else {
            setRouteFee(null);
          }
        } catch (err) {
          setRouteFee(null);
        }
      }

      // Refresh system settings on every status check
      try {
        const settings = await getSystemSettings();
        setSystemSettings(settings || {});
      } catch (err) { }
    } catch (err) { }
  }, [studentData?.regNo, studentData?.route]);

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
        const student = response.student || response;
        setStudentData(student);
        setError('');
      }
    } catch (err) {
      setError('Failed to login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadBusPass('bus-pass-template', `bus-pass-${studentData.regNo}`);
    } catch (error) {
      setError('Failed to download bus pass.');
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
      setError(error.message || 'File upload failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!studentData?.regNo) return;
    try {
      setIsProcessingPayment(true);
      setError('');

      // Load Razorpay SDK if not already loaded
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        setError('Failed to load payment gateway. Please check your internet connection.');
        setIsProcessingPayment(false);
        return;
      }

      const amount = studentData.fee_amount || routeFee?.fee_amount || paymentStatus.payment_amount || null;
      if (!amount) {
        setError('Fee not configured for your route. Please contact admin.');
        setIsProcessingPayment(false);
        return;
      }

      const orderData = await createPaymentOrder(studentData.regNo, amount);

      if (!orderData.orderId || !orderData.keyId) {
        setError('Payment order creation failed. Please try again.');
        setIsProcessingPayment(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        // amount must be in paise; backend returns rupees, so multiply by 100
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'E-Bus Pass',
        description: `Bus Pass Fee - ${studentData.regNo}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            await verifyPayment(studentData.regNo, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: studentData.fee_amount || routeFee?.fee_amount || amount
            });
            const updatedStatus = await getPaymentStatus(studentData.regNo);
            setPaymentStatus(updatedStatus);
            setShowPaymentModal(false);
            alert('Payment successful! Your pass is now active.');
          } catch (err) {
            setError('Payment verification failed. Please contact admin with your payment ID.');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: studentData.name || '',
          contact: studentData.mobile || ''
        },
        theme: { color: '#7c3aed' },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(`Payment failed: ${response.error.description}`);
        setIsProcessingPayment(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment initiation failed. Please try again.');
      setIsProcessingPayment(false);
    }
  };

  const handleCancelPass = async () => {
    // Stage 1: Show T&C if not yet shown
    if (!showTandC && !showCancelModal) {
      setShowTandC(true);
      return;
    }

    if (!cancelReason.trim()) return;
    try {
      setIsLoading(true);
      const response = await requestPassCancellation(studentData.regNo, cancelReason);
      if (response.error) {
        setError(response.error);
        return;
      }
      setCancellationStatus(prev => ({ ...prev, cancellationRequested: true }));
      setShowCancelModal(false);
      setCancelReason('');
      alert('Cancellation request submitted.');
      setTimeout(checkStatus, 1000);
    } catch (err) {
      setError('Cancellation request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStudentData(null);
    setForm({ regNo: '', dob: '' });
  };

  return (
    <div className={`${styles.pageWrapper} ${!studentData ? styles.loginWrapper : ''}`}>
      <NotificationAlert role="student" />
      <div className={styles.bgGlow}></div>

      <AnimatePresence mode="wait">
        {!studentData ? (
          <motion.div
            key="login"
            className={styles.centerContent}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.loginCard}>
              <div className={styles.titleArea}>
                <div className={styles.iconWrapper}>
                  <FaKey className={styles.loginIcon} />
                </div>
                <h1 className={styles.title}>Student Portal</h1>
                <p className={styles.subtitle}>Enter your details to view your bus pass</p>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={styles.errorBanner}>
                    <FaInfoCircle /> {error}
                  </motion.div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.label}>Registration Number</label>
                  <div className={styles.inputWrapper}>
                    <FaUser className={styles.inputIcon} />
                    <input type="text" name="regNo" value={form.regNo} onChange={handleChange} placeholder="CS123456" required className={styles.input} disabled={isLoading} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Date of Birth</label>
                  <div className={styles.inputWrapper}>
                    <FaCalendarAlt className={styles.inputIcon} />
                    <input type="date" name="dob" value={form.dob} onChange={handleChange} required className={styles.input} disabled={isLoading} />
                  </div>
                </div>

                <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} type="submit" className={styles.submitButton} disabled={isLoading}>
                  {isLoading ? <FaSpinner className={styles.spin} /> : <><FaSignInAlt /> Sign In</>}
                </motion.button>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className={styles.dashboardContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.dashboardHeader}>
              <div className={styles.userInfo}>
                <h2 className={styles.welcomeText}>Hello, <span className={styles.nameHighlight}>{(studentData.name || '').split(' ')[0]}</span></h2>
                <p className={styles.userSubText}>Manage your transportation pass and services</p>
              </div>
              <button onClick={logout} className={styles.logoutBtn}><FaArrowLeft /> Logout</button>
            </div>

            <div className={styles.dashboardGrid}>
              {/* Pass Panel */}
              <div className={styles.passPanel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Digital Bus Pass</h3>
                </div>

                <div className={styles.passVisual}>
                  {(() => {
                    const ps = paymentStatus.payment_status || studentData.payment_status;
                    const paymentOk = ps === 'verified' || ps === 'offline' || ps === 'waived';
                    const passReady = studentData.status === 'approved' && paymentOk && !cancellationStatus.isCancelled;
                    return passReady ? (
                      <BusPassTemplate studentData={studentData} />
                    ) : (
                    <div className={styles.statusBox}>
                      <div className={`${styles.statusIllo} ${(cancellationStatus.isCancelled || studentData.status === 'cancelled') ? styles.cancelledIcon : ''}`}>
                        {(cancellationStatus.isCancelled || studentData.status === 'cancelled') ? <FaTimesCircle /> : <FaShieldAlt className={styles.shieldIcon} />}
                      </div>
                      <h4 className={styles.statusTitle}>
                        {(cancellationStatus.isCancelled || studentData.status === 'cancelled')
                          ? 'Pass Cancelled'
                          : studentData.status === 'rejected'
                            ? 'Application Rejected'
                            : (() => {
                                const ps = paymentStatus.payment_status || studentData.payment_status;
                                if (ps === 'paid') return 'Payment Verification Pending';
                                if (ps === 'offline') return 'Offline Payment Recorded';
                                if (ps === 'waived') return 'Fee Waived by Admin';
                                return 'Application Under Review';
                              })()}
                      </h4>
                      <p className={styles.statusDesc}>
                        {(cancellationStatus.isCancelled || studentData.status === 'cancelled')
                          ? `Your bus pass has been cancelled. Reason: ${cancellationStatus.cancellationReason || studentData.cancellation_reason || 'Administrative action'}`
                          : studentData.status === 'rejected'
                            ? `Your application was not approved. ${studentData.rejection_reason ? `Reason: ${studentData.rejection_reason}` : ''}`
                            : (() => {
                                const ps = paymentStatus.payment_status || studentData.payment_status;
                                if (ps === 'paid') return 'Your payment is being verified by the admin. Your pass will be generated shortly.';
                                if (ps === 'offline') return 'Your offline payment has been recorded by admin. Your pass is being processed.';
                                if (ps === 'waived') return 'Your fee has been waived by the admin. Your pass is being processed.';
                                return 'Your pass will be active once admin approves and payment is complete.';
                              })()}
                      </p>

                      <div className={styles.checkRows}>
                        <div className={`${styles.checkRow} ${(studentData.status === 'approved' || studentData.status === 'cancelled') ? styles.done : studentData.status === 'rejected' ? styles.error : styles.pending}`}>
                          {(studentData.status === 'approved' || studentData.status === 'cancelled') ? <FaCheckCircle /> : studentData.status === 'rejected' ? <FaTimesCircle /> : <FaSpinner className={styles.spin} />}
                          <span>Admin Approval ({studentData.status})</span>
                        </div>
                        {/* Payment row — shows label based on type */}
                        {(() => {
                          const ps = paymentStatus.payment_status || studentData.payment_status;
                          const note = paymentStatus.payment_note;
                          const isDone = ['paid','verified','offline','waived'].includes(ps);
                          const label = ps === 'verified' ? 'Online (Verified)' : ps === 'offline' ? 'Offline Paid' : ps === 'waived' ? 'Fee Waived' : ps === 'paid' ? 'Paid (Pending verify)' : 'Unpaid';
                          return (
                            <div className={`${styles.checkRow} ${isDone ? styles.done : styles.pending}`}>
                              {isDone ? <FaCheckCircle /> : <FaSpinner className={styles.spin} />}
                              <span>Payment: {label}{note ? ` • ${note}` : ''}</span>
                            </div>
                          );
                        })()}
                        {(cancellationStatus.isCancelled || studentData.status === 'cancelled') && (
                          <div className={`${styles.checkRow} ${styles.error}`}>
                            <FaTimesCircle />
                            <span>Pass Status: CANCELLED</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>

              {/* Actions Panel */}
              <div className={styles.actionsPanel}>
                <div className={styles.panelHeader}>
                  <h3 className={styles.panelTitle}>Quick Actions</h3>
                </div>

                <div className={styles.actionGrid}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    className={styles.actionBtn}
                    disabled={(() => {
                      const ps = paymentStatus.payment_status || studentData.payment_status;
                      const paymentOk = ps === 'verified' || ps === 'offline' || ps === 'waived';
                      return isDownloading || cancellationStatus.isCancelled || studentData.status !== 'approved' || !paymentOk;
                    })()}
                  >
                    <div className={styles.actionIcon}><FaDownload /></div>
                    <div className={styles.actionText}>
                      <span className={styles.label}>Download Pass</span>
                      <span className={styles.desc}>Offline scannable copy</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPaymentModal(true)}
                    className={`${styles.actionBtn} ${(() => {
                      const ps = paymentStatus.payment_status || studentData.payment_status;
                      const isDone = ['paid', 'verified', 'offline', 'waived'].includes(ps);
                      return isDone ? '' : styles.actionActive;
                    })()}`}
                    disabled={(() => {
                      const ps = paymentStatus.payment_status || studentData.payment_status;
                      return ['paid', 'verified', 'offline', 'waived'].includes(ps);
                    })()}
                  >
                    <div className={styles.actionIcon}><FaCreditCard /></div>
                    <div className={styles.actionText}>
                      <span className={styles.label}>
                        {(() => {
                          const ps = paymentStatus.payment_status || studentData.payment_status;
                          if (ps === 'verified' || ps === 'offline' || ps === 'waived') return 'Fees Cleared ✓';
                          if (ps === 'paid') return 'Payment Pending Verify';
                          return 'Pay Pass Fees';
                        })()}
                      </span>
                      <span className={styles.desc}>
                        {(() => {
                          const ps = paymentStatus.payment_status || studentData.payment_status;
                          if (ps === 'offline') return 'Marked as Offline Payment';
                          if (ps === 'waived') return 'Fee Waived by Admin';
                          if (ps === 'verified' || ps === 'paid') return `ID: ${paymentStatus.payment_id || 'Online Payment'}`;
                          
                          const amt = routeFee?.fee_amount || studentData?.fee_amount;
                          return amt ? `₹${amt} · Secure online payment` : 'Secure online payment';
                        })()}
                      </span>
                    </div>
                  </motion.button>

                  {(() => {
                    const ps = paymentStatus.payment_status || studentData.payment_status;
                    if (ps === 'verified' || ps === 'waived') return null;
                    
                    return (
                      <div className={styles.uploadCard}>
                        <div className={styles.uploadBody}>
                          <div className={styles.uploadInfo}>
                            <FaUpload className={styles.uploadIcon} />
                            <div>
                              <span className={styles.uploadLabel}>
                                {ps === 'offline' ? 'Offline Receipt' : 'Payment Document'}
                              </span>
                              <span className={styles.uploadDesc}>
                                {selectedFile ? selectedFile.name : (ps === 'offline' ? 'Upload receipt for offline payment' : 'Upload receipt if paid offline')}
                              </span>
                            </div>
                          </div>
                          <div className={styles.uploadActions}>
                            <label className={styles.customFileUpload}>
                              Browse
                              <input type="file" onChange={handleFileChange} />
                            </label>
                            {selectedFile && (
                              <button onClick={handleFileUpload} className={styles.uploadSubmit}>Submit</button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => setShowTandC(true)}
                    className={(() => {
                      const v = systemSettings.cancellations_enabled;
                      const enabled = v === '1' || v === 1 || v === true || v === 'true';
                      return enabled ? styles.dangerBtn : styles.disabledBtn;
                    })()}
                    disabled={(() => {
                      const v = systemSettings.cancellations_enabled;
                      const enabled = v === '1' || v === 1 || v === true || v === 'true';
                      return !enabled || cancellationStatus.cancellationRequested || cancellationStatus.isCancelled || studentData.status === 'cancelled';
                    })()}
                  >
                    <FaTimesCircle />
                    {(() => {
                      const v = systemSettings.cancellations_enabled;
                      const enabled = v === '1' || v === 1 || v === true || v === 'true';
                      if (cancellationStatus.isCancelled || studentData.status === 'cancelled') return 'Pass Cancelled';
                      if (cancellationStatus.cancellationRequested) return 'Cancellation Pending';
                      return enabled ? 'Cancel My Pass' : 'Cancellation Period Closed';
                    })()}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
            <motion.div
              className={styles.modalContent}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
            >
              <div className={styles.modalHeader}>
                <h3>💳 Payment Gateway</h3>
                <button onClick={() => setShowPaymentModal(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.receiptLine}><span>Service</span> <span>Bus Pass Activation</span></div>
                <div className={styles.receiptLine}><span>Student</span> <span>{studentData.name}</span></div>
                <div className={styles.receiptLine}><span>Reg No</span> <span>{studentData.regNo}</span></div>
                <div className={styles.receiptLine}><span>Route</span> <span>{studentData.route}</span></div>
                <div className={styles.totalBlock}>
                  <span>Fee Amount</span>
                  {(routeFee?.fee_amount || studentData?.fee_amount) ? (
                    <span className={styles.amount}>₹{routeFee?.fee_amount || studentData.fee_amount}</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>⚠ Fee not configured for this route. Contact admin.</span>
                  )}
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  onClick={handlePayment}
                  className={styles.payBtn}
                  disabled={isProcessingPayment || (!routeFee?.fee_amount && !studentData?.fee_amount)}
                >
                  {isProcessingPayment ? <><FaSpinner className={styles.spin} /> Processing...</> : '🔒 Proceed to Pay via Razorpay'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCancelModal && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className={styles.modalHeader}>
                <h3>Cancellation Reason</h3>
                <button onClick={() => setShowCancelModal(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <p>Please tell us why you want to cancel your bus pass. This information is required for the approval process.</p>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className={styles.modalTextarea}
                  placeholder="Type your reason here..."
                />
              </div>
              <div className={styles.modalFooter}>
                <button onClick={handleCancelPass} className={styles.submitCancelBtn} disabled={isLoading || !cancelReason.trim()}>
                  Submit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showTandC && (
          <div className={styles.modalOverlay}>
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className={styles.modalHeader}>
                <h3>Terms & Conditions</h3>
                <button onClick={() => setShowTandC(false)}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.tcContent}>
                  <h4>Bus Pass Cancellation Policy</h4>
                  <ul>
                    <li>Once requested, the cancellation must be approved by HOD, Admin, and Principal.</li>
                    <li>The refund amount (if applicable) will be processed as per institutional norms.</li>
                    <li>Digital bus pass will be Revoked immediately after final approval.</li>
                    <li>This action cannot be undone once processed.</li>
                    <li>Cancellation is only permitted during the limited period enabled by the institution.</li>
                  </ul>
                  <p>Do you agree to proceed with the cancellation request?</p>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button 
                  onClick={() => { setShowTandC(false); setShowCancelModal(true); }} 
                  className={styles.agreeBtn}
                >
                  I Agree & Proceed
                </button>
                <button 
                  onClick={() => setShowTandC(false)} 
                  className={styles.cancelBtn}
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentDashboard;