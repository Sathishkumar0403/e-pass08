import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaBus, FaShieldAlt, FaQrcode, FaMobile, FaArrowRight, FaClock, FaUserGraduate } from 'react-icons/fa';
import styles from './Home.module.css';

function Home() {
  const navigate = useNavigate();

  const handleApply = () => {
    navigate('/apply');
  };

  const features = [
    {
      icon: FaQrcode,
      title: "Digital QR Code",
      description: "Secure, scannable QR verification for your daily commute."
    },
    {
      icon: FaShieldAlt,
      title: "Anti-Forgery",
      description: "Advanced cryptographic security to prevent unauthorized pass use."
    },
    {
      icon: FaMobile,
      title: "Wallet Ready",
      description: "Always with you on your mobile device. No physical card needed."
    },
    {
      icon: FaClock,
      title: "Fast Track",
      description: "Instant application and automated approval workflow."
    }
  ];

  const stats = [
    { number: "10k+", label: "Active Passes" },
    { number: "24/7", label: "Verification" },
    { number: "0.5s", label: "Scan Speed" },
    { number: "100%", label: "Secure" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="home-root" style={{ position: 'static', overflowX: 'hidden' }}>
      {/* Background Decorative Elements */}
      <div className={styles.bgGlow1}></div>
      <div className={styles.bgGlow2}></div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroText}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className={styles.badge}>
              <span className={styles.badgeDot}></span>
              Next-Gen Transportation
            </div>
            <h1 className={styles.heroTitle}>
              <span className={styles.titleGradient}> AERI Intelligent</span> <br />
              Bus Pass System
            </h1>
            <p className={styles.heroDescription}>
              Modernizing college transit with secure digital identification.
              Seamless application, instant verification, and smart management.
            </p>
            <div className={styles.heroButtons}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={styles.primaryButton}
                onClick={handleApply}
              >
                Get Started <FaArrowRight className={styles.buttonIcon} />
              </motion.button>
              <button
                className={styles.secondaryButton}
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Learn More
              </button>
            </div>
          </motion.div>

          {/* Removed floating card per request */}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={itemVariants}
        >
          <h2 className={styles.sectionTitle}>Smart Features</h2>
          <p className={styles.sectionSubtitle}>Everything you need for a modern commute</p>
        </motion.div>

        <motion.div
          className={styles.featuresGrid}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={styles.featureCard}
              variants={itemVariants}
              whileHover={{ y: -10 }}
            >
              <div className={styles.featureIcon}>
                <feature.icon />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Portals Section */}
      <section className={styles.portalsSection}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={itemVariants}
        >
          <h2 className={styles.sectionTitle}>Portals & Access</h2>
          <p className={styles.sectionSubtitle}>Select your portal to continue</p>
        </motion.div>

        <div className={styles.portalsGrid}>
          <motion.div
            className={styles.portalCard}
            whileHover={{ y: -10 }}
            onClick={() => navigate('/student')}
          >
            <div className={`${styles.portalIcon} ${styles.studentIcon}`}><FaUserGraduate /></div>
            <h3>Student Portal</h3>
            <p>View pass status, download digital card, and pay fees.</p>
            <button className={styles.portalBtn}>Login as Student</button>
          </motion.div>

          <motion.div
            className={styles.portalCard}
            whileHover={{ y: -10 }}
            onClick={() => navigate('/admin')}
          >
            <div className={`${styles.portalIcon} ${styles.hodIcon}`}><FaShieldAlt /></div>
            <h3>Official Portal</h3>
            <p>Admin, HOD, and Principal verification & management portal.</p>
            <button className={styles.portalBtn}>Login as Official</button>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsGlass}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <h2 className={styles.ctaTitle}>Ready to modernize your travel?</h2>
          <p className={styles.ctaSubtitle}>Students can log in to check their bus pass status and manage their travel pass.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.ctaButton}
            onClick={handleApply}
          >
            Apply for E-Pass <FaArrowRight />
          </motion.button>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>&copy; 2026 E-Bus Pass. Intelligent Transportation solutions.</p>
        <p className={styles.developerCredit}>Developed with ❤️ by Sathish Kumar & Team CSE</p>
      </footer>
    </div>
  );
}

export default Home;
