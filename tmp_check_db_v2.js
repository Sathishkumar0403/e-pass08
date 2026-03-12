const { MongoClient } = require('mongodb');
const fs = require('fs');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    
    let output = '--- Bus Routes ---\n';
    const routes = await db.collection('bus_routes').find({}).toArray();
    output += JSON.stringify(routes, null, 2) + '\n';

    output += '\n--- Sample Application (Bus 15) ---\n';
    const app = await db.collection('student_applications').findOne({ 
      $or: [
        { busNumber: '15' },
        { bus_number: '15' },
        { busNumber: 15 },
        { bus_number: 15 },
        { busNumber: /15/ },
        { bus_number: /15/ }
      ]
    });
    output += JSON.stringify(app, null, 2) + '\n';

    if (app) {
        const busNum = app.busNumber || app.bus_number;
        output += `\nApplication busNumber type: ${typeof busNum}\n`;
    }

    fs.writeFileSync('e:/E-PASS/db_check_plain.txt', output);
    console.log('Done');

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkData();
