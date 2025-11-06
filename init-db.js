import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'buspass.sqlite');

async function initDb() {
  try {
    console.log('Initializing database...');
    
    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    
    // Open the database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    if (!dbExists) {
      console.log('Creating database schema...');
      
      // Create the student_applications table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS student_applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          regNo TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          fromLocation TEXT,
          toLocation TEXT,
          photo TEXT,
          aadharNumber TEXT,
          aadharPhoto TEXT,
          status TEXT DEFAULT 'pending',
          feesBill TEXT,
          feesStatus TEXT DEFAULT 'pending',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          cancellation_requested BOOLEAN DEFAULT 0,
          cancellation_reason TEXT,
          cancellation_requested_at DATETIME,
          cancelled BOOLEAN DEFAULT 0,
          cancelled_at DATETIME,
          cancelled_by TEXT
        )
      `);
      
      console.log('Database schema created successfully');
    } else {
      console.log('Database already exists, checking schema...');
      
      // Add any missing columns
      const columns = await db.all(
        "PRAGMA table_info(student_applications)"
      );
      
      const columnNames = columns.map(col => col.name);
      const missingColumns = [
        'cancellation_requested',
        'cancellation_reason',
        'cancellation_requested_at',
        'cancelled',
        'cancelled_at',
        'cancelled_by'
      ].filter(col => !columnNames.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('Adding missing columns:', missingColumns);
        
        for (const col of missingColumns) {
          let colDef;
          if (col === 'cancellation_requested' || col === 'cancelled') {
            colDef = `${col} BOOLEAN DEFAULT 0`;
          } else if (col.endsWith('_at') || col.endsWith('_by')) {
            colDef = `${col} TEXT`;
          } else {
            colDef = `${col} TEXT`;
          }
          
          await db.exec(`ALTER TABLE student_applications ADD COLUMN ${colDef}`);
          console.log(`Added column: ${col}`);
        }
      }
    }
    
    await db.close();
    console.log('Database initialization complete');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();
