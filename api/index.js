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
    next();
  } catch (err) {
    console.error('DB connect error:', err.message);
    res.status(503).json({ error: 'Database unavailable', details: err.message });
  }
});

// Multer - use /tmp for serverless
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = '/tmp/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use('/uploads', express.static('/tmp/uploads'));

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
    if (status) query.status = status;
    if (role === 'hod' && department) query.department = department;
    const apps = await req.mongo.collection('applications').find(query).sort({ created_at: -1 }).toArray();
    res.json(apps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve', async (req, res) => {
  try {
    const { id } = req.body;
    await req.mongo.collection('applications').updateOne(
      { _id: new ObjectId(id) }, { $set: { status: 'approved', updated_at: new Date().toISOString() } });
    res.json({ message: 'Approved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.mongo.collection('applications').updateOne(
      { _id: new ObjectId(id) }, { $set: { status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() } });
    res.json({ message: 'Rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/applications/:id', async (req, res) => {
  try {
    await req.mongo.collection('applications').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/applications/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
    await req.mongo.collection('applications').updateOne({ _id: new ObjectId(req.params.id) }, { $set: updates });
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/payment-details', async (req, res) => {
  try {
    const apps = await req.mongo.collection('applications').find({ payment_status: 'paid' }).toArray();
    res.json(apps);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/approve-payment-pass', async (req, res) => {
  try {
    const { id } = req.body;
    await req.mongo.collection('applications').updateOne(
      { _id: new ObjectId(id) }, { $set: { pass_approved: true, status: 'approved', updated_at: new Date().toISOString() } });
    res.json({ message: 'Pass approved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/reject-payment-pass', async (req, res) => {
  try {
    const { id, reason } = req.body;
    await req.mongo.collection('applications').updateOne(
      { _id: new ObjectId(id) }, { $set: { pass_approved: false, status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() } });
    res.json({ message: 'Pass rejected' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route fees
app.get('/api/admin/route-fees', async (req, res) => {
  try {
    const fees = await req.mongo.collection('route_fees').find({}).toArray();
    res.json(fees);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/route-fees', async (req, res) => {
  try {
    const result = await req.mongo.collection('route_fees').insertOne({ ...req.body, created_at: new Date().toISOString() });
    res.json({ id: result.insertedId, message: 'Route fee added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/route-fees/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates._id;
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
    res.json(routes);
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
      const taken = await req.mongo.collection('applications').countDocuments({ route: r.route, status: 'approved' });
      counts[r.route] = { total: r.seats || 0, taken };
    }
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Settings
app.get('/api/admin/settings', async (req, res) => {
  try {
    const settings = await req.mongo.collection('system_settings').find({}).toArray();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
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
    const apps = await req.mongo.collection('applications').find({}).toArray();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Applications');
    ws.columns = [
      { header: 'Reg No', key: 'reg_no' }, { header: 'Name', key: 'name' },
      { header: 'Route', key: 'route' }, { header: 'Status', key: 'status' },
      { header: 'Payment', key: 'payment_status' }, { header: 'Date', key: 'created_at' }
    ];
    apps.forEach(a => ws.addRow(a));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cancellation requests
app.get('/api/admin/cancellation-requests', async (req, res) => {
  try {
    const reqs = await req.mongo.collection('applications').find({ cancellation_requested: true }).toArray();
    res.json(reqs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/process-cancellation/:id', async (req, res) => {
  try {
    const { action } = req.body;
    const status = action === 'approve' ? 'cancelled' : 'approved';
    await req.mongo.collection('applications').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, cancellation_requested: false, updated_at: new Date().toISOString() } });
    res.json({ message: 'Done' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

['hod-approve','hod-decline','principal-approve','principal-decline','admin-approve','admin-decline'].forEach(action => {
  app.post(`/api/admin/${action}-cancellation`, async (req, res) => {
    try {
      const { id } = req.body;
      const isApprove = action.includes('approve');
      const stage = action.split('-')[0];
      const update = { [`${stage}_approved`]: isApprove, updated_at: new Date().toISOString() };
      if (action === 'admin-approve') update.status = 'cancelled';
      await req.mongo.collection('applications').updateOne({ _id: new ObjectId(id) }, { $set: update });
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
      ['photo','aadharPhoto','collegeIdPhoto'].forEach(f => {
        if (req.files[f]) data[f] = '/uploads/' + req.files[f][0].filename;
      });
    }
    // Check if already applied
    const existing = await req.mongo.collection('applications').findOne({ reg_no: data.reg_no });
    if (existing) return res.status(400).json({ error: 'Application already exists for this registration number' });
    data.status = 'pending';
    data.payment_status = 'unpaid';
    data.created_at = new Date().toISOString();
    const result = await req.mongo.collection('applications').insertOne(data);
    res.json({ message: 'Application submitted', id: result.insertedId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/login', async (req, res) => {
  try {
    const { regNo, dob } = req.body;
    const student = await req.mongo.collection('applications').findOne({ reg_no: regNo, dob });
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/status/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/details/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/pass/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo, status: 'approved' });
    if (!student) return res.status(404).json({ error: 'No approved pass found' });
    res.json(student);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/payment-status/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ payment_status: student.payment_status || 'unpaid', amount: student.amount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/pay', async (req, res) => {
  try {
    const { regNo, paymentId, amount } = req.body;
    await req.mongo.collection('applications').updateOne(
      { reg_no: regNo },
      { $set: { payment_status: 'paid', payment_id: paymentId, amount, paid_at: new Date().toISOString() } });
    res.json({ message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/create-order', async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const { amount, regNo } = req.body;
    const order = await rz.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: regNo });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/create-payment-order', async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const { amount, regNo } = req.body;
    const order = await rz.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: regNo });
    res.json(order);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/verify-payment', async (req, res) => {
  try {
    const crypto = require('crypto');
    const { regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    await req.mongo.collection('applications').updateOne(
      { reg_no: regNo },
      { $set: { payment_status: 'paid', payment_id: razorpay_payment_id, order_id: razorpay_order_id, amount, paid_at: new Date().toISOString() } });
    res.json({ message: 'Payment verified' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/request-cancellation', async (req, res) => {
  try {
    const { regNo, reason } = req.body;
    await req.mongo.collection('applications').updateOne(
      { reg_no: regNo },
      { $set: { cancellation_requested: true, cancellation_reason: reason, updated_at: new Date().toISOString() } });
    res.json({ message: 'Cancellation requested' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/cancellation-status/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ cancellation_requested: student.cancellation_requested, status: student.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/verify-pass/:regNo', async (req, res) => {
  try {
    const student = await req.mongo.collection('applications').findOne({ reg_no: req.params.regNo });
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ valid: student.status === 'approved', student });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/student/get-fee/:route', async (req, res) => {
  try {
    const route = decodeURIComponent(req.params.route);
    const fee = await req.mongo.collection('route_fees').findOne({ route });
    res.json(fee || { fee: 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/student/upload-fees-bill', upload.single('feesBill'), async (req, res) => {
  try {
    const { regNo } = req.body;
    const filePath = req.file ? '/uploads/' + req.file.filename : null;
    await req.mongo.collection('applications').updateOne(
      { reg_no: regNo }, { $set: { fees_bill: filePath, updated_at: new Date().toISOString() } });
    res.json({ message: 'Bill uploaded', path: filePath });
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
