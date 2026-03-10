import React from 'react';
import StudentForm from '../components/StudentForm';
import { motion } from 'framer-motion';
import styles from './StudentApplicationForm.module.css';
import { FaShieldAlt, FaClock } from 'react-icons/fa';

function StudentApplicationForm() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.bgGlow}></div>

      <div className={styles.formSection}>
        <motion.div
          className={styles.formHeader}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.badge}>
            <FaShieldAlt /> Secure Application
          </div>
          <h1 className={styles.formTitle}>
            Bus Pass <span className={styles.titleGradient}>Application Form</span>
          </h1>
          <p className={styles.formDescription}>
            Complete your digital pass application in under 5 minutes.
            All documents are processed securely and encrypted.
          </p>

          <div className={styles.metaInfo}>
            <div className={styles.metaItem}>
              <FaClock /> 5 min read
            </div>
            <div className={styles.metaItem}>
              <FaShieldAlt /> 256-bit SSL
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <StudentForm />
        </motion.div>
      </div>
    </div>
  );
}

export default StudentApplicationForm;