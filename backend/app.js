
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); // Allow all origins in development
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Enable CORS
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// SQLite DB setup
let dbPromise = open({
  filename: path.join(__dirname, 'buspass.sqlite'),
  driver: sqlite3.Database
});

// Helper to detect corruption
function isSqliteCorruptionError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.code === 'SQLITE_CORRUPT' || message.includes('database disk image is malformed');
}

async function initializeSchema(db) {
  // Create table if it doesn't exist (full definition for fresh DBs)
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
      feesBillPhoto TEXT,
      cancellation_requested BOOLEAN DEFAULT 0,
      cancelled BOOLEAN DEFAULT 0,
      cancellation_reason TEXT,
      cancellation_requested_at DATETIME,
      cancelled_at DATETIME,
      cancelled_by TEXT,
      passNumber TEXT,
      busNumber TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Introspect existing columns
  const rows = await db.all("PRAGMA table_info('student_applications')");
  const existingColumns = new Set(rows.map(r => r.name));

  // Columns we expect to exist (for migrations on older DBs)
  const expectedColumns = [
    { name: 'photo', sql: "ALTER TABLE student_applications ADD COLUMN photo TEXT" },
    { name: 'aadharNumber', sql: "ALTER TABLE student_applications ADD COLUMN aadharNumber TEXT" },
    { name: 'aadharPhoto', sql: "ALTER TABLE student_applications ADD COLUMN aadharPhoto TEXT" },
    { name: 'collegeIdPhoto', sql: "ALTER TABLE student_applications ADD COLUMN collegeIdPhoto TEXT" },
    { name: 'status', sql: "ALTER TABLE student_applications ADD COLUMN status TEXT" },
    { name: 'qrData', sql: "ALTER TABLE student_applications ADD COLUMN qrData TEXT" },
    { name: 'passNumber', sql: "ALTER TABLE student_applications ADD COLUMN passNumber TEXT" },
    { name: 'busNumber', sql: "ALTER TABLE student_applications ADD COLUMN busNumber TEXT" },
    { name: 'createdAt', sql: "ALTER TABLE student_applications ADD COLUMN createdAt DATETIME" },
    { name: 'updatedAt', sql: "ALTER TABLE student_applications ADD COLUMN updatedAt DATETIME" },
    { name: 'feesBillPhoto', sql: "ALTER TABLE student_applications ADD COLUMN feesBillPhoto TEXT" },
    { name: 'cancellation_requested', sql: "ALTER TABLE student_applications ADD COLUMN cancellation_requested BOOLEAN DEFAULT 0" },
    { name: 'cancelled', sql: "ALTER TABLE student_applications ADD COLUMN cancelled BOOLEAN DEFAULT 0" },
    { name: 'cancellation_reason', sql: "ALTER TABLE student_applications ADD COLUMN cancellation_reason TEXT" },
    { name: 'cancellation_requested_at', sql: "ALTER TABLE student_applications ADD COLUMN cancellation_requested_at DATETIME" },
    { name: 'cancelled_at', sql: "ALTER TABLE student_applications ADD COLUMN cancelled_at DATETIME" },
    { name: 'cancelled_by', sql: "ALTER TABLE student_applications ADD COLUMN cancelled_by TEXT" }
  ];

  for (const { name, sql } of expectedColumns) {
    if (!existingColumns.has(name)) {
      await db.exec(sql);
    }
  }

  // Backfill defaults
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

// Ensure DB schema exists and add any missing columns for backward compatibility
async function ensureSchema() {
  const db = await dbPromise;
  try {
    await initializeSchema(db);
  } catch (err) {
    if (!isSqliteCorruptionError(err)) throw err;

    console.error('Detected SQLite corruption. Backing up and recreating database...');
    try {
      // Best-effort close
      try { 
        await db.close(); 
      } catch (_) {
        // Ignore close errors
      }

      const dbPath = path.join(__dirname, 'buspass.sqlite');
      const backupPath = `${dbPath}.bak-${Date.now()}`;
      
      try {
        fs.accessSync(dbPath, fs.constants.F_OK);
        fs.renameSync(dbPath, backupPath);
        console.error(`Corrupt DB moved to: ${backupPath}`);
      } catch (err) {
        // File doesn't exist, continue with creating new DB
        console.log('No existing database file found');
      }

      const newDb = await open({ filename: dbPath, driver: sqlite3.Database });
      await initializeSchema(newDb);
      dbPromise = Promise.resolve(newDb);
      console.log('✅ Recreated fresh SQLite database and schema.');
    } catch (recreateErr) {
      console.error('Failed to recreate SQLite database:', recreateErr);
      throw recreateErr;
    }
  }
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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve images with fallback
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  // Check if file exists
  try {
    fs.accessSync(imagePath, fs.constants.F_OK);
  } catch (err) {
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

// Start server, automatically finding an available port if default is taken
const DEFAULT_PORT = Number(process.env.PORT) || 3001;
findAvailablePort(DEFAULT_PORT)
  .then((port) => {
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`📁 Database: ${path.join(__dirname, 'buspass.sqlite')}`);
      console.log(`🌐 API Base: http://localhost:${port}/api`);
      console.log(`📝 Update frontend API_BASE to: http://localhost:${port}/api`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
