import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBus, FaShieldAlt, FaQrcode, FaMobile, FaArrowRight, FaClock } from 'react-icons/fa';
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
      description: "Quick verification with scannable QR codes"
    },
    {
      icon: FaShieldAlt,
      title: "Secure & Safe",
      description: "Advanced security features to protect your data"
    },
    {
      icon: FaMobile,
      title: "Mobile Friendly",
      description: "Access your pass anywhere, anytime on your phone"
    },
    {
      icon: FaClock,
      title: "Instant Approval",
      description: "Fast processing and quick approval system"
    }
  ];

  const stats = [
    { number: "500+", label: "Students Served" },
    { number: "15+", label: "Bus Routes" },
    { number: "99%", label: "Success Rate" },
    { number: "24/7", label: "Support" }
  ];

  return (
    <div className={styles.pageWrapper}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              <span className={styles.heroTitlesubtitle}>A.E.R.I</span>
              <span className={styles.heroTitleMain}>Digital Bus Pass</span>
              <span className={styles.heroTitleSub}>for College Students</span>
            </h1>
            <p className={styles.heroDescription}>
              Experience the future of student transportation with our secure, digital bus pass system.
              Apply online, get instant approval, and travel hassle-free with QR code verification.
            </p>
            <div className={styles.heroButtons}>
              <button className={styles.primaryButton} onClick={handleApply}>
                Apply Now <FaArrowRight className={styles.buttonIcon} />
              </button>
              <button className={styles.secondaryButton} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroCard}>
              <div className={styles.cardHeader}>
                <FaBus className={styles.cardIcon} />
                <span className={styles.cardTitle}>College E-Bus Pass</span>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.studentInfo}>
                  <div className={styles.studentPhoto}></div>
                  <div className={styles.studentDetails}>
                    <div className={styles.studentName}>Sathish</div>
                    <div className={styles.studentReg}>REG: 2024001</div>
                    <div className={styles.studentRoute}>Route: ACE - HOSUR</div>
                  </div>
                </div>
                <div className={styles.qrPlaceholder}>
                  <FaQrcode className={styles.qrIcon} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statsContainer}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}>Why Choose Our Digital Bus Pass?</h2>
            <p className={styles.featuresDescription}>
              We've revolutionized student transportation with cutting-edge technology and user-friendly design.
            </p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon />
                  </div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to Apply?</h2>
            <p className={styles.ctaDescription}>
              Get your digital bus pass in minutes. Click below to start your application.
            </p>
            <button className={styles.ctaButton} onClick={handleApply}>
              Start Your Application <FaArrowRight className={styles.buttonIcon} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
