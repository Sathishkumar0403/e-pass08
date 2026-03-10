import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationAlert from '../components/NotificationAlert';
import {
  FaUser,
  FaIdCard,
  FaHome,
  FaBus,
  FaIdBadge,
  FaInfoCircle,
  FaSignOutAlt,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaFileExcel,
  FaCreditCard,
  FaCheckCircle,
  FaRupeeSign,
  FaEdit,
  FaPlus,
  FaList,
  FaSearch,
  FaFilter,
  FaUserGraduate,
  FaBullhorn,
  FaShieldAlt
} from 'react-icons/fa';
import {
  getApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
  getRouteFees,
  createRouteFee,
  updateRouteFee,
  deleteRouteFee,
  getPaymentDetails,
  exportPaymentsToExcel,
  getBusRoutes,
  getBusSeatCounts,
  createBusRoute,
  updateBusRoute,
  deleteBusRoute,
  getNotifications,
  createNotification,
  deleteNotification,
  hodApproveCancellation,
  principalApproveCancellation,
  adminApproveCancellation,
  adminDeclineCancellation,
  approvePaymentPass,
  rejectPaymentPass,
  updateApplication,
  getAdminSettings,
  updateSystemSetting
} from '../utils/api';
import { getImageUrl } from '../config';
import styles from './AdminDashboard.module.css';
import LocationAutocomplete from '../components/LocationAutocomplete';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

