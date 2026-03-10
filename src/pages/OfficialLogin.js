import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUserShield, FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import { adminLogin } from '../utils/api';
import styles from './AdminLogin.module.css';

function OfficialLogin() {
  const [login, setLogin] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default OfficialLogin;
