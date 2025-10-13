import React from 'react';
import styles from './BusPassTemplate.module.css';

function BusPassTemplate({ studentData }) {
  if (!studentData) return null;

  const {
    photo,
    name,
    dob,
    branch,
    year,
    college,
    address,
    validTill,
    regNo,
  } = studentData;

  return (
    <div className={styles.cardWrapper}>
      <div className={styles.card} role="region" aria-label="Student Bus Pass">
        <div className={styles.leftColumn}>
          <div className={styles.logoArea}>
            <div className={styles.logo}>E-BUS</div>
            <div className={styles.collegeName}>{college || 'Your College Name'}</div>
          </div>

          <div className={styles.photoBox}>
            {photo ? (
              <img src={photo} alt={`${name || 'Student'} photo`} className={styles.photo} />
            ) : (
              <img src="/default-avatar.svg" alt="Default avatar" className={styles.photo} />
            )}
          </div>

          <div className={styles.idBlock}>
            <div className={styles.regLabel}>Reg. No.</div>
            <div className={styles.regValue}>{regNo || '-'}</div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.hdrRow}>
            <h2 className={styles.passTitle}>STUDENT BUS PASS</h2>
            <div className={styles.validUntil}>
              <div className={styles.validLabel}>Valid Upto</div>
              <div className={styles.validValue}>{validTill || 'N/A'}</div>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Name</div>
              <div className={styles.infoValue}>{name || 'Full Name'}</div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Date of Birth</div>
              <div className={styles.infoValue}>{dob || 'DD-MM-YYYY'}</div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Branch / Course</div>
              <div className={styles.infoValue}>{branch || '-'} / {year || '-'}</div>
            </div>

            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>Address</div>
              <div className={styles.infoValue}>{address || 'Student address goes here'}</div>
            </div>
          </div>

          <div className={styles.footerRow}>
            <div className={styles.issuer}>Issued by: A.E.R.I Transport</div>
            <div className={styles.qrPlaceholder}>QR</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusPassTemplate;
