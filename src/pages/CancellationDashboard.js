import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, } from 'framer-motion';
import NotificationAlert from '../components/NotificationAlert';
import {

    FaHome,
    FaSignOutAlt,
    FaSpinner,
    FaCheckCircle,
    FaInfoCircle,
    FaUser,
    FaExchangeAlt,
    FaClipboardList
} from 'react-icons/fa';
import {

    hodApproveCancellation,
    hodDeclineCancellation,
    principalApproveCancellation,
    principalDeclineCancellation,
    getApplications
} from '../utils/api';
import { getImageUrl } from '../config';
import styles from './CancellationDashboard.module.css';

/**
 * CancellationDashboard - Dedicated portal for HOD and Principal 
 * specifically for processing student bus pass cancellations.
 */
function CancellationDashboard() {
    const [requests, setRequests] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [adminUser, setAdminUser] = useState(null);
    const navigate = useNavigate();

    const fetchRequests = React.useCallback(async () => {
        if (!adminUser) return;
        setLoading(true);
        try {
            // Fetch only applications with cancellation requested
            // For HOD, we further filter by department in the backend if role is 'hod'
            const data = await getApplications({
                role: adminUser.role,
                department: adminUser.department || ''
            });

            // Filter only those where cancellation_requested is true/1
            const cancellationRequests = data.filter(app => !!app.cancellation_requested && !app.cancelled);
            setRequests(cancellationRequests);
        } catch (err) {
            setError('Could not pull cancellation requests');
        } finally {
            setLoading(false);
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
            // This dashboard is only for HOD and Principal
            if (user.role !== 'hod' && user.role !== 'principal') {
                navigate('/admin/dashboard');
                return;
            }
            setAdminUser(user);
        } catch (e) {
            navigate('/admin');
        }
    }, [navigate]);

    useEffect(() => {
        if (adminUser) {
            fetchRequests();
        }
    }, [adminUser, fetchRequests]);

    const handleHodApprove = async (id) => {
        try {
            await hodApproveCancellation(id);
            setSuccessMessage('HOD approval recorded. Forwarded to Admin.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'HOD approval failed');
        }
    };

    const handleHodDecline = async (id) => {
        if (!window.confirm('Are you sure you want to decline this cancellation request?')) return;
        try {
            await hodDeclineCancellation(id);
            setSuccessMessage('Cancellation request declined by HOD.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'HOD decline failed');
        }
    };

    const handlePrincipalApprove = async (id) => {
        try {
            await principalApproveCancellation(id);
            setSuccessMessage('Principal approved. Pass cancelled successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'Principal approval failed');
        }
    };

    const handlePrincipalDecline = async (id) => {
        if (!window.confirm('Are you sure you want to decline this cancellation request?')) return;
        try {
            await principalDeclineCancellation(id);
            setSuccessMessage('Cancellation request declined by Principal.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchRequests();
        } catch (err) {
            setError(err.message || 'Principal decline failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <div className={styles.dashboardContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logoBox}>CP</div>
                    <span className={styles.logoLabel}>CANCELLATION PORTAL</span>
                </div>

                <div className={styles.navMenu}>
                    <button className={`${styles.navItem} ${styles.navActive}`}>
                        <FaClipboardList /> Requests
                    </button>
                </div>

                <div className={styles.sidebarFooter}>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <FaSignOutAlt /> Sign Out
                    </button>
                </div>
            </aside>

            <main className={styles.mainArea}>
                <NotificationAlert role={adminUser?.role} />
                <header className={styles.topHeader}>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.pageTitle}>Cancellation Approval</h1>
                        <p className={styles.pageSubtitle}>
                            {adminUser ? `${adminUser.name} (${adminUser.role.toUpperCase()}${adminUser.department ? ' - ' + adminUser.department : ''})` : 'Verification Portal'}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button onClick={() => navigate('/')} className={styles.navLink}>
                            <FaHome /> <span>Home</span>
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
                        <div className={styles.successBanner}>
                            <FaCheckCircle /> {successMessage}
                        </div>
                    )}

                    <motion.div variants={containerVariants} initial="hidden" animate="visible">
                        <div className={styles.tableCard}>
                            <div className={styles.tableWrapper}>
                                <table className={styles.modernTable}>
                                    <thead>
                                        <tr>
                                            <th>Student Details</th>
                                            <th>Reason for Cancellation</th>
                                            <th>Approval Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4" className={styles.centerTd}><FaSpinner className={styles.spin} /> Loading...</td></tr>
                                        ) : requests.length === 0 ? (
                                            <tr><td colSpan="4" className={styles.centerTd}>No pending cancellation requests.</td></tr>
                                        ) : requests.map(app => (
                                            <tr key={app.id}>
                                                <td>
                                                    <div className={styles.studentProf}>
                                                        {app.photo ? (
                                                            <img
                                                                src={getImageUrl(app.photo)}
                                                                alt={app.name}
                                                                className={styles.miniAvatar}
                                                                onError={(e) => { e.target.src = '/placeholder-profile.png'; }}
                                                            />
                                                        ) : <div className={styles.avatarVoid}><FaUser /></div>}
                                                        <div className={styles.profInfo}>
                                                            <span className={styles.profName}>{app.name}</span>
                                                            <span className={styles.idVal}>{app.regNo}</span>
                                                            <span className={styles.courseVal}>{app.department} / {app.year}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.reasonBox}>
                                                        {app.cancellation_reason || 'No reason provided'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.cancellationStatus}>
                                                        <span>{app.hod_approval === 'pending' ? '⌛ HOD' : '✅ HOD'}</span>
                                                        <FaExchangeAlt className={styles.statusIcon} />
                                                        <span>{app.admin_approval === 'pending' ? '⌛ ADMIN' : '✅ ADMIN'}</span>
                                                        <FaExchangeAlt className={styles.statusIcon} />
                                                        <span>{app.principal_approval === 'pending' ? '⌛ PRIN' : '✅ PRIN'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.actionRow}>
                                                        {adminUser?.role === 'hod' && app.hod_approval === 'pending' && (
                                                            <div className={styles.btnGroup}>
                                                                <button
                                                                    onClick={() => handleHodApprove(app.id)}
                                                                    className={styles.checkBtn}
                                                                >
                                                                    <FaCheckCircle /> Sign & Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleHodDecline(app.id)}
                                                                    className={styles.declineBtn}
                                                                >
                                                                    &times; Decline
                                                                </button>
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && app.admin_approval === 'approved' && app.principal_approval === 'pending' && (
                                                            <div className={styles.btnGroup}>
                                                                <button
                                                                    onClick={() => handlePrincipalApprove(app.id)}
                                                                    className={styles.checkBtn}
                                                                >
                                                                    <FaCheckCircle /> Principal Final Signature
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePrincipalDecline(app.id)}
                                                                    className={styles.declineBtn}
                                                                >
                                                                    &times; Decline
                                                                </button>
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'hod' && app.hod_approval === 'approved' && (
                                                            <div className={styles.processedBadge}>
                                                                <FaCheckCircle /> Processed
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && app.principal_approval === 'approved' && (
                                                            <div className={styles.processedBadge}>
                                                                <FaCheckCircle /> Processed
                                                            </div>
                                                        )}

                                                        {adminUser?.role === 'principal' && app.admin_approval === 'pending' && (
                                                            <div className={styles.awaitingBadge}>
                                                                Awaiting Admin
                                                            </div>
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
                </section>
            </main>
        </div>
    );
}

export default CancellationDashboard;
