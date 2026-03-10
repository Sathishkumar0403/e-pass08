import dotenv from 'dotenv';
import path from 'path';

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env before local imports to ensure variables are available
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';

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

let mongodb = null;

// Middleware to inject Mongo into request
app.use(async (req, res, next) => {
  try {
    req.mongo = mongodb ? mongodb : null;
    
    // Unified helper for backward compatibility while refactoring routes
    req.getCollection = (name) => {
      if (mongodb) return mongodb.collection(name);
      return null;
    };

    next();
  } catch (err) {
    next(err);
  }
});

// Static files (React build)
const buildPath = path.join(__dirname, '..', 'build');
app.use(express.static(buildPath));

// Routes
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve uploaded images statically
// We've detected images in both backend/uploads and the root uploads folder.
// We'll prioritize the backend/uploads folder where most files are stored.
const backendUploads = path.join(__dirname, 'uploads');
const rootUploads = path.join(__dirname, '..', 'uploads');

app.use('/uploads', express.static(backendUploads));
app.use('/uploads', express.static(rootUploads));
app.use('/api/uploads', express.static(backendUploads));
app.use('/api/uploads', express.static(rootUploads));

// Catch-all to serve React's index.html
app.get('*', (req, res) => {
  // Ignore requests that look like static files (have extensions)
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Only serve index.html for non-API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler (already handles Catch-all above)

// Initialize and start listening
async function startServer() {
  try {
    mongodb = await connectDB();
    console.log("MongoDB is READY.");

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 ==========================================`);
      console.log(`🚀 EVERYTHING RUNNING ON PORT ${PORT}`);
      console.log(`🌐 Application URL: http://localhost:${PORT}`);
      console.log(`🍃 Database: MONGODB ATLAS (ebuspass)`);
      console.log(`✅ Front-end & Back-end are combined!`);
      console.log(`==========================================\n`);
    });
  } catch (err) {
    console.error("\n❌ CRITICAL: Failed to start the server.");
    console.error(`❌ Reason: ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Only listen if not in serverless (handled by export)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  startServer();
} else {
  // In serverless, we need to ensure DB is connected
  app.use(async (req, res, next) => {
    if (!mongodb) {
      try {
        mongodb = await connectDB();
      } catch (err) {
        console.error("Delayed connect fail:", err);
      }
    }
    req.mongo = mongodb;
    next();
  });
}

export default app;
