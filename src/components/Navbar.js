import React, { useState, useEffect } from 'react';
import { FaHome, FaUserGraduate, FaUserShield, FaBars, FaTimes, FaBus } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

function Navbar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/', label: 'Home Page', icon: FaHome },
    { path: '/student', label: 'Student Login', icon: FaUserGraduate },
    { path: '/admin', label: 'Admin Login', icon: FaUserShield }
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logoWrapper} onClick={closeMobileMenu}>
          <div className={styles.logoIcon}>
            <FaBus />
          </div>
          <span className={styles.logoText}>E-Bus Pass</span>
        </Link>

        {/* Desktop Navigation */}
        <div className={styles.desktopNav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                data-tooltip={item.label}
              >
                <Icon className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.tooltip}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Menu Button */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div className={`${styles.mobileNav} ${isMobileMenuOpen ? styles.mobileNavOpen : ''}`}>
        <div className={styles.mobileNavContent}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.mobileNavLink} ${isActive ? styles.activeLink : ''}`}
                onClick={closeMobileMenu}
              >
                <Icon className={styles.mobileNavIcon} />
                <span className={styles.mobileNavLabel}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className={styles.mobileOverlay} onClick={closeMobileMenu} />
      )}
    </nav>
  );
}

export default Navbar;  