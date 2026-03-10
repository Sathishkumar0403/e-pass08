// Quick script to verify and display all admin users in the database
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabase() {
    const db = await open({
        filename: path.join(__dirname, 'buspass.sqlite'),
        driver: sqlite3.Database
    });

    console.log('\n=== CHECKING ADMIN USERS TABLE ===\n');

    // Check if table exists
    const tableExists = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'"
    );

    if (!tableExists) {
        console.log('❌ admin_users table does not exist!');
        console.log('The backend server needs to be restarted to create this table.\n');
        await db.close();
        return;
    }

    console.log('✓ admin_users table exists\n');

    // Get all users
    const users = await db.all('SELECT id, username, password, role, department, name FROM admin_users');

    if (users.length === 0) {
        console.log('❌ No users found in admin_users table!');
        console.log('The backend server needs to be restarted to seed the users.\n');
    } else {
        console.log(`✓ Found ${users.length} users in database:\n`);
        console.table(users);
        console.log('\n=== LOGIN CREDENTIALS ===\n');
        users.forEach(user => {
            console.log(`${user.role.toUpperCase().padEnd(10)} | Username: ${user.username.padEnd(15)} | Password: ${user.password}`);
        });
    }

    await db.close();
}

checkDatabase().catch(console.error);
