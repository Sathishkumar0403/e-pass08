import React from 'react';
import styles from './BusPassTemplate.module.css';
import { QRCodeSVG } from 'qrcode.react';

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
    passNo,
    busNo,
    userType,
  } = studentData;

  return (
    <div className={styles.cardWrapper}>
      <div id="bus-pass-template" className={styles.card} role="region" aria-label="Student Bus Pass">
        <div className={styles.leftColumn}>
          <div className={styles.logoArea}>
            <div className={styles.logo}>E-BUS</div>
            <div className={styles.collegeName}>{college || 'Your College Name'}</div>
          </div>

          <div className={styles.photoBox}>
            <img 
              src={photo || '/placeholder-profile.png'} 
              alt={name || 'Student'} 
              className={styles.photo}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-profile.png';
              }}
            />
          </div>

          <div className={styles.idBlock}>
            <div className={styles.regLabel}>Reg. No.</div>
            <div className={styles.regValue}>{regNo || '-'}</div>
          </div>

          <div className={styles.subInfo}>
            <div className={styles.subInfoItem}>
              <div className={styles.subInfoLabel}>Pass No</div>
              <div className={styles.subInfoValue}>{passNo || '-'}</div>
            </div>
            <div className={styles.subInfoItem}>
              <div className={styles.subInfoLabel}>Bus No</div>
              <div className={styles.subInfoValue}>{busNo || '-'}</div>
            </div>

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
            
            <div className={styles.infoRow}>
              <div className={styles.infoLabel}>User Type</div>
              <div className={styles.infoValue}>{userType === 'staff' ? 'Staff' : 'Student'}</div>
            </div>

          </div>

          <div className={styles.footerRow}>
            <div className={styles.issuer}>Issued by: A.E.R.I Transport</div>
            <div className={styles.qrBox}>
              <QRCodeSVG
                value={JSON.stringify({
                  regNo,
                  name,
                  branch,
                  year,
                  validTill,
                  status: studentData.status,
                  passNo,
                  busNo,
                  cancelled: studentData.cancelled,
                  cancelledAt: studentData.cancelled_at,
                  cancelledBy: studentData.cancelled_by
                })}
                size={140}
                level="H"
                includeMargin={true}
                style={{ 
                  opacity: studentData.cancelled ? 0.5 : 1,
                  filter: studentData.cancelled ? 'grayscale(100%)' : 'none'
                }}
              />
              {studentData.cancelled && (
                <div className={styles.cancelledOverlay}>
                  CANCELLED
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusPassTemplate;
