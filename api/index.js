// Vercel Bridge v3.0 - Self-contained CJS
'use strict';

// Load env vars
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch(e) {}

const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── MongoDB singleton ──────────────────────────────────────────────────────────
let _db = null;
async function getDB() {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  _db = client.db('ebuspass');
  return _db;
}

// DB middleware
app.use(async (req, res, next) => {
  try {
    req.mongo = await getDB();
    // Use student_applications as the primary collection for both local and prod
    req.applications = req.mongo.collection('student_applications');
    next();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(503).json({ error: 'Database unavailable', details: err.message });
  }
});

// Multer - use /tmp for serverless
const storage = multer.memoryStorage(); // Use memory for serverless to convert to B64
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper to handle image uploads to Base64 (persistent on Vercel)
async function handleFileUpload(file) {
  if (!file) return null;
  const b64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${b64}`;
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', db: req.mongo ? 'Connected' : 'N/A', env: process.env.NODE_ENV });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    // Hardcoded admin
    if (username === 'admin' && password === 'Admin@demo') {
      return res.json({ message: 'Login successful', token: 'admin-token',
        user: { id: 0, username: 'admin', role: 'admin', name: 'System Administrator' } });
    }
    const user = await req.mongo.collection('admin_users').findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', token: `${user.role}-token`,
      user: { id: user._id, username: user.username, role: user.role, department: user.department, name: user.name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/applications', async (req, res) => {
  try {
    const { role, department, status } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (role === 'hod' && department) {
      query.$or = [{ department: department }, { branchYear: new RegExp(`^${department}`, 'i') }];
    }
    const apps = await req.applications.find(query).sort({ createdAt: -1, created_at: -1 }).toArray();
    res.json(apps.map(a => ({ ...a, id: a._id.toString(), regNo: a.regNo || a.reg_no })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve', async (req, res) => {
  try {
    const { id } = req.body;
    const appRecord = await req.applications.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    // Pass Generation Logic
    const currentYear = new Date().getFullYear();
    const count = await req.applications.countDocuments({ passNumber: { $ne: null } });
    const passNumber = `PASS-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    
    // Basic QR data for frontend
    const qrData = JSON.stringify({
      name: appRecord.name,
      regNo: appRecord.regNo || appRecord.reg_no,
      route: appRecord.route,
      passNumber,
      approvedAt: new Date().toISOString()
    });

    await req.applications.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { 
          status: 'approved', 
          passNumber, 
          qrData, 
          updatedAt: new Date().toISOString() 
        } 
      }
    );
    res.json({ message: 'Approved successfully', passNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.applications.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } }
    );
    res.json({ message: 'Rejected successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/applications/:id', async (req, res) => {
  try {
    await req.applications.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/applications/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    await req.applications.updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payment-details', async (req, res) => {
  try {
    const apps = await req.applications.find({ 
      payment_status: { $in: ['paid', 'verified', 'processing'] } 
    }).sort({ updatedAt: -1, payment_date: -1 }).toArray();
    res.json(apps.map(a => ({ ...a, id: a._id.toString(), regNo: a.regNo || a.reg_no })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve-payment-pass', async (req, res) => {
  try {
    const { id } = req.body;
    const appRecord = await req.applications.findOne({ _id: new ObjectId(id) });
    if (!appRecord) return res.status(404).json({ error: 'Application not found' });

    // Pass Generation Logic
    const currentYear = new Date().getFullYear();
    const count = await req.applications.countDocuments({ passNumber: { $ne: null } });
    const passNumber = `PASS-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    // QR data for the pass
    const qrData = JSON.stringify({
      name: appRecord.name,
      regNo: appRecord.regNo || appRecord.reg_no,
      route: appRecord.route,
      passNumber,
      approvedAt: new Date().toISOString()
    });

    await req.applications.updateOne(
      { _id: new ObjectId(id) }, 
      { $set: { 
          pass_approved: true, 
          status: 'approved', 
          payment_status: 'verified',
          passNumber,
          qrData,
          updatedAt: new Date().toISOString() 
        } 
      }
    );
    res.json({ message: 'Pass approved and issued' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject-payment-pass', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.applications.updateOne(
      { _id: new ObjectId(id) }, { $set: { pass_approved: false, status: 'rejected', rejection_reason: reason, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Pass rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route fees
app.get('/api/admin/route-fees', async (req, res) => {
  try {
    const fees = await req.mongo.collection('route_fees').find({}).toArray();
    res.json(fees.map(f => ({ ...f, id: f._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/route-fees', async (req, res) => {
  try {
    const data = { ...req.body, created_at: new Date().toISOString() };
    data.fee_amount = Number(data.fee_amount);
    // Ensure route uniquely identifies the fee record if not provided
    if (!data.route && data.to) data.route = data.to;
    const result = await req.mongo.collection('route_fees').insertOne(data);
    res.json({ id: result.insertedId, message: 'Route fee added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/route-fees/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    if (updates.fee_amount) updates.fee_amount = Number(updates.fee_amount);
    await req.mongo.collection('route_fees').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/route-fees/:id', async (req, res) => {
  try {
    await req.mongo.collection('route_fees').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bus routes
app.get('/api/admin/bus-routes', async (req, res) => {
  try {
    const routes = await req.mongo.collection('bus_routes').find({}).toArray();
    res.json(routes.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/bus-routes', async (req, res) => {
  try {
    const result = await req.mongo.collection('bus_routes').insertOne({ ...req.body, created_at: new Date().toISOString() });
    res.json({ id: result.insertedId, message: 'Bus route added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/bus-routes/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
    delete updates.id;
    await req.mongo.collection('bus_routes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/bus-routes/:id', async (req, res) => {
  try {
    await req.mongo.collection('bus_routes').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/bus-seat-counts', async (req, res) => {
  try {
    const routes = await req.mongo.collection('bus_routes').find({}).toArray();
    const counts = {};
    for (const r of routes) {
      // Count all applications filled for this bus, excluding rejected/cancelled ones
      const taken = await req.applications.countDocuments({
        busNumber: r.bus_number,
        status: { $nin: ['rejected', 'cancelled'] }
      });
      counts[r.bus_number] = taken;
    }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Settings
app.get('/api/admin/settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    res.json(settings.map(s => ({ key: s.key, value: s.value })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/system-settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    res.json(settings.map(s => ({ key: s.key, value: s.value })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/update-setting', async (req, res) => {
  try {
    const { key, value } = req.body;
    await req.mongo.collection('system_settings').updateOne(
      { key }, { $set: { value, updated_at: new Date().toISOString() } }, { upsert: true });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Export Excel
app.get('/api/admin/export-excel', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const apps = await req.applications.find({}).toArray();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Applications');
    ws.columns = [
      { header: 'Reg No', key: 'regNo' }, { header: 'Name', key: 'name' },
      { header: 'Route', key: 'route' }, { header: 'Status', key: 'status' },
      { header: 'Payment', key: 'payment_status' }, { header: 'Date', key: 'createdAt' }
    ];
    apps.forEach(a => ws.addRow({ ...a, regNo: a.regNo || a.reg_no, createdAt: a.createdAt || a.created_at }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cancellation requests
app.get('/api/admin/cancellation-requests', async (req, res) => {
  try {
    const reqs = await req.applications.find({ 
      $or: [{ cancellation_requested: true }, { cancellation_requested: 1 }] 
    }).toArray();
    res.json(reqs.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/process-cancellation/:id', async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'cancelled' : 'approved';
    await req.applications.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, cancellation_requested: false, cancelled: action === 'approve' ? 1 : 0, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Done' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

['hod-approve','hod-decline','principal-approve','principal-decline','admin-approve','admin-decline'].forEach(action => {
  app.post(`/api/admin/${action}-cancellation`, async (req, res) => {
    try {
      const { id } = req.body;
      const isApprove = action.includes('approve');
      const stage = action.split('-')[0];
      const update = { [`${stage}_approved`]: isApprove, updatedAt: new Date().toISOString() };
      if (action === 'admin-approve') {
        update.status = 'cancelled';
        update.cancelled = 1;
        update.cancellation_requested = false;
      }
      await req.applications.updateOne({ _id: new ObjectId(id) }, { $set: update });
      res.json({ message: 'Done' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

// ── STUDENT ROUTES ────────────────────────────────────────────────────────────
app.post('/api/student/apply', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'aadharPhoto', maxCount: 1 },
  { name: 'collegeIdPhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files) {
      if (req.files.photo) data.photo = await handleFileUpload(req.files.photo[0]);
      if (req.files.aadharPhoto) data.aadharPhoto = await handleFileUpload(req.files.aadharPhoto[0]);
      if (req.files.collegeIdPhoto) data.collegeIdPhoto = await handleFileUpload(req.files.collegeIdPhoto[0]);
    }
    
    const regNum = data.regNo || data.reg_no;
    if (!regNum) return res.status(400).json({ error: 'Registration number is required' });
    data.regNo = regNum;
    data.reg_no = regNum;
    
    const existing = await req.applications.findOne({
      $or: [{ regNo: regNum }, { reg_no: regNum }]
    });
    if (existing) return res.status(400).json({ error: 'Application already exists' });
    
    data.status = 'pending';
    data.payment_status = 'unpaid';
    data.createdAt = new Date().toISOString();
    const result = await req.applications.insertOne(data);
    res.json({ message: 'Application submitted', id: result.insertedId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { regNo, dob } = req.body;
    const student = await req.applications.findOne({
      $or: [{ regNo, dob }, { reg_no: regNo, dob }]
    });
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/status/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/details/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/verify-pass/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Pass not found' });

    let branch = student.department || '', year = student.year || '';
    if (student.branchYear && (!branch || !year)) {
      const parts = student.branchYear.split(/[-\/\s]+/);
      if (parts.length >= 2) {
        year = parts[parts.length - 1];
        branch = parts.slice(0, -1).join(' ');
      }
    }

    res.json({
      ...student,
      branch,
      year,
      validTill: student.validity || student.validTill,
      cancelled: !!student.cancelled
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/pass/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo, status: 'approved' }, { reg_no: regNo, status: 'approved' }]
    });
    if (!student) return res.status(404).json({ error: 'No approved pass found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/payment-status/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo;
    const student = await req.applications.findOne({
      $or: [{ regNo }, { reg_no: regNo }]
    });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ payment_status: student.payment_status || 'unpaid', amount: student.fee_amount || student.amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/pay', async (req, res) => {
  try {
    const { regNo, paymentId, amount } = req.body;
    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { payment_status: 'paid', payment_id: paymentId, fee_amount: amount, payment_date: new Date().toISOString() } });
    res.json({ message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/create-payment-order', async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const { amount, regNo } = req.body;
    const order = await rz.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: regNo });
    res.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR'
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/verify-payment', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { payment_status: 'paid', payment_id: razorpay_payment_id, razorpay_order_id, fee_amount: amount, payment_date: new Date().toISOString() } });
    res.json({ message: 'Payment verified' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/request-cancellation', async (req, res) => {
  try {
    const { regNo, reason } = req.body;
    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] },
      { $set: { cancellation_requested: 1, cancellation_reason: reason, updatedAt: new Date().toISOString() } });
    res.json({ message: 'Cancellation requested' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/get-fee/:route', async (req, res) => {
  try {
    const rawRoute = decodeURIComponent(req.params.route).toLowerCase();
    const allFees = await req.mongo.collection('route_fees').find({}).toArray();
    
    // Normalize logic: keep only significant alphanumeric words
    const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const sClean = clean(rawRoute);
    
    // Ignore common geographical noise
    const noise = ["india", "tamil", "nadu", "krishnagiri", "district", "college", "university", "transport", "street", "road", "near", "landmark", "opp", "opposite"];

    let bestFee = null;
    let maxMatches = 0;

    for (const fee of allFees) {
      // Define keywords for this specific fee record
      const feeKeywords = [...new Set([
        ...clean(fee.route || "").split(" "),
        ...clean(fee.to || "").split(" "),
        ...clean(fee.from || "").split(" ")
      ])].filter(w => w.length > 2 && !noise.includes(w));
      
      if (feeKeywords.length === 0) continue;

      // Count how many of the fee's defining keywords are found in the student's route string
      const matches = feeKeywords.filter(kw => sClean.includes(kw)).length;
      
      if (matches >= 1) {
        if (matches > maxMatches) {
          maxMatches = matches;
          bestFee = fee;
        } else if (matches === maxMatches) {
          // Tie-breaker: pick the highest fee amount if routes are identical/overlapping
          if (!bestFee || (Number(fee.fee_amount) > Number(bestFee.fee_amount))) {
            bestFee = fee;
          }
        }
      }
    }

    if (bestFee) {
      console.log(`[Fee Match] SUCCESS for "${rawRoute}". Normalized: "${sClean}". Matched: ${bestFee.to}. Amount: ${bestFee.fee_amount}`);
      res.json(bestFee);
    } else {
      console.log(`[Fee Match] FAIL for "${rawRoute}". No match in ${allFees.length} records.`);
      res.json({ fee_amount: 0 });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/upload-fees-bill', upload.single('feesBill'), async (req, res) => {
  try {
    const { regNo } = req.body;
    const student = await req.applications.findOne({ $or: [{ regNo }, { reg_no: regNo }] });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const fileData = await handleFileUpload(req.file);
    
    // Try to get fee amount if not already set
    let feeAmount = student.fee_amount || student.amount;
    if (!feeAmount && student.route) {
      const clean = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
      const sClean = clean(student.route);
      const allFees = await req.mongo.collection('route_fees').find({}).toArray();
      let bestFee = null;
      let maxMatches = 0;
      
      for (const fee of allFees) {
        const fWords = [...new Set([
          ...clean(fee.route || "").split(" "),
          ...clean(fee.to || "").split(" ")
        ])].filter(w => w.length > 2 && w !== "college" && w !== "india");
        
        if (fWords.length === 0) continue;
        const matches = fWords.filter(kw => sClean.includes(kw)).length;
        if (matches >= 1 && matches > maxMatches) {
          maxMatches = matches;
          bestFee = fee;
        }
      }
      if (bestFee) feeAmount = bestFee.fee_amount;
    }

    await req.applications.updateOne(
      { $or: [{ regNo }, { reg_no: regNo }] }, 
      { $set: { 
          feesBillPhoto: fileData, 
          payment_status: 'paid', 
          payment_id: 'MANUAL-DOC',
          payment_date: new Date().toISOString(),
          fee_amount: feeAmount || 0,
          updatedAt: new Date().toISOString() 
        } 
      });
    res.json({ message: 'Bill uploaded successfully', path: fileData });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/system-settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
  try {
    const notes = await req.mongo.collection('notifications').find({ is_active: 1 }).sort({ created_at: -1 }).toArray();
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { title, message, type, target_role } = req.body;
    const result = await req.mongo.collection('notifications').insertOne({
      title, message, type: type || 'announcement', target_role: target_role || 'all',
      is_active: 1, created_at: new Date().toISOString()
    });
    res.json({ id: result.insertedId, message: 'Created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    let filter;
    try { filter = { _id: new ObjectId(req.params.id) }; }
    catch(e) { filter = { id: req.params.id }; }
    await req.mongo.collection('notifications').updateOne(filter, { $set: { is_active: 0 } });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports = app;
