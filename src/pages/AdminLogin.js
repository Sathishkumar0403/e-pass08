import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash, FaExclamationCircle } from 'react-icons/fa';
import { adminLogin } from '../utils/api';
import styles from './AdminLogin.module.css';

function AdminLogin() {
  const [login, setLogin] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is already logged in
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setLogin({ ...login, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await adminLogin(login.username, login.password);
      if (response.message === 'Login successful') {
        // Store the token in localStorage
        localStorage.setItem('adminToken', response.token);
        navigate('/admin/dashboard');
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
      <div className={styles.centerContent}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.titleArea}>
            <div className={styles.iconWrapper}>
              <FaUserShield className={styles.loginIcon} />
            </div>
            <h1 className={styles.title}>Admin Login</h1>
            <p className={styles.subtitle}>Sign in to manage bus pass applications</p>
          </div>

          {error && (
            <div className={styles.error}>
              <FaExclamationCircle className={styles.errorIcon} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              Username
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
                placeholder="Enter your username"
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
                placeholder="Enter your password"
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

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              'Signing in...'
            ) : (
              <>
                <FaSignInAlt className={styles.buttonIcon} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;