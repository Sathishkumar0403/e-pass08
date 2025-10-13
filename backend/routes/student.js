
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

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
      "SELECT name, regNo, route, validity, photo, qrData, branchYear, dob, mobile FROM student_applications WHERE regNo = ? AND status = 'approved'",
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
      qrData: qrData
    };
    
    res.json(passData);
  } catch (err) {
    console.error("Error fetching bus pass data:", err);
    res.status(500).json({ error: "Failed to fetch bus pass data" });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// Ensure uploads directory exists
// =============================
const uploadDir = path.join(__dirname, "uploads");
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

      // Save application in DB
      await db.run(
        `INSERT INTO student_applications (
          name, dob, regNo, branchYear, mobile, parentMobile, 
          address, route, validity, aadharNumber, photo, 
          aadharPhoto, collegeIdPhoto, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
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
      res.json(safeStudent);
    } else {
      res
        .status(404)
        .json({ error: "Student not found. Check credentials." });
    }
  } catch (err) {
    console.error("Error in student login:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

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
