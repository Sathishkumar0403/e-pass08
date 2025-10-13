
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsPath = path.join(__dirname, 'routes', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// SQLite DB setup
const dbPromise = open({
  filename: path.join(__dirname, 'buspass.sqlite'),
  driver: sqlite3.Database
});

// Ensure DB schema exists and add any missing columns for backward compatibility
async function ensureSchema() {
  const db = await dbPromise;
  // Create table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS student_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      dob TEXT NOT NULL,
      regNo TEXT UNIQUE NOT NULL,
      branchYear TEXT NOT NULL,
      mobile TEXT NOT NULL,
      parentMobile TEXT NOT NULL,
      address TEXT NOT NULL,
      route TEXT NOT NULL,
      validity TEXT NOT NULL,
      photo TEXT,
      aadharNumber TEXT,
      aadharPhoto TEXT,
      collegeIdPhoto TEXT,
      status TEXT DEFAULT 'pending',
      qrData TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Introspect existing columns
  const rows = await db.all("PRAGMA table_info('student_applications')");
  const existingColumns = new Set(rows.map(r => r.name));

  // Columns we expect to exist
  const expectedColumns = [
    { name: 'photo', sql: "ALTER TABLE student_applications ADD COLUMN photo TEXT" },
    { name: 'aadharNumber', sql: "ALTER TABLE student_applications ADD COLUMN aadharNumber TEXT" },
    { name: 'aadharPhoto', sql: "ALTER TABLE student_applications ADD COLUMN aadharPhoto TEXT" },
    { name: 'collegeIdPhoto', sql: "ALTER TABLE student_applications ADD COLUMN collegeIdPhoto TEXT" },
    { name: 'status', sql: "ALTER TABLE student_applications ADD COLUMN status TEXT" },
    { name: 'qrData', sql: "ALTER TABLE student_applications ADD COLUMN qrData TEXT" },
  { name: 'createdAt', sql: "ALTER TABLE student_applications ADD COLUMN createdAt DATETIME" },
  { name: 'updatedAt', sql: "ALTER TABLE student_applications ADD COLUMN updatedAt DATETIME" }
  ];

  for (const { name, sql } of expectedColumns) {
    if (!existingColumns.has(name)) {
      await db.exec(sql);
    }
  }

  // Backfill defaults in a SQLite-safe way (no non-constant defaults in ALTER)
  await db.exec(`
    UPDATE student_applications SET status = 'pending' WHERE status IS NULL OR status = '';
    UPDATE student_applications SET createdAt = COALESCE(createdAt, CURRENT_TIMESTAMP);
    UPDATE student_applications SET updatedAt = COALESCE(updatedAt, CURRENT_TIMESTAMP);
  `);

  // Indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_reg_no ON student_applications(regNo);
    CREATE INDEX IF NOT EXISTS idx_status ON student_applications(status);
    CREATE INDEX IF NOT EXISTS idx_created_at ON student_applications(createdAt);
  `);
}

// Run schema check at startup
ensureSchema().catch((err) => {
  console.error('Failed to ensure database schema:', err);
});

// Make db accessible in req
app.use(async (req, res, next) => {
  try {
    req.db = await dbPromise;
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bus Pass Backend API (SQLite)',
    version: '1.0.0',
    status: 'running'
  });
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve images with fallback
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image not found' });
  }
  
  res.sendFile(imagePath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Function to find available port
function findAvailablePort(startPort = 3001) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Start server on fixed port (fail fast if taken)
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Database: ${path.join(__dirname, 'buspass.sqlite')}`);
  console.log(`🌐 API Base: http://localhost:${PORT}/api`);
  console.log(`📝 Update frontend API_BASE to: http://localhost:${PORT}/api`);
});
