const { MongoClient } = require('mongodb');
require('dotenv').config({ path: 'e:/E-PASS/.env' });

async function checkData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('ebuspass');
    
    console.log('--- Bus Routes ---');
    const routes = await db.collection('bus_routes').find({}).toArray();
    console.log(JSON.stringify(routes, null, 2));

    console.log('\n--- Sample Application (Bus 15) ---');
    const app = await db.collection('student_applications').findOne({ 
      $or: [
        { busNumber: '15' },
        { bus_number: '15' },
        { busNumber: 15 },
        { bus_number: 15 }
      ]
    });
    console.log(JSON.stringify(app, null, 2));

    if (app) {
        const busNum = app.busNumber || app.bus_number;
        console.log(`\nApplication busNumber type: ${typeof busNum}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

checkData();