function AdminDashboard() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const [fetchingApps, setFetchingApps] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'fees', 'buses', 'notifications', 'settings'
  const [routeFees, setRouteFees] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState([]);
  const [busRoutes, setBusRoutes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [busSeatCounts, setBusSeatCounts] = useState({});
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notiForm, setNotiForm] = useState({ title: '', message: '', type: 'announcement', target_role: 'all' });
  const [showBusModal, setShowBusModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [editingBus, setEditingBus] = useState(null);
  const [feeForm, setFeeForm] = useState({ from: 'College', to: '', address: '', fee_amount: '', description: '', is_active: true });
  const [busForm, setBusForm] = useState({ bus_number: '', route: '', from: '', to: '', capacity: '', driver_name: '', driver_mobile: '', is_active: true });
  const [successMessage, setSuccessMessage] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionTargetId, setRejectionTargetId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [systemSettings, setSystemSettings] = useState({});
  const navigate = useNavigate();

  const refreshData = useCallback(async (type = 'all') => {
    if (!adminUser) return;

    try {
      if (type === 'all' || type === 'applications') {
        setFetchingApps(true);
        const apps = await getApplications({
          role: adminUser.role || 'admin',
          department: adminUser.department || ''
        });
        setApplications(apps);
        setFetchingApps(false);
      }

      if (type === 'all' || type === 'fees') {
        const feesData = await getRouteFees();
        setRouteFees(feesData);
      }

      if (type === 'all' || type === 'payments') {
        getPaymentDetails().then(setPaymentDetails).catch(() => { });
      }

      if (type === 'all' || type === 'buses') {
        const busData = await getBusRoutes();
        setBusRoutes(busData);
        getBusSeatCounts().then(setBusSeatCounts).catch(() => {});
      }

      if (type === 'all' || type === 'notifications') {
        const notiData = await getNotifications();
        setNotifications(notiData);
      }

      if (type === 'all' || type === 'settings') {
        const settingsData = await getAdminSettings();
        const settingsMap = {};
        settingsData.forEach(s => settingsMap[s.key] = s.value);
        setSystemSettings(settingsMap);
      }
    } catch (err) {
      console.error(`Error refreshing ${type}:`, err);
      if (type === 'all' || type === 'applications') {
        setError('Could not pull applications');
      }
    } finally {
      if (type === 'all' || type === 'applications') {
        setFetchingApps(false);
      }
    }
  }, [adminUser]);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const userJson = localStorage.getItem('adminUser');

    if (!adminToken || !userJson) {
      navigate('/admin');
      return;
    }

    try {
      const user = JSON.parse(userJson);
      // Only update if data actually changed to avoid unnecessary re-renders
      setAdminUser(prev => {
        if (prev?.username === user.username && prev?.role === user.role) return prev;

        // Redirect non-admin users to their specific dashboard
        if (user.role === 'hod' || user.role === 'principal') {
          navigate('/cancellation/dashboard');
        }

        return user;
      });
    } catch (e) {
      navigate('/admin');
    }
  }, [navigate]);

  useEffect(() => {
    if (adminUser) {
      refreshData('all');
    }
  }, [adminUser, refreshData]);

  useEffect(() => {
    let filtered = applications;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(lower) ||
        app.regNo.toLowerCase().includes(lower)
      );
    }
    setFilteredApplications(filtered);
  }, [applications, statusFilter, searchTerm]);

  const handleApprove = async (id) => {
    try {
      await approveApplication(id);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectApplication(id);
      refreshData('applications');
    } catch (err) {
      setError('Rejection failed');
    }
  };

  const handleApprovePaymentPass = async (id) => {
    try {
      await approvePaymentPass(id);
      setSuccessMessage('Pass issued successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshData('payments');
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Pass issuance failed');
    }
  };

  const initiateRejectPaymentPass = (id) => {
    setRejectionTargetId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleConfirmRejectPaymentPass = async () => {
    try {
      await rejectPaymentPass(rejectionTargetId, rejectionReason);
      setSuccessMessage('Application rejected due to payment issues');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowRejectModal(false);
      refreshData('payments');
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Rejection failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete application?')) {
      try {
        await deleteApplication(id);
        refreshData('applications');
      } catch (err) {
        setError('Delete failed');
      }
    }
  };

  const handleHodApprove = async (id) => {
    try {
      await hodApproveCancellation(id);
      setSuccessMessage('HOD approval recorded. Forwarded to Principal.');
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'HOD approval failed');
    }
  };

  const handlePrincipalApprove = async (id) => {
    try {
      await principalApproveCancellation(id);
      setSuccessMessage('Principal approved. Forwarded to Admin for final approval.');
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Principal approval failed');
    }
  };

  const handleAdminApprove = async (id) => {
    try {
      await adminApproveCancellation(id);
      setSuccessMessage('Admin approved. Pass cancelled successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Admin approval failed');
    }
  };

  const handleAdminDecline = async (id) => {
    if (!window.confirm('Are you sure you want to decline this cancellation request?')) return;
    try {
      await adminDeclineCancellation(id);
      setSuccessMessage('Cancellation request declined by Admin.');
      setTimeout(() => setSuccessMessage(''), 3000);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Admin decline failed');
    }
  };

  const handleSaveFee = async () => {
    try {
      if (editingFee) {
        await updateRouteFee(editingFee.id, feeForm);
      } else {
        await createRouteFee(feeForm);
      }
      refreshData('fees');
      setShowFeeModal(false);
      setFeeForm({ from: 'College', to: '', address: '', fee_amount: '', description: '', is_active: true });
      setEditingFee(null);
    } catch (err) {
      setError('Failed to save route configuration');
    }
  };

  const handleEditApplication = (app) => {
    setEditingApplication(app);
    setEditForm({ ...app });
    setShowEditModal(true);
  };

  const handleSaveApplication = async () => {
    try {
      await updateApplication(editingApplication.id, editForm);
      setSuccessMessage('Application updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowEditModal(false);
      refreshData('applications');
    } catch (err) {
      setError(err.message || 'Failed to update application');
    }
  };

  const handleEditFee = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      from: fee.from,
      to: fee.to,
      address: fee.address,
      fee_amount: fee.fee_amount,
      description: fee.description,
      is_active: fee.is_active
    });
    setShowFeeModal(true);
  };

  const handleDeleteFee = async (id) => {
    if (window.confirm('Delete this route config?')) {
      try {
        await deleteRouteFee(id);
        refreshData('fees');
      } catch (err) {
        setError('Delete failed');
      }
    }
  };

  const handleSaveBus = async () => {
    try {
      const payload = { ...busForm };
      if (editingBus) {
        await updateBusRoute(editingBus.id, payload);
      } else {
        await createBusRoute(payload);
      }
      await refreshData('buses');
      setShowBusModal(false);
      setBusForm({ bus_number: '', route: '', from: '', to: '', capacity: '', driver_name: '', driver_mobile: '', is_active: true });
      setEditingBus(null);
      setSuccessMessage('Bus assignment saved!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save bus assignment');
    }
  };

  const handleEditBus = (bus) => {
    setEditingBus(bus);
    setBusForm({
      bus_number: bus.bus_number || '',
      route: bus.route || '',
      from: bus.from || '',
      to: bus.to || '',
      capacity: bus.capacity || '',
      driver_name: bus.driver_name || '',
      driver_mobile: bus.driver_mobile || '',
      is_active: bus.is_active !== undefined ? bus.is_active : true
    });
    setShowBusModal(true);
  };

  const handleDeleteBus = async (id) => {
    if (window.confirm('Delete this bus assignment?')) {
      try {
        await deleteBusRoute(id);
        await refreshData('buses');
      } catch (err) {
        setError('Delete failed');
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportPaymentsToExcel();
    } catch (err) {
      setError('Export failed');
    }
  };

  const openImageModal = (url, title) => {
    if (!url) return;
    setSelectedImage({ url, title });
  };

  const handleSaveNotification = async () => {
    if (!notiForm.title || !notiForm.message) {
      setError('Title and message are required');
      return;
    }
    try {
      await createNotification(notiForm);
      await refreshData('notifications');
      setShowNotificationModal(false);
      setNotiForm({ title: '', message: '', type: 'announcement', target_role: 'all' });
      setSuccessMessage('Notification published successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to create notification');
    }
  };

  const handleDeleteNotification = async (id) => {
    if (window.confirm('Delete this announcement?')) {
      try {
        await deleteNotification(id);
        await refreshData('notifications');
        setSuccessMessage('Announcement deleted');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        setError('Failed to delete');
      }
    }
  };

  const handleToggleSetting = async (key, currentValue) => {
    try {
      const newValue = currentValue === '1' ? '0' : '1';
      await updateSystemSetting(key, newValue);
      setSystemSettings(prev => ({ ...prev, [key]: newValue }));
      setSuccessMessage('Setting updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update setting');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin');
  };

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoBox}>EP</div>
          <span className={styles.logoLabel}>E-PASS ADMIN</span>
        </div>

        <div className={styles.navMenu}>
          {[
            { id: 'applications', label: 'Applications', icon: FaList },
            { id: 'buses', label: 'Bus Management', icon: FaBus },
            { id: 'fees', label: 'Route Fees', icon: FaRupeeSign },
            { id: 'payments', label: 'Payments', icon: FaCreditCard },
            { id: 'announcements', label: 'Announcements', icon: FaBullhorn },
            { id: 'settings', label: 'System Settings', icon: FaShieldAlt },
          ].map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon /> {item.label}
            </button>
          ))}
        </div>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </aside>

      <main className={styles.mainArea}>
        <NotificationAlert role="admin" />
        <header className={styles.topHeader}>
          <div className={styles.headerInfo}>
            <h1 className={styles.pageTitle}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p className={styles.pageSubtitle}>
              {adminUser ? `${adminUser.name} (${adminUser.role.toUpperCase()}${adminUser.department ? ' - ' + adminUser.department : ''})` : 'System Management Dashboard'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.publicNav}>
              <Link to="/" className={styles.navLink}><FaHome /> <span>Home</span></Link>
              <Link to="/student" className={styles.navLink}><FaUserGraduate /> <span>Student Portal</span></Link>
            </div>
            <button onClick={handleExportExcel} className={styles.exportBtn}>
              <FaFileExcel /> Export Data
            </button>
          </div>
        </header>

        <section className={styles.contentWrap}>
          {error && (
            <div className={styles.errorStick}>
              <FaInfoCircle /> {error}
              <button onClick={() => setError('')} className={styles.closeStick}>&times;</button>
            </div>
          )}
          {successMessage && (
            <div className={styles.successBanner} style={{ marginBottom: '1.5rem' }}>
              <FaCheckCircle /> {successMessage}
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'applications' && (
              <motion.div key="apps" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.toolBar}>
                  <div className={styles.searchBox}>
                    <FaSearch />
                    <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className={styles.filterBox}>
                    <FaFilter />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className={styles.tableCard}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.modernTable}>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>ID / Dept</th>
                          <th>Contact</th>
                          <th>Route</th>
                          <th>Documents</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fetchingApps ? (
                          <tr><td colSpan="7" className={styles.centerTd}><FaSpinner className={styles.spin} /> Loading...</td></tr>
                        ) : filteredApplications.map(app => (
                          <tr key={app.id}>
                            <td>
                              <div className={styles.studentProf}>
                                {app.photo ? (
                                  <img
                                    src={getImageUrl(app.photo)}
                                    alt={`${app.name} Avatar`}
                                    className={styles.miniAvatar}
                                    onClick={() => openImageModal(app.photo, 'Student Photo')}
                                    onError={(e) => { e.target.src = '/placeholder-profile.png'; }}
                                  />
                                ) : <div className={styles.avatarVoid}><FaUser /></div>}
                                <div className={styles.profInfo}>
                                  <span className={styles.profName}>{app.name}</span>
                                  <span className={styles.profType}>{app.userType}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className={styles.flexCol}>
                                <span className={styles.idVal}>{app.regNo}</span>
                                <span className={styles.courseVal}>{app.department} / {app.year}</span>
                                <span className={styles.deptBadge}>{app.department}</span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.flexCol}>
                                <span className={styles.phoneVal}>{app.mobile}</span>
                                <span className={styles.collegeVal}>{app.college}</span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.flexCol}>
                                <span className={styles.routeVal}>{app.route}</span>
                                {app.busNumber ? (() => {
                                  const bus = busRoutes.find(b => b.bus_number === app.busNumber);
                                  const capacity = bus ? Number(bus.capacity) || 60 : 60;
                                  const enrolled = busSeatCounts[app.busNumber] || 0;
                                  const pct = (enrolled / capacity) * 100;
                                  const seatColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
                                  
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span className={styles.busVal}>Bus: {app.busNumber}</span>
                                      <span style={{
                                        fontSize: '0.65rem',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        background: `${seatColor}20`,
                                        color: seatColor,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {enrolled}/{capacity}
                                      </span>
                                    </div>
                                  );
                                })() : (
                                  <span className={styles.busVal}>Bus: --</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className={styles.docStrip}>
                                {app.aadharPhoto && (
                                  <button className={styles.docBtn} onClick={() => openImageModal(app.aadharPhoto, 'Aadhar Card')} title="Aadhar"><FaIdBadge /></button>
                                )}
                                <button className={styles.docBtn} onClick={() => openImageModal(app.collegeIdPhoto, 'College ID')} title="ID Card"><FaIdCard /></button>
                              </div>
                            </td>
                            <td>
                              <span className={`${styles.statusPill} ${styles[app.status]}`}>
                                {app.status}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionRow}>
                                {/* Central Admin Approvals */}
                                {adminUser?.role === 'admin' && app.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleApprove(app.id)} className={styles.checkBtn} title="Approve"><FaCheckCircle /></button>
                                    <button onClick={() => handleReject(app.id)} className={styles.crossBtn} title="Reject"><FaTimes /></button>
                                  </>
                                )}

                                {!!app.cancellation_requested && !app.cancelled && (
                                  <div className={styles.cancellationWorkflow}>
                                    <div className={styles.workflowTitle}>Cancellation Request</div>
                                    <div className={styles.workflowSteps}>
                                      <div className={`${styles.step} ${app.hod_approval === 'approved' ? styles.stepDone : ''}`} title="HOD Approval">
                                        {app.hod_approval === 'approved' ? '✅' : '⌛'} HOD
                                      </div>
                                      <div className={styles.stepArrow}>→</div>
                                      <div className={`${styles.step} ${app.admin_approval === 'approved' ? styles.stepDone : ''}`} title="Admin Approval">
                                        {app.admin_approval === 'approved' ? '✅' : '⌛'} ADMIN
                                      </div>
                                      <div className={styles.stepArrow}>→</div>
                                      <div className={`${styles.step} ${app.principal_approval === 'approved' ? styles.stepDone : ''}`} title="Principal Final Approval">
                                        {app.principal_approval === 'approved' ? '✅' : '⌛'} PRIN
                                      </div>
                                    </div>

                                    {/* Final Action for Admin (Now middle step) */}
                                    {adminUser?.role === 'admin' && app.hod_approval === 'approved' && app.admin_approval === 'pending' && (
                                      <div className={styles.btnGroup}>
                                        <button
                                          onClick={() => handleAdminApprove(app.id)}
                                          className={styles.finalApproveBtn}
                                        >
                                          <FaCheckCircle /> Sign & Forward to Principal
                                        </button>
                                        <button
                                          onClick={() => handleAdminDecline(app.id)}
                                          className={styles.declineBtn}
                                        >
                                          &times; Decline Request
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {adminUser?.role === 'admin' && !app.cancellation_requested && (
                                  <>
                                    <button onClick={() => handleEditApplication(app)} className={styles.editBtn} title="Edit"><FaEdit /></button>
                                    <button onClick={() => handleDelete(app.id)} className={styles.trashBtn} title="Delete"><FaTrash /></button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'buses' && (
              <motion.div key="buses" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.panelHeader}>
                  <button onClick={() => { setEditingBus(null); setBusForm({ bus_number: '', route: '', from: '', to: '', capacity: '', driver_name: '', driver_mobile: '', is_active: true }); setShowBusModal(true); }} className={styles.addBtn}>
                    <FaPlus /> Assign New Bus
                  </button>
                </div>

                <div className={styles.gridContainer}>
                  {busRoutes.map(bus => {
                    const CAPACITY = bus.capacity ? Number(bus.capacity) : 60;
                    const enrolled = busSeatCounts[bus.bus_number] || 0;
                    const remaining = Math.max(0, CAPACITY - enrolled);
                    const pct = (enrolled / CAPACITY) * 100;
                    const seatStatus = remaining === 0 ? 'full' : pct >= 80 ? 'nearFull' : 'available';
                    const seatColor = remaining === 0 ? '#ef4444' : pct >= 80 ? '#f97316' : '#22c55e';
                    const seatBg = remaining === 0 ? '#fef2f2' : pct >= 80 ? '#fff7ed' : '#f0fdf4';
                    return (
                    <div key={bus.id} className={styles.feeCard}>
                      <div className={styles.feeHeader}>
                        <div className={styles.feeIcon}><FaBus /></div>
                        <div className={styles.feeRoute}>
                          <h4>Bus {bus.bus_number}</h4>
                          <p>{bus.route}</p>
                        </div>
                        {/* Seat Alert Badge */}
                        <div style={{
                          marginLeft: 'auto',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background: seatBg,
                          border: `2px solid ${seatColor}`,
                          color: seatColor,
                          fontWeight: '700',
                          fontSize: '0.78rem',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          minWidth: '80px'
                        }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>{remaining}</span>
                          <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>SEATS LEFT</span>
                          <span style={{ fontSize: '0.65rem' }}>{enrolled}/{CAPACITY} filled</span>
                        </div>
                      </div>
                      <div className={styles.feeBody}>
                        <div className={styles.busDetails}>
                          {bus.from && bus.to && <p><strong>Route:</strong> {bus.from} → {bus.to}</p>}
                          {bus.capacity && <p><strong>Capacity:</strong> {bus.capacity} seats</p>}
                          {bus.driver_name && <p><strong>Driver:</strong> {bus.driver_name}</p>}
                          {bus.driver_mobile && <p><strong>Contact:</strong> {bus.driver_mobile}</p>}
                          <p><strong>Status:</strong> <span className={bus.is_active ? styles.activeStatus : styles.inactiveStatus}>{bus.is_active ? 'Active' : 'Inactive'}</span></p>
                          {remaining === 0 && (
                            <p style={{ color: '#ef4444', fontWeight: '700', marginTop: '6px', fontSize: '0.85rem' }}>
                              ⚠️ BUS IS FULL — No seats available!
                            </p>
                          )}
                          {remaining > 0 && pct >= 80 && (
                            <p style={{ color: '#f97316', fontWeight: '600', marginTop: '6px', fontSize: '0.85rem' }}>
                              ⚠️ Almost full — only {remaining} seats left!
                            </p>
                          )}
                        </div>
                      </div>
                      <div className={styles.feeActions}>
                        <button onClick={() => handleEditBus(bus)} className={styles.editBtn}><FaEdit /> Edit</button>
                        <button onClick={() => handleDeleteBus(bus.id)} className={styles.delBtn}><FaTrash /></button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activeTab === 'fees' && (
              <motion.div key="fees" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.panelHeader}>
                  <button onClick={() => { setEditingFee(null); setShowFeeModal(true); }} className={styles.addBtn}>
                    <FaPlus /> Configure New Route
                  </button>
                </div>

                <div className={styles.gridContainer}>
                  {routeFees.map(fee => (
                    <div key={fee.id} className={styles.feeCard}>
                      <div className={styles.feeHeader}>
                        <div className={styles.feeIcon}><FaBus /></div>
                        <div className={styles.feeRoute}>
                          <h4>{fee.from} → {fee.to}</h4>
                          <p>{fee.address}</p>
                        </div>
                      </div>
                      <div className={styles.feeBody}>
                        <div className={styles.feeAmount}>₹{fee.fee_amount}</div>
                        <p>{fee.description || 'No description provided'}</p>
                      </div>
                      <div className={styles.feeActions}>
                        <button onClick={() => handleEditFee(fee)} className={styles.editBtn}><FaEdit /> Edit</button>
                        <button onClick={() => handleDeleteFee(fee.id)} className={styles.delBtn}><FaTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div key="payments" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.tableCard}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.modernTable}>
                      <thead>
                        <tr>
                          <th>Registration No</th>
                          <th>Payment ID</th>
                          <th>Amount</th>
                          <th>Date</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentDetails.map((payment, index) => (
                          <tr key={index}>
                            <td className={styles.boldText}>{payment.regNo}</td>
                            <td className={styles.monoText}>{payment.payment_id}</td>
                            <td className={styles.boldText}>₹{payment.fee_amount || payment.payment_amount || 'N/A'}</td>
                            <td>{new Date(payment.payment_date).toLocaleString()}</td>
                            <td>
                              <div className={styles.flexCol}>
                                <span className={`${styles.statusPill} ${styles.approved}`} style={{ marginBottom: '4px' }}>
                                  {payment.payment_status === 'verified' ? 'Verified' : 'Paid'}
                                </span>
                                <span className={`${styles.statusPill} ${styles[payment.status] || ''}`}>
                                  App: {payment.status}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div className={styles.actionRow}>
                                {payment.payment_status !== 'verified' && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePaymentPass(payment.id)}
                                      className={styles.approvePassBtn}
                                      title="Verify Payment & Generate Pass"
                                    >
                                      <FaCheckCircle /> Verify Payment
                                    </button>
                                    <button
                                      onClick={() => initiateRejectPaymentPass(payment.id)}
                                      className={styles.rejectPassBtn}
                                      title="Reject Application"
                                    >
                                      <FaTimes /> Reject
                                    </button>
                                  </>
                                )}
                                {payment.payment_status === 'verified' && (
                                  <span className={styles.successText}>Pass Generated</span>
                                )}
                                {payment.status === 'rejected' && payment.rejection_reason && (
                                  <span className={styles.errorText} title={payment.rejection_reason}>
                                    Rejected: {payment.rejection_reason?.substring(0, 15)}...
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'announcements' && (
              <motion.div key="announcements" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.panelHeader}>
                  <button onClick={() => setShowNotificationModal(true)} className={styles.addBtn}>
                    <FaPlus /> Post Announcement
                  </button>
                </div>

                <div className={styles.tableCard}>
                  <div className={styles.tableWrapper}>
                    <table className={styles.modernTable}>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Announcement Title</th>
                          <th>Target Role</th>
                          <th>Date Posted</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notifications.map(n => (
                          <tr key={n.id}>
                            <td>
                              <span className={`${styles.statusPill} ${styles[n.type] || styles.pending}`}>
                                {n.type.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <div className={styles.profInfo}>
                                <span className={styles.profName}>{n.title}</span>
                                <span className={styles.idVal}>{n.message.substring(0, 50)}...</span>
                              </div>
                            </td>
                            <td><span className={styles.courseVal}>{n.target_role.toUpperCase()}</span></td>
                            <td>{new Date(n.created_at).toLocaleDateString()}</td>
                            <td>
                              <button onClick={() => handleDeleteNotification(n.id)} className={styles.trashBtn}><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" variants={containerVariants} initial="hidden" animate="visible" exit="hidden">
                <div className={styles.settingsGrid}>
                  <div className={styles.settingCard}>
                    <div className={styles.settingInfo}>
                      <h3>Cancellation Period Control</h3>
                      <p>Enable or disable the pass cancellation feature for students institution-wide.</p>
                    </div>
                    <div className={styles.settingAction}>
                      <label className={styles.switch}>
                        <input 
                          type="checkbox" 
                          checked={systemSettings.cancellations_enabled === '1'} 
                          onChange={() => handleToggleSetting('cancellations_enabled', systemSettings.cancellations_enabled)}
                        />
                        <span className={styles.slider}></span>
                      </label>
                      <span className={styles.statusLabel}>
                        {systemSettings.cancellations_enabled === '1' ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showFeeModal && (
          <div className={styles.modalOverlay} onClick={() => setShowFeeModal(false)}>
            <motion.div className={styles.modalPanel} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>{editingFee ? 'Modify Route' : 'New Route Configuration'}</h3>
                <button onClick={() => setShowFeeModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Origin (Common for all)</label>
                  <input 
                    type="text" 
                    value={feeForm.from} 
                    readOnly 
                    className={styles.readOnlyInput || styles.input} 
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Destination (To)</label>
                  <LocationAutocomplete
                    name="to"
                    value={feeForm.to}
                    onChange={e => setFeeForm({ ...feeForm, to: e.target.value })}
                    placeholder="Enter destination town/city"
                    icon={null}
                    inputClassName={styles.input}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Fee Amount (₹)</label>
                  <input type="number" value={feeForm.fee_amount} onChange={e => setFeeForm({ ...feeForm, fee_amount: e.target.value })} placeholder="15000" className={styles.input} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Address / Via (optional)</label>
                  <input type="text" value={feeForm.address || ''} onChange={e => setFeeForm({ ...feeForm, address: e.target.value })} placeholder="e.g. via NH45" className={styles.input} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Description</label>
                  <textarea value={feeForm.description} onChange={e => setFeeForm({ ...feeForm, description: e.target.value })} placeholder="Optional details..." />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={handleSaveFee} className={styles.saveBtn}>Save Configuration</button>
              </div>
            </motion.div>
          </div>
        )}

        {showBusModal && (
          <div className={styles.modalOverlay} onClick={() => setShowBusModal(false)}>
            <motion.div className={styles.busModalPanel} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>{editingBus ? 'Modify Bus Assignment' : 'New Bus Assignment'}</h3>
                <button onClick={() => setShowBusModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
              </div>
              <div className={styles.busModalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Bus Number</label>
                    <input type="text" value={busForm.bus_number} onChange={e => setBusForm({ ...busForm, bus_number: e.target.value })} placeholder="e.g. B-101" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Capacity (seats)</label>
                    <input type="number" value={busForm.capacity} onChange={e => setBusForm({ ...busForm, capacity: e.target.value })} placeholder="e.g. 50" />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Select Pre-configured Route</label>
                  <select
                    className={styles.modalSelect}
                    value={busForm.route}
                    onChange={e => {
                      const selectedFee = routeFees.find(fee => fee.route === e.target.value);
                      if (selectedFee) {
                        setBusForm({
                          ...busForm,
                          route: selectedFee.route,
                          from: selectedFee.from,
                          to: selectedFee.to
                        });
                      } else {
                        setBusForm({ ...busForm, route: e.target.value });
                      }
                    }}
                  >
                    <option value="">-- Choose a Route --</option>
                    {routeFees.map(fee => (
                      <option key={fee.id} value={fee.route}>
                        {fee.route} ({fee.from} → {fee.to})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Route (Combined Name)</label>
                  <input type="text" value={busForm.route} readOnly placeholder="Select from dropdown above" />
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>From (Origin)</label>
                    <input type="text" value={busForm.from} readOnly placeholder="Auto-filled" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>To (Destination)</label>
                    <input type="text" value={busForm.to} readOnly placeholder="Auto-filled" />
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Driver Name</label>
                    <input type="text" value={busForm.driver_name} onChange={e => setBusForm({ ...busForm, driver_name: e.target.value })} placeholder="Driver name" />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Driver Mobile</label>
                    <input type="tel" value={busForm.driver_mobile} onChange={e => setBusForm({ ...busForm, driver_mobile: e.target.value })} placeholder="10-digit mobile" />
                  </div>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={busForm.is_active} onChange={e => setBusForm({ ...busForm, is_active: e.target.checked })} />
                    <span>Active</span>
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={handleSaveBus} className={styles.saveBtn}>Save Bus Assignment</button>
              </div>
            </motion.div>
          </div>
        )}

        {showNotificationModal && (
          <div className={styles.modalOverlay} onClick={() => setShowNotificationModal(false)}>
            <motion.div className={styles.modalPanel} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Post New Announcement</h3>
                <button onClick={() => setShowNotificationModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <label>Title</label>
                  <input type="text" value={notiForm.title} onChange={e => setNotiForm({ ...notiForm, title: e.target.value })} placeholder="e.g. System Maintenance" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Message</label>
                  <textarea value={notiForm.message} onChange={e => setNotiForm({ ...notiForm, message: e.target.value })} placeholder="Write your announcement message here..." style={{ height: '100px', paddingTop: '10px' }} />
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Alert Type</label>
                    <select className={styles.modalSelect} value={notiForm.type} onChange={e => setNotiForm({ ...notiForm, type: e.target.value })}>
                      <option value="announcement">Normal Announcement</option>
                      <option value="important">Important Board</option>
                      <option value="alert">Critical Alert</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Target Audience</label>
                    <select className={styles.modalSelect} value={notiForm.target_role} onChange={e => setNotiForm({ ...notiForm, target_role: e.target.value })}>
                      <option value="all">Everyone</option>
                      <option value="student">Students Only</option>
                      <option value="hod">HODs Only</option>
                      <option value="principal">Principal Only</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={handleSaveNotification} className={styles.saveBtn}>Publish Announcement</button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedImage && (
          <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
            <motion.div className={styles.imageBox} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
              <div className={styles.imageHead}>
                <span>{selectedImage.title}</span>
                <button onClick={() => setSelectedImage(null)}><FaTimes /></button>
              </div>
              <img src={getImageUrl(selectedImage.url)} alt="Full Preview" className={styles.fullImg} />
            </motion.div>
          </div>
        )}

        {showRejectModal && (
          <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
            <motion.div className={styles.modalPanel} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Reject Application</h3>
                <button onClick={() => setShowRejectModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.inputGroup}>
                  <p>Please enter the reason for rejection. This will be shown to the student.</p>
                  <label>Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="e.g. Invalid transaction ID, Incorrect amount paid, etc."
                    rows={4}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  onClick={handleConfirmRejectPaymentPass}
                  className={styles.declineBtn}
                  disabled={!rejectionReason.trim()}
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && (
          <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
            <motion.div className={styles.modalPanel} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className={styles.modalHeader}>
                <h3>Edit Student Application</h3>
                <button onClick={() => setShowEditModal(false)} className={styles.closeModalBtn}><FaTimes /></button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Full Name</label>
                    <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Registration Number</label>
                    <input type="text" value={editForm.regNo} onChange={e => setEditForm({ ...editForm, regNo: e.target.value })} />
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Department</label>
                    <select className={styles.modalSelect} value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}>
                      <option value="CSE">CSE</option>
                      <option value="EEE">EEE</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Year</label>
                    <select className={styles.modalSelect} value={editForm.year} onChange={e => setEditForm({ ...editForm, year: e.target.value })}>
                      <option value="I">I Year</option>
                      <option value="II">II Year</option>
                      <option value="III">III Year</option>
                      <option value="IV">IV Year</option>
                      <option value="V">V Year</option>
                    </select>
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Mobile</label>
                    <input type="tel" value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Fee Amount (₹)</label>
                    <input type="number" value={editForm.fee_amount || ''} onChange={e => setEditForm({ ...editForm, fee_amount: e.target.value })} placeholder="e.g. 15000" />
                  </div>
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Bus Number</label>
                    <input type="text" value={editForm.busNumber} onChange={e => setEditForm({ ...editForm, busNumber: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label>Route</label>
                    <input type="text" value={editForm.route} onChange={e => setEditForm({ ...editForm, route: e.target.value })} />
                  </div>
                </div>
                <div className={styles.inputGroup}>
                  <label>Residential Address</label>
                  <textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} rows={2} />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button onClick={handleSaveApplication} className={styles.saveBtn}>Update Application</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminDashboard;