import React from 'react';
import StudentForm from '../components/StudentForm';
import styles from './StudentApplicationForm.module.css';
import { FaClipboardList } from 'react-icons/fa';

function StudentApplicationForm() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.formSection}>
        <div className={styles.formHeader}>
          <h1 className={styles.formTitle}>
            <FaClipboardList className={styles.titleIcon} />
            Student Bus Pass Application 
          </h1>
          <p className={styles.formDescription}>
            Fill out the form below with your details and required documents to get started.
          </p>
        </div>
        <StudentForm />
      </div>
    </div>
  );
}

export default StudentApplicationForm;