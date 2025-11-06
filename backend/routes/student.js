
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// Resolve module directory early for path usage below
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection configuration
const dbConfig = {
  // Use the backend-local SQLite file to match app.js
  filename: path.join(__dirname, '..', 'buspass.sqlite'),
  driver: sqlite3.Database
};

// Log the database file path for debugging
console.log('Database path:', dbConfig.filename);

// Check if database file exists
if (!fs.existsSync(dbConfig.filename)) {
  console.error('Database file not found at:', dbConfig.filename);
  // Create the database directory if it doesn't exist
  const dbDir = path.dirname(dbConfig.filename);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log('Created database directory:', dbDir);
  console.error('Please run the database initialization script first!');
  process.exit(1);
}

// Helper function to get database connection
async function getDb() {
  try {
    return await open({
      ...dbConfig,
      mode: sqlite3.OPEN_READWRITE
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw new Error('Database connection failed');
  }
}

router.post("/request-cancellation", async (req, res) => {
  let db;
  try {
    console.log('Received cancellation request:', req.body);

    const { regNo, reason } = req.body || {};
    if (!regNo) {
      return res.status(400).json({
        error: "Registration number is required",
        receivedData: req.body
      });
    }

    // Connect to DB
    try {
      db = await getDb();
      console.log('Database connection established');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({
        error: "Failed to connect to database",
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // Use a transaction for consistency
    await db.run('BEGIN IMMEDIATE');

    // Fetch student
    const student = await db.get(
      `SELECT 
        id,
        status,
        cancelled,
        cancellation_requested,
        cancellation_reason,
        cancellation_requested_at,
        cancelled_at
       FROM student_applications WHERE regNo = ?`,
      [regNo]
    );

    if (!student) {
      await db.run('ROLLBACK');
      return res.status(404).json({
        error: `Student with registration number ${regNo} not found`,
        regNo
      });
    }

    if (student.status !== 'approved') {
      await db.run('ROLLBACK');
      return res.status(400).json({
        error: "Only approved passes can be cancelled",
        currentStatus: student.status
      });
    }

    if (student.cancelled) {
      await db.run('ROLLBACK');
      return res.status(400).json({
        error: "Pass is already cancelled",
        cancelledAt: student.cancelled_at
      });
    }

    if (student.cancellation_requested) {
      await db.run('ROLLBACK');
      return res.status(400).json({
        error: "Cancellation already requested",
        requestedAt: student.cancellation_requested_at
      });
    }

    // Perform update
    const result = await db.run(
      `UPDATE student_applications SET
         cancellation_requested = 1,
         cancellation_reason = ?,
         cancellation_requested_at = CURRENT_TIMESTAMP,
         updatedAt = CURRENT_TIMESTAMP
       WHERE regNo = ?`,
      [reason || 'No reason provided', regNo]
    );

    if (result.changes === 0) {
      await db.run('ROLLBACK');
      return res.status(500).json({ error: "No records were updated" });
    }

    await db.run('COMMIT');

    return res.json({
      message: "Cancellation request submitted successfully",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    try {
      if (db) await db.run('ROLLBACK');
    } catch {}
    console.error("Error in request-cancellation:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
      regNo: req.body?.regNo
    });
    return res.status(500).json({
      error: "Failed to process cancellation request",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (db) await db.close();
  }
});

// =============================
// Check cancellation status
// =============================
router.get("/cancellation-status/:regNo", async (req, res) => {
  let db;
  try {
    const { regNo } = req.params;
    console.log('Checking cancellation status for:', regNo);

    if (!regNo) {
      return res.status(400).json({ 
        error: "Registration number is required",
        receivedParams: req.params
      });
    }

    // Get database connection
    db = await getDb();
    
    // Check if the student exists and get cancellation status
    const result = await db.get(
      `SELECT 
        cancellation_requested as cancellationRequested,
        cancellation_reason as cancellationReason,
        cancelled as isCancelled,
        cancelled_at as cancelledAt,
        cancelled_by as cancelledBy
      FROM student_applications 
      WHERE regNo = ?`,
      [regNo]
    );

    console.log('Cancellation status result:', result);

    if (!result) {
      return res.status(404).json({ 
        error: "Student not found",
        regNo
      });
    }

    res.json({
      success: true,
      cancellationRequested: !!result.cancellationRequested,
      cancellationReason: result.cancellationReason || null,
      isCancelled: !!result.isCancelled,
      cancelledAt: result.cancelledAt || null,
      cancelledBy: result.cancelledBy || null
    });
  } catch (err) {
    console.error("Error in cancellation-status endpoint:", {
      message: err.message,
      stack: err.stack,
      params: req.params
    });
    
    res.status(500).json({ 
      error: "Failed to check cancellation status",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    // Close the database connection
    if (db) {
      try {
        await db.close();
      } catch (closeErr) {
        console.error('Error closing database connection:', closeErr);
      }
    }
  }
});

// =============================
// Get student details by regNo (for verification)
// =============================
router.get("/details/:regNo", async (req, res) => {
  try {
    const db = req.db;
    const { regNo } = req.params;
    if (!regNo) {
      return res.status(400).json({ error: "Registration number required" });
    }
    const student = await db.get(
      "SELECT name, regNo, route, validity, photo FROM student_applications WHERE regNo = ?",
      [regNo]
    );
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    // Map validity to 'Valid Till' format if needed
    student.validTill = student.validity;
    delete student.validity;
    res.json(student);
  } catch (err) {
    console.error("Error fetching student details:", err);
    res.status(500).json({ error: "Failed to fetch student details" });
  }
});

// =============================
// Get bus pass data by regNo (for visual display)
// =============================
router.get("/pass/:regNo", async (req, res) => {
  try {
    const db = req.db;
    const { regNo } = req.params;
    if (!regNo) {
      return res.status(400).json({ error: "Registration number required" });
    }
    const student = await db.get(
      "SELECT name, regNo, route, validity, photo, qrData, branchYear, dob, mobile, college, busNo, userType, passNo FROM student_applications WHERE regNo = ? AND status = 'approved'",
      [regNo]
    );
    if (!student) {
      return res.status(404).json({ error: "Student not found or not approved" });
    }
    
    // Parse QR data if available
    let qrData = null;
    
    if (student.qrData) {
      try {
        qrData = JSON.parse(student.qrData);
      } catch (e) {
        console.error("Error parsing QR data:", e);
      }
    }
    
    // Return formatted data for bus pass display
    const passData = {
      name: student.name,
      regNo: student.regNo,
      route: student.route,
      validity: student.validity,
      validTill: student.validity,
      photo: student.photo,
      branchYear: student.branchYear,
      dob: student.dob,
      mobile: student.mobile,
      college: student.college || '',
      busNo: student.busNo || '',
      userType: student.userType || 'student',
      passNo: student.passNo || '',
      qrData: qrData
    };
    
    res.json(passData);
  } catch (err) {
    console.error("Error fetching bus pass data:", err);
    res.status(500).json({ error: "Failed to fetch bus pass data" });
  }
});

// (moved __filename/__dirname definition to the top)

// =============================
// Ensure uploads directory exists
// =============================
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =============================
// Multer setup
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// =============================
// Apply for bus pass
// =============================
router.post(
  "/apply",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "aadharPhoto", maxCount: 1 },
    { name: "collegeIdPhoto", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Check DB connection
      if (!req.db) {
        console.error("Database connection not available");
        return res
          .status(500)
          .json({ error: "Database connection failed" });
      }

      const db = req.db;
      const {
        name,
        dob,
        regNo,
        branchYear,
        mobile,
        parentMobile,
        address,
        route,
        validity,
        aadharNumber,
        college,    // NEW
        busNo,      // NEW (from dropdown)
        userType    // NEW (student/staff, toggle)
      } = req.body;

      // Validate required fields
      if (
        !name ||
        !dob ||
        !regNo ||
        !branchYear ||
        !mobile ||
        !parentMobile ||
        !address ||
        !route ||
        !validity
      ) {
        return res
          .status(400)
          .json({ error: "All required fields must be provided" });
      }

      // Validate mobile numbers
      const mobileRegex = /^[6-9]\d{9}$/;
      if (
        !mobileRegex.test(mobile) ||
        !mobileRegex.test(parentMobile)
      ) {
        return res
          .status(400)
          .json({ error: "Invalid mobile number format" });
      }

      // Check duplicate registration number
      const existingApp = await db.get(
        "SELECT id FROM student_applications WHERE regNo = ?",
        [regNo]
      );
      if (existingApp) {
        return res.status(400).json({
          error: "Application with this registration number already exists",
        });
      }

      // Handle uploaded files
      const files = req.files || {};
      if (!files.photo || !files.aadharPhoto || !files.collegeIdPhoto) {
        return res.status(400).json({
          error: "All required images must be uploaded",
          details: {
            photo: !!files.photo,
            aadharPhoto: !!files.aadharPhoto,
            collegeIdPhoto: !!files.collegeIdPhoto,
          },
        });
      }

      // File paths (relative for frontend use)
      const photo = `/uploads/${files.photo[0].filename}`;
      const aadharPhoto = `/uploads/${files.aadharPhoto[0].filename}`;
      const collegeIdPhoto = `/uploads/${files.collegeIdPhoto[0].filename}`;

      // Generate pass number (should be unique and consistent if user applies again with same regNo)
      // Example: 'BP-REGNO-YYYYMMDDHHmmss' for demo, alternatively, use database id for stable serial
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const passNo =
        'BP-' +
        regNo +
        '-' +
        now.getFullYear().toString() +
        pad(now.getMonth() + 1) +
        pad(now.getDate()) +
        pad(now.getHours()) +
        pad(now.getMinutes()) +
        pad(now.getSeconds());

      // Save application in DB
      await db.run(
        `INSERT INTO student_applications (
          name, dob, regNo, branchYear, mobile, parentMobile, 
          address, route, validity, aadharNumber, photo, 
          aadharPhoto, collegeIdPhoto, status, 
          college, busNo, userType, passNo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)` ,
        [
          name,
          dob,
          regNo,
          branchYear,
          mobile,
          parentMobile,
          address,
          route,
          validity,
          aadharNumber,
          photo,
          aadharPhoto,
          collegeIdPhoto,
          college || '',
          busNo || '',
          userType || 'student',
          passNo
        ]
      );

      res.json({
        message: "Application submitted successfully",
        status: "pending",
      });
    } catch (err) {
      console.error("Error submitting application:", err);

      if (err.code === "SQLITE_CONSTRAINT") {
        res.status(400).json({
          error: "Database constraint error. Please check your data.",
        });
      } else {
        res
          .status(500)
          .json({ error: err.message || "Failed to submit application" });
      }
    }
  }
);

// =============================
// Student login
// =============================
router.post("/login", async (req, res) => {
  try {
    const db = req.db;
    const { regNo, dob } = req.body;

    if (!regNo || !dob) {
      return res
        .status(400)
        .json({ error: "Registration number and DOB are required" });
    }

    const student = await db.get(
      "SELECT * FROM student_applications WHERE regNo = ? AND dob = ?",
      [regNo, dob]
    );

    if (student) {
      // Remove sensitive info
      const {
        aadharNumber,
        aadharPhoto,
        collegeIdPhoto,
        ...safeStudent
      } = student;
      // Ensure props are always present for frontend display
      safeStudent.college = student.college || '';
      safeStudent.busNo = student.busNo || '';
      safeStudent.userType = student.userType || 'student';
      safeStudent.passNo = student.passNo || '';
      res.json(safeStudent);
    } else {
      res.status(404).json({ error: "Student not found. Check credentials." });
    }
  } catch (err) {
    console.error("Error in student login:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// =============================
// Upload fees bill
// =============================
router.post(
  "/upload-fees-bill",
  upload.single("feesBill"),
  async (req, res) => {
    try {
      if (!req.db) {
        console.error("Database connection not available");
        return res
          .status(500)
          .json({ error: "Database connection failed" });
      }

      const db = req.db;
      const { regNo } = req.body;

      if (!regNo) {
        return res.status(400).json({ error: "Registration number is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Fees bill photo is required" });
      }

      const feesBillPhoto = `/uploads/${req.file.filename}`;

      const result = await db.run(
        "UPDATE student_applications SET feesBillPhoto = ? WHERE regNo = ?",
        [feesBillPhoto, regNo]
      );

      if (result.changes === 0) {
        return res.status(404).json({ error: "Student not found." });
      }

      res.json({
        message: "Fees bill uploaded successfully",
        filePath: feesBillPhoto,
      });
    } catch (err) {
      console.error("Error uploading fees bill:", err);
      res.status(500).json({ error: "Failed to upload fees bill" });
    }
  }
);

// =============================
// Serve uploaded images
// =============================
router.get("/uploads/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(uploadDir, filename);
    
    console.log('Requested image:', filename);
    console.log('Image path:', imagePath);
    
    if (!fs.existsSync(imagePath)) {
      console.log('Image not found at path:', imagePath);
      return res.status(404).json({ error: "Image not found" });
    }
    
    // Set proper headers for CORS and caching
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    res.sendFile(imagePath);
  } catch (err) {
    console.error("Error serving image:", err);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

// Health check route for backend connectivity
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Student API is reachable' });
});

// =============================
// Multer / general error handler
// =============================
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size too large. Max size is 10MB." });
    }
    return res.status(400).json({ error: "File upload error" });
  }

  if (error.message === "Only image files are allowed") {
    return res.status(400).json({ error: "Only image files are allowed" });
  }

  console.error("Student route error:", error);
  res.status(500).json({ error: "Internal server error" });
});

export default router;
