import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaIdCard, FaGraduationCap, FaPhone, FaUserFriends, FaHome, FaBus, FaCalendarAlt, FaImage, FaIdBadge, FaInfoCircle, FaCogs, FaSignOutAlt, FaSpinner, FaTimes, FaEye, FaTrash, FaFileExcel } from 'react-icons/fa';
import { adminLogin, getApplications, approveApplication, rejectApplication, deleteApplication } from '../utils/api';
import styles from './AdminDashboard.module.css';

function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [fetchingApps, setFetchingApps] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredApplications, setFilteredApplications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin');
      return;
    }
    fetchApplications();
  }, [navigate]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = applications.filter(app => {
        const matchesSearch = (
            (app.name && app.name.toLowerCase().includes(lowercasedFilter)) ||
            (app.regNo && app.regNo.toLowerCase().includes(lowercasedFilter)) ||
            (app.mobile && app.mobile.includes(searchTerm))
        );
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    setFilteredApplications(filtered);
  }, [searchTerm, statusFilter, applications]);

  const fetchApplications = async () => {
    setFetchingApps(true);
    try {
      const apps = await getApplications();
      setApplications(Array.isArray(apps) ? apps : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setFetchingApps(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveApplication(id);
      await fetchApplications();
    } catch (err) {
      setError(err.message || 'Failed to approve application');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectApplication(id);
      await fetchApplications();
    } catch (err) {
      setError(err.message || 'Failed to reject application');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      try {
        await deleteApplication(id);
        await fetchApplications();
      } catch (err) {
        setError(err.message || 'Failed to delete application');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setApplications([]);
    setError('');
    navigate('/admin');
  };

  const openImageModal = (imageUrl, title) => {
    setSelectedImage({ url: imageUrl, title });
    setImageModalOpen(true);
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/admin/export-excel');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        throw new Error('Invalid file format received from server.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'student_applications.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message || 'Failed to export data');
    }
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };



  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <h2 className={styles.dashboardTitle}>Admin Dashboard</h2>
        <div className={styles.headerActions}>
          <button 
            onClick={handleExportExcel}
            className={`${styles.actionButton} ${styles.exportButton}`}
          >
            <FaFileExcel /> Export to Excel
          </button>
          <button 
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {fetchingApps ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p className={styles.loadingText}>Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No applications found.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <div className={styles.filterContainer}>
            <input
              type="text"
              placeholder="Search by name, reg no, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.statusFilter}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <table className={styles.applicationsTable}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}><FaUser /> Name</th>
                <th className={styles.tableHeaderCell}><FaIdCard /> Reg No</th>
                <th className={styles.tableHeaderCell}><FaGraduationCap /> Branch/Year</th>
                <th className={styles.tableHeaderCell}><FaPhone /> Mobile</th>
                <th className={styles.tableHeaderCell}><FaUserFriends /> Parent Mobile</th>
                <th className={styles.tableHeaderCell}><FaHome /> Address</th>
                <th className={styles.tableHeaderCell}><FaBus /> Route</th>
                <th className={styles.tableHeaderCell}><FaCalendarAlt /> Validity</th>
                <th className={styles.tableHeaderCell}><FaImage /> Photo</th>
                <th className={styles.tableHeaderCell}><FaIdBadge /> Aadhar No</th>
                <th className={styles.tableHeaderCell}><FaImage /> Aadhar Photo</th>
                <th className={styles.tableHeaderCell}><FaImage /> College ID Photo</th>
                <th className={styles.tableHeaderCell}><FaImage /> Fees Bill</th>
                <th className={styles.tableHeaderCell}><FaIdCard /> Pass No</th>
                <th className={styles.tableHeaderCell}><FaBus /> Bus No</th>
                <th className={styles.tableHeaderCell}><FaInfoCircle /> Status</th>
                <th className={styles.tableHeaderCell}><FaCogs /> Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id || app._id} className={`${styles.tableRow} ${app.status === 'approved' ? styles.approved : app.status === 'rejected' ? styles.rejected : ''}`}>
                  <td className={styles.tableCell}><FaUser style={{ marginRight: 4, color: '#6366f1' }} />{app.name}</td>
                  <td className={styles.tableCell}><FaIdCard style={{ marginRight: 4, color: '#0ea5e9' }} />{app.regNo}</td>
                  <td className={styles.tableCell}><FaGraduationCap style={{ marginRight: 4, color: '#f59e42' }} />{app.branchYear}</td>
                  <td className={styles.tableCell}><FaPhone style={{ marginRight: 4, color: '#22c55e' }} />{app.mobile}</td>
                  <td className={styles.tableCell}><FaUserFriends style={{ marginRight: 4, color: '#f43f5e' }} />{app.parentMobile}</td>
                  <td className={styles.tableCell}><FaHome style={{ marginRight: 4, color: '#a3e635' }} />{app.address}</td>
                  <td className={styles.tableCell}><FaBus style={{ marginRight: 4, color: '#fbbf24' }} />{app.route}</td>
                  <td className={styles.tableCell}><FaCalendarAlt style={{ marginRight: 4, color: '#818cf8' }} />{app.validity}</td>
                  <td className={styles.tableCell}>
                    {app.photo ? (
                      <div className={styles.imageContainer}>
                        <img 
                          src={app.photo} 
                          alt="Photo" 
                          className={styles.thumbnailImage}
                          onClick={() => openImageModal(app.photo, `${app.name}'s Photo`)}
                        />
                        <FaEye 
                          className={styles.viewIcon}
                          onClick={() => openImageModal(app.photo, `${app.name}'s Photo`)}
                          title="View full size"
                        />
                      </div>
                    ) : '-'}
                  </td>
                  <td className={styles.tableCell}><FaIdBadge style={{ marginRight: 4, color: '#f59e42' }} />{app.aadharNumber}</td>
                  <td className={styles.tableCell}>
                    {app.aadharPhoto ? (
                      <div className={styles.imageContainer}>
                        <img 
                          src={app.aadharPhoto} 
                          alt="Aadhar" 
                          className={styles.thumbnailImage}
                          onClick={() => openImageModal(app.aadharPhoto, `${app.name}'s Aadhar Photo`)}
                        />
                        <FaEye 
                          className={styles.viewIcon}
                          onClick={() => openImageModal(app.aadharPhoto, `${app.name}'s Aadhar Photo`)}
                          title="View full size"
                        />
                      </div>
                    ) : '-'}
                  </td>
                  <td className={styles.tableCell}>
                    {app.collegeIdPhoto ? (
                      <div className={styles.imageContainer}>
                        <img 
                          src={app.collegeIdPhoto} 
                          alt="College ID" 
                          className={styles.thumbnailImage}
                          onClick={() => openImageModal(app.collegeIdPhoto, `${app.name}'s College ID Photo`)}
                        />
                        <FaEye 
                          className={styles.viewIcon}
                          onClick={() => openImageModal(app.collegeIdPhoto, `${app.name}'s College ID Photo`)}
                          title="View full size"
                        />
                      </div>
                    ) : '-'}
                  </td>
                  <td className={styles.tableCell}>
                    {app.feesBillPhoto ? (
                      <div className={styles.imageContainer}>
                        <img 
                          src={app.feesBillPhoto} 
                          alt="Fees Bill" 
                          className={styles.thumbnailImage}
                          onClick={() => openImageModal(app.feesBillPhoto, `${app.name}'s Fees Bill`)}
                        />
                        <FaEye 
                          className={styles.viewIcon}
                          onClick={() => openImageModal(app.feesBillPhoto, `${app.name}'s Fees Bill`)}
                          title="View full size"
                        />
                      </div>
                    ) : '-'}
                  </td>
                  <td className={styles.tableCell}>{app.passNumber || '-'}</td>
                  <td className={styles.tableCell}>{app.busNumber || '-'}</td>
                  <td className={styles.tableCell}>
                    <span className={`${styles.statusBadge} ${styles[app.status]}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionButtons}>
                      {app.status === 'pending' ? (
                        <>
                          <button onClick={() => handleApprove(app.id || app._id)} className={`${styles.actionButton} ${styles.approveButton}`}>Approve</button>
                          <button onClick={() => handleReject(app.id || app._id)} className={`${styles.actionButton} ${styles.rejectButton}`}>Reject</button>
                        </>
                      ) : app.status === 'approved' ? (
                        <span className={`${styles.statusBadge} ${styles.approved}`}>Approved</span>
                      ) : (
                        <span className={`${styles.statusBadge} ${styles.rejected}`}>Rejected</span>
                      )}
                      <button 
                        onClick={() => handleDelete(app.id || app._id)} 
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Delete Application"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Image Modal */}
      {imageModalOpen && selectedImage && (
        <div className={styles.imageModal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {selectedImage.title}
              </h3>
              <button
                onClick={closeImageModal}
                className={styles.modalCloseButton}
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className={styles.modalImage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;