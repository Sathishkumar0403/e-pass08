import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ExcelJS from 'exceljs';
const router = express.Router();

// Middleware to check if user is admin (simplified for demo)
const isAdmin = (req, res, next) => {
  // In a real app, verify JWT token or session
  next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dummy admin login (replace with real auth in production)
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
  // Use a strong password for admin
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'Admin@demo';
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      res.json({ 
        message: 'Login successful',
        user: { username: ADMIN_USERNAME, role: 'admin' }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  // Get all student applications
router.get('/applications', async (req, res) => {
  try {
    const db = req.db;
    const apps = await db.all('SELECT * FROM student_applications ORDER BY id DESC');
    
    // Add full URLs to image paths
    const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
    const appsWithUrls = apps.map(app => ({
      ...app,
      photo: app.photo ? `${baseUrl}${app.photo}` : null,
      aadharPhoto: app.aadharPhoto ? `${baseUrl}${app.aadharPhoto}` : null,
      collegeIdPhoto: app.collegeIdPhoto ? `${baseUrl}${app.collegeIdPhoto}` : null,
      feesBillPhoto: app.feesBillPhoto ? `${baseUrl}${app.feesBillPhoto}` : null
    }));
    
    res.json(appsWithUrls);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});// Approve application
router.post('/approve/:id', async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid application ID is required' });
    }
    
    // Fetch application details
    const app = await db.get('SELECT * FROM student_applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (app.status !== 'pending') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }
    
    // Generate Pass Number
    const currentYear = new Date().getFullYear();
    const paddedId = String(id).padStart(4, '0');
    const passNumber = `PASS-${currentYear}-${paddedId}`;

    // Assign Bus Number based on route
    const routeToBusMap = {
      'Hosur to Krishnagiri': 'B-12',
      'ACE TO PANCHAKSHIPURAM': 'B-07',
    };
    const busNumber = routeToBusMap[app.route] || 'B-01'; // Default bus

    // Generate QR data with URL to visual bus pass
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const qrData = JSON.stringify({
      name: app.name,
      regNo: app.regNo,
      route: app.route,
      validity: app.validity,
      passNumber: passNumber,
      busNumber: busNumber,
      approvedAt: new Date().toISOString(),
      passUrl: `${baseUrl}/pass/${app.regNo}`
    });
    
    await db.run(
      'UPDATE student_applications SET status = ?, qrData = ?, passNumber = ?, busNumber = ? WHERE id = ?', 
      ['approved', qrData, passNumber, busNumber, id]
    );
    
    res.json({ 
      message: 'Application approved successfully', 
      qrData,
      passNumber,
      busNumber,
      applicationId: id
    });
  } catch (err) {
    console.error('Error approving application:', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject application
router.post('/reject/:id', async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid application ID is required' });
    }
    
    // Check if application exists and is pending
    const app = await db.get('SELECT * FROM student_applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    if (app.status !== 'pending') {
      return res.status(400).json({ error: 'Application is not pending approval' });
    }
    
    await db.run(
      'UPDATE student_applications SET status = ? WHERE id = ?', 
      ['rejected', id]
    );
    
    res.json({ 
      message: 'Application rejected successfully',
      applicationId: id
    });
  } catch (err) {
    console.error('Error rejecting application:', err);
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Delete application
router.delete('/delete/:id', async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid application ID is required' });
    }
    
    // Check if application exists
    const app = await db.get('SELECT * FROM student_applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Delete the application
    await db.run('DELETE FROM student_applications WHERE id = ?', [id]);
    
    res.json({ 
      message: 'Application deleted successfully',
      applicationId: id
    });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// Get image by filename
router.get('/image/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '..', 'uploads', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.sendFile(imagePath);
  } catch (err) {
    console.error('Error serving image:', err);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Export student applications to Excel
router.get('/export-excel', async (req, res) => {
  try {
    const db = req.db;
    const apps = await db.all('SELECT * FROM student_applications ORDER BY id DESC');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Applications');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Registration No', key: 'regNo', width: 20 },
      { header: 'Branch & Year', key: 'branchYear', width: 20 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Parent Mobile', key: 'parentMobile', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Route', key: 'route', width: 30 },
      { header: 'Validity', key: 'validity', width: 15 },
      { header: 'Aadhar Number', key: 'aadharNumber', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Add rows from the database
    apps.forEach(app => {
      worksheet.addRow(app);
    });

    // Set response headers for Excel download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'student_applications.xlsx'
    );

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Error exporting to Excel:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// =============================
// Cancellation Requests (Admin)
// =============================
router.get('/cancellation-requests', async (req, res) => {
  try {
    const db = req.db;
    const requests = await db.all(`
      SELECT 
        id,
        name,
        regNo,
        route,
        validity,
        status,
        cancellation_requested as cancellationRequested,
        cancellation_reason as cancellationReason,
        cancellation_requested_at as cancellationRequestedAt,
        cancelled as isCancelled,
        cancelled_at as cancelledAt,
        cancelled_by as cancelledBy
      FROM student_applications
      WHERE cancellation_requested = 1 AND (cancelled IS NULL OR cancelled = 0)
      ORDER BY cancellation_requested_at DESC NULLS LAST, id DESC
    `);

    res.json(requests);
  } catch (err) {
    console.error('Error fetching cancellation requests:', err);
    res.status(500).json({ error: 'Failed to fetch cancellation requests' });
  }
});

router.post('/process-cancellation/:id', async (req, res) => {
  let db;
  try {
    db = req.db;
    const { id } = req.params;
    const { action, adminUsername } = req.body || {};

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Valid application ID is required' });
    }
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    const app = await db.get('SELECT * FROM student_applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (!app.cancellation_requested) {
      return res.status(400).json({ error: 'No pending cancellation request for this application' });
    }

    await db.run('BEGIN IMMEDIATE');

    if (action === 'approve') {
      await db.run(
        `UPDATE student_applications SET 
           cancelled = 1,
           cancelled_at = CURRENT_TIMESTAMP,
           cancelled_by = ?,
           cancellation_requested = 0,
           updatedAt = CURRENT_TIMESTAMP,
           status = 'cancelled'
         WHERE id = ?`,
        [adminUsername || 'admin', id]
      );
    } else {
      // reject: simply clear the request flags
      await db.run(
        `UPDATE student_applications SET 
           cancellation_requested = 0,
           updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
      );
    }

    await db.run('COMMIT');

    res.json({ 
      message: action === 'approve' ? 'Cancellation approved' : 'Cancellation rejected',
      id: Number(id),
      action
    });
  } catch (err) {
    try { if (db) await db.run('ROLLBACK'); } catch {}
    console.error('Error processing cancellation request:', err);
    res.status(500).json({ error: 'Failed to process cancellation request' });
  }
});

export default router;