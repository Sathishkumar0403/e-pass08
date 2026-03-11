import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading .env but don't fail if it's missing (it will be missing on Vercel)
try {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // Silent fail
}

let cachedClient = global.mongoClient || null;
let cachedDb = global.mongoDb || null;
let cachedPromise = global.mongoPromise || null;

export async function connectDB() {
  if (cachedDb) return cachedDb;
  if (cachedPromise) return cachedPromise;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("CRITICAL: MONGODB_URI is not defined in environment variables!");
    throw new Error("MONGODB_URI is not defined.");
  }

  if (!cachedClient) {
    console.log("Creating new MongoClient instance...");
    cachedClient = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10
    });
    global.mongoClient = cachedClient;
  }

  console.log("Starting MongoDB connection promise...");
  cachedPromise = cachedClient.connect()
    .then(client => {
      console.log("Connected to MongoDB Atlas successfully!");
      cachedDb = client.db("ebuspass");
      global.mongoDb = cachedDb;
      return cachedDb;
    })
    .catch(err => {
      console.error("Failed to connect to MongoDB:", err.message);
      global.mongoPromise = null; // Reset promise on failure
      cachedPromise = null;
      throw err;
    });

  global.mongoPromise = cachedPromise;
  return cachedPromise;
}

async function seedMongoDB(db) {
  try {
    // 1. Seed System Settings
    const settings = db.collection("system_settings");
    await settings.updateOne(
      { key: "cancellations_enabled" },
      { $setOnInsert: { key: "cancellations_enabled", value: "0", updated_at: new Date().toISOString() } },
      { upsert: true }
    );

    // 2. Seed Admin Users
    const admins = db.collection("admin_users");
    
    // System Admin
    await admins.updateOne(
      { username: "admin" },
      { $setOnInsert: { username: "admin", password: "Admin@demo", role: "admin", name: "System Administrator" } },
      { upsert: true }
    );

    // Principal
    await admins.updateOne(
      { username: "principal" },
      { $setOnInsert: { username: "principal", password: "Principal@demo", role: "principal", name: "Principal Office" } },
      { upsert: true }
    );

    // HODs
    const depts = ['CSE', 'EEE', 'ECE', 'MECH', 'CIVIL'];
    for (const dept of depts) {
      await admins.updateOne(
        { username: `hod_${dept.toLowerCase()}` },
        { 
          $setOnInsert: { 
            username: `hod_${dept.toLowerCase()}`, 
            password: `HOD@${dept}`, 
            role: "hod", 
            department: dept, 
            name: `HOD ${dept}` 
          } 
        },
        { upsert: true }
      );
    }
    console.log("MongoDB seeded successfully.");
  } catch (err) {
    console.error("Error seeding MongoDB:", err);
  }
}

export function getDB() {
  if (!cachedDb) throw new Error("Database not connected. Call connectDB first.");
  return cachedDb;
}
