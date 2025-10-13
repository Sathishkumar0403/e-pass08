
import React from 'react';
import styles from './PassCard.module.css';

function PassCard({ pass }) {
  return (
    <div className={styles.passCard}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <div className={styles.title}>E-BUS PASS</div>
          <div className={styles.subtitle}>Digital Student Transport Card</div>
          {pass.validTill && (
            <div className={styles.validTillBox}>
              <div className={styles.validTillLabel}>VALID TILL</div>
              <div className={styles.validTillValue}>{pass.validTill}</div>
            </div>
          )}
        </div>

        <div className={styles.divider} />

        <div className={styles.infoSection}>
          <div className={styles.photoSection}>
            <div className={styles.photoBox}>
              STUDENT PHOTO
            </div>
          </div>

          <div className={styles.details}>
            <div className={styles.row}>
              <div className={styles.field}>
                <div className={styles.label}>FULL NAME</div>
                <div className={styles.value}>{pass.name}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.label}>REG. NO.</div>
                <div className={styles.value}>{pass.collegeId}</div>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <div className={styles.label}>DATE OF BIRTH</div>
                <div className={styles.value}>{pass.dob}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.label}>MOBILE NO.</div>
                <div className={styles.value}>{pass.mobile}</div>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <div className={styles.label}>COURSE & YEAR</div>
                <div className={styles.value}>{pass.branchYear}</div>
              </div>
              <div className={styles.field}>
                <div className={styles.label}>ROUTE</div>
                <div className={styles.value}>{pass.route}</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.footer}>
          <div>Issued by: A.E.R.I Transport</div>
          {pass.validTill && <div>Valid Until: {pass.validTill}</div>}
        </div>
      </div>
    </div>
  );
}

export default PassCard;