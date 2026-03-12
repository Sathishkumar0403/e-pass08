import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserShield, FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaExclamationCircle, FaTimes, FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { adminLogin, resetPassword } from '../utils/api';
import styles from './AdminLogin.module.css';
import commonStyles from './AdminDashboard.module.css'; // borrowing some modal styles

function OfficialLogin() {
  const [login, setLogin] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({ username: '', oldPassword: '', newPassword: '', confirmPassword: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');

    if (adminToken && adminUser) {
      try {
        const user = JSON.parse(adminUser);
        if (user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user.role === 'hod' || user.role === 'principal') {
          navigate('/cancellation/dashboard');
        }
      } catch (e) {
        console.error('Failed to parse user during auto-login check');
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    setLogin({ ...login, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminLogin(login.username, login.password);
      if (response.message === 'Login successful') {
        localStorage.setItem('adminToken', response.token || 'true');
        localStorage.setItem('adminUser', JSON.stringify(response.user));
        
        // Redirect based on role
        if (response.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (response.user.role === 'hod' || response.user.role === 'principal') {
          navigate('/cancellation/dashboard');
        } else {
          setError('Unknown user role. Please contact support.');
        }
      } else {
        setError(response.error || 'Login failed');
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetForm.username || !resetForm.oldPassword || !resetForm.newPassword || !resetForm.confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetForm.username, resetForm.oldPassword, resetForm.newPassword);
      setSuccessMessage('Password reset successful! You can now login.');
      setShowResetModal(false);
      setResetForm({ username: '', oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message || 'Reset failed. Check your old password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.bgGlow}></div>

      <div className={styles.centerContent}>
        <motion.div
          className={styles.loginCard}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className={styles.titleArea}>
            <div className={styles.iconWrapper}>
              <FaUserShield className={styles.loginIcon} />
            </div>
            <h1 className={styles.title}>Official Login</h1>
            <p className={styles.subtitle}>Enter your credentials to access the management portal</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {error && (
              <motion.div
                className={styles.error}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FaExclamationCircle className={styles.errorIcon} />
                <span>{error}</span>
              </motion.div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="username">
                Username / Official ID
              </label>
              <div className={styles.inputWrapper}>
                <FaUser className={styles.inputIcon} />
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={styles.input}
                  value={login.username}
                  onChange={handleChange}
                  placeholder="Enter username"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <div className={styles.inputWrapper}>
                <FaLock className={styles.inputIcon} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={login.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className={styles.showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                'Verifying...'
              ) : (
                <>
                  <FaSignInAlt className={styles.buttonIcon} />
                  <span>Sign In</span>
                </>
              )}
            </motion.button>
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                type="button" 
                onClick={() => setShowResetModal(true)}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Forgot Password or Security Reset?
              </button>
            </div>
          </form>

          {successMessage && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <FaCheckCircle /> {successMessage}
            </div>
          )}
        </motion.div>

        {/* Reset Modal */}
        <AnimatePresence>
          {showResetModal && (
            <div className={commonStyles.modalOverlay} onClick={() => setShowResetModal(false)}>
              <motion.div 
                className={commonStyles.modalPanel} 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className={commonStyles.modalHeader}>
                  <h3>Official Security Reset</h3>
                  <button onClick={() => setShowResetModal(false)} className={commonStyles.closeModalBtn}><FaTimes /></button>
                </div>
                <div className={commonStyles.modalBody}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                    Verify your identity using your current password and username to update your security credentials.
                    <br/><strong>Forgot your old password?</strong> Please contact the System Administrator.
                  </p>
                  <div className={commonStyles.inputGroup}>
                    <label>Username / Official ID</label>
                    <input 
                      type="text" 
                      value={resetForm.username} 
                      onChange={e => setResetForm({ ...resetForm, username: e.target.value })} 
                      placeholder="Enter your username" 
                    />
                  </div>
                  <div className={commonStyles.inputGroup}>
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      value={resetForm.oldPassword} 
                      onChange={e => setResetForm({ ...resetForm, oldPassword: e.target.value })} 
                      placeholder="Enter current password" 
                    />
                  </div>
                  <div className={commonStyles.inputGroup}>
                    <label>New Password</label>
                    <input 
                      type="password" 
                      value={resetForm.newPassword} 
                      onChange={e => setResetForm({ ...resetForm, newPassword: e.target.value })} 
                      placeholder="At least 6 characters" 
                    />
                  </div>
                  <div className={commonStyles.inputGroup}>
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      value={resetForm.confirmPassword} 
                      onChange={e => setResetForm({ ...resetForm, confirmPassword: e.target.value })} 
                      placeholder="Repeat new password" 
                    />
                  </div>
                </div>
                <div className={commonStyles.modalFooter}>
                  <button onClick={handleResetPassword} className={commonStyles.saveBtn} disabled={loading}>
                    {loading ? 'Processing...' : 'Update Password'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OfficialLogin;
