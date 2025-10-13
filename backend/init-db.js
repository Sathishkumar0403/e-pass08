import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  let db;
  
  try {
    console.log('🔧 Initializing SQLite database...');
    
    db = await open({
      filename: path.join(__dirname, 'buspass.sqlite'),
      driver: sqlite3.Database
    });

    console.log('📊 Creating tables...');

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

    // Create index for better performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_reg_no ON student_applications(regNo);
      CREATE INDEX IF NOT EXISTS idx_status ON student_applications(status);
      CREATE INDEX IF NOT EXISTS idx_created_at ON student_applications(createdAt);
    `);

    console.log('✅ Database initialized successfully!');
    console.log(`📁 Database file: ${path.join(__dirname, 'buspass.sqlite')}`);
    
    // Check if there are any existing applications
    const count = await db.get('SELECT COUNT(*) as count FROM student_applications');
    console.log(`📋 Total applications: ${count.count}`);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
      console.log('🔒 Database connection closed.');
    }
  }
})();
