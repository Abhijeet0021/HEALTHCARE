// Hospital Management System — Express API backed by SQLite.
const express = require('express');
const cors = require('cors');
const { db, hashPassword, verifyPassword } = require('./db');

const app = express();
const PORT = 5001;
app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();

// Shape a user object for the client (never send the password).
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// =================== AUTH ===================

// Register a patient (self sign-up). Creates a user + patient profile.
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, age, gender, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email and password are required' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

  const info = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashPassword(password), 'patient');
  db.prepare('INSERT INTO patients (user_id, name, email, age, gender, phone) VALUES (?, ?, ?, ?, ?, ?)')
    .run(info.lastInsertRowid, name, email, age || null, gender || null, phone || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.json({ success: true, user: publicUser(user) });
});

// Login for any role.
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  res.json({ success: true, user: publicUser(user) });
});

// Helper: find the patient row for a user id.
const patientForUser = uid => db.prepare('SELECT * FROM patients WHERE user_id = ?').get(uid);
const doctorForUser = uid => db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(uid);

// "Who am I" including linked profile (used by frontend after login).
app.get('/api/me/:userId', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ message: 'Not found' });
  const profile = user.role === 'patient' ? patientForUser(user.id)
                : user.role === 'doctor' ? doctorForUser(user.id)
                : null;
  res.json({ user: publicUser(user), profile });
});

// =================== DOCTORS ===================

app.get('/api/doctors', (req, res) => {
  const { specialty } = req.query;
  const rows = specialty
    ? db.prepare('SELECT * FROM doctors WHERE specialty LIKE ?').all(`%${specialty}%`)
    : db.prepare('SELECT * FROM doctors').all();
  res.json(rows);
});

// Admin adds a doctor (also creates a login for them).
app.post('/api/doctors', (req, res) => {
  const { name, specialty, email, password, fee, available } = req.body;
  if (!name || !specialty || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, specialty, email, password required' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ success: false, message: 'Email already used' });
  }
  const info = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run(name, email, hashPassword(password), 'doctor');
  const doc = db.prepare('INSERT INTO doctors (user_id, name, specialty, fee, available) VALUES (?, ?, ?, ?, ?)')
    .run(info.lastInsertRowid, name, specialty, fee || 500, available === false ? 0 : 1);
  res.json({ success: true, doctor: db.prepare('SELECT * FROM doctors WHERE id = ?').get(doc.lastInsertRowid) });
});

// Toggle / update availability (admin).
app.patch('/api/doctors/:id', (req, res) => {
  const { available, fee } = req.body;
  const doc = db.prepare('SELECT * FROM doctors WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: 'Doctor not found' });
  db.prepare('UPDATE doctors SET available = ?, fee = ? WHERE id = ?')
    .run(available === undefined ? doc.available : (available ? 1 : 0),
         fee === undefined ? doc.fee : fee, doc.id);
  res.json({ success: true, doctor: db.prepare('SELECT * FROM doctors WHERE id = ?').get(doc.id) });
});

// =================== PATIENTS ===================

app.get('/api/patients', (req, res) => {
  res.json(db.prepare('SELECT * FROM patients ORDER BY name').all());
});

app.get('/api/patients/:id', (req, res) => {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const records = db.prepare(`
    SELECT r.*, d.name AS doctor_name FROM records r
    LEFT JOIN doctors d ON d.id = r.doctor_id
    WHERE r.patient_id = ? ORDER BY r.created_at DESC`).all(patient.id);
  const readings = db.prepare('SELECT * FROM readings WHERE patient_id = ? ORDER BY checked_at DESC').all(patient.id);
  res.json({ patient, records, readings });
});

// =================== HEALTH READINGS (vitals) ===================

// Evaluate one vital against a normal range. Returns null if no value given.
function evaluate(label, value, { low, high, unit, lowAdvice, highAdvice }) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) return null;
  const v = Number(value);
  let status = 'Normal', advice = '', abnormal = false;
  if (high !== undefined && v > high) { status = 'High'; advice = highAdvice; abnormal = true; }
  else if (low !== undefined && v < low) { status = 'Low'; advice = lowAdvice; abnormal = true; }
  return { label, value: v, unit, status, advice, abnormal };
}

app.post('/api/health/data', (req, res) => {
  // Accept sugarLevel (legacy) or sugar, plus the new vitals.
  const { patientId } = req.body;
  const sugar = req.body.sugar ?? req.body.sugarLevel;
  const { systolic, diastolic, temperature, heartRate, spo2, weight } = req.body;

  const findings = [
    evaluate('Blood Sugar', sugar, { low: 70, high: 180, unit: 'mg/dL',
      lowAdvice: 'Eat something sweet.', highAdvice: 'High sugar — consult a doctor.' }),
    evaluate('Systolic BP', systolic, { low: 90, high: 140, unit: 'mmHg',
      lowAdvice: 'Blood pressure is low.', highAdvice: 'Blood pressure is high.' }),
    evaluate('Diastolic BP', diastolic, { low: 60, high: 90, unit: 'mmHg',
      lowAdvice: 'Blood pressure is low.', highAdvice: 'Blood pressure is high.' }),
    evaluate('Temperature', temperature, { low: 95, high: 99.5, unit: '°F',
      lowAdvice: 'Body temperature is low.', highAdvice: 'You may have a fever.' }),
    evaluate('Heart Rate', heartRate, { low: 60, high: 100, unit: 'bpm',
      lowAdvice: 'Heart rate is low.', highAdvice: 'Heart rate is high.' }),
    evaluate('SpO₂', spo2, { low: 95, high: undefined, unit: '%',
      lowAdvice: 'Oxygen level is low — seek medical advice.' }),
    // Weight is tracked over time; no fixed normal range, so it stays "Normal".
    evaluate('Weight', weight, { unit: 'kg' }),
  ].filter(Boolean);

  const warning = findings.some(f => f.abnormal);
  const status = findings.length === 0 ? 'No data'
    : warning ? 'Needs attention' : 'All normal';

  if (patientId && findings.length) {
    db.prepare(`INSERT INTO readings
      (patient_id, sugar, systolic, diastolic, temperature, heart_rate, spo2, weight, status, checked_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(patientId, num(sugar), num(systolic), num(diastolic), num(temperature),
           num(heartRate), num(spo2), num(weight), status, now());
  }
  res.json({ status, warning, findings });
});

// Coerce empty/blank vitals to null so they store cleanly.
function num(v) {
  if (v === undefined || v === null || v === '' || Number.isNaN(Number(v))) return null;
  return Number(v);
}

app.get('/api/health/history', (req, res) => {
  const { patientId } = req.query;
  res.json(db.prepare('SELECT * FROM readings WHERE patient_id = ? ORDER BY checked_at DESC').all(patientId));
});

// =================== APPOINTMENTS ===================

// Book (patient). Blocks unavailable doctors.
app.post('/api/appointments', (req, res) => {
  const { patientId, doctorId, date, time, reason } = req.body;
  const doctor = db.prepare('SELECT * FROM doctors WHERE id = ?').get(doctorId);
  if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });
  if (!doctor.available) return res.status(400).json({ success: false, message: `${doctor.name} is not available` });
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const info = db.prepare(`INSERT INTO appointments (patient_id, doctor_id, date, time, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?)`).run(patientId, doctorId, date || null, time || null, reason || null, now());
  res.json({ success: true, appointment: db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid) });
});

// List appointments with optional filters (patientId, doctorId, or all for admin).
app.get('/api/appointments', (req, res) => {
  const { patientId, doctorId } = req.query;
  let sql = `SELECT a.*, p.name AS patient_name, d.name AS doctor_name, d.specialty, d.fee
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id
             JOIN doctors d ON d.id = a.doctor_id`;
  const where = [], params = [];
  if (patientId) { where.push('a.patient_id = ?'); params.push(patientId); }
  if (doctorId)  { where.push('a.doctor_id = ?');  params.push(doctorId); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY a.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// Update status: confirm / complete / cancel.
app.patch('/api/appointments/:id', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Bad status' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, appt.id);
  res.json({ success: true, appointment: db.prepare('SELECT * FROM appointments WHERE id = ?').get(appt.id) });
});

// =================== MEDICAL RECORDS (doctor) ===================

app.post('/api/records', (req, res) => {
  const { patientId, doctorId, appointmentId, diagnosis, notes, prescriptions } = req.body;
  const info = db.prepare(`INSERT INTO records (patient_id, doctor_id, appointment_id, diagnosis, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`).run(patientId, doctorId || null, appointmentId || null, diagnosis || null, notes || null, now());
  const recordId = info.lastInsertRowid;

  // Optional prescriptions: [{ medicineId, quantity, dosage }]. Decrements stock.
  if (Array.isArray(prescriptions)) {
    const insP = db.prepare('INSERT INTO prescriptions (record_id, medicine_id, quantity, dosage) VALUES (?, ?, ?, ?)');
    const dec = db.prepare('UPDATE medicines SET stock = MAX(0, stock - ?) WHERE id = ?');
    for (const p of prescriptions) {
      insP.run(recordId, p.medicineId, p.quantity || 1, p.dosage || null);
      dec.run(p.quantity || 1, p.medicineId);
    }
  }
  res.json({ success: true, record: db.prepare('SELECT * FROM records WHERE id = ?').get(recordId) });
});

// =================== PHARMACY ===================

app.get('/api/medicines', (req, res) => {
  res.json(db.prepare('SELECT * FROM medicines ORDER BY name').all());
});

app.post('/api/medicines', (req, res) => {
  const { name, stock, price } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name required' });
  const info = db.prepare('INSERT INTO medicines (name, stock, price) VALUES (?, ?, ?)')
    .run(name, stock || 0, price || 0);
  res.json({ success: true, medicine: db.prepare('SELECT * FROM medicines WHERE id = ?').get(info.lastInsertRowid) });
});

// Restock / adjust price.
app.patch('/api/medicines/:id', (req, res) => {
  const { stock, price } = req.body;
  const med = db.prepare('SELECT * FROM medicines WHERE id = ?').get(req.params.id);
  if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
  db.prepare('UPDATE medicines SET stock = ?, price = ? WHERE id = ?')
    .run(stock === undefined ? med.stock : stock, price === undefined ? med.price : price, med.id);
  res.json({ success: true, medicine: db.prepare('SELECT * FROM medicines WHERE id = ?').get(med.id) });
});

// =================== BILLING ===================

app.post('/api/bills', (req, res) => {
  const { patientId, appointmentId, items } = req.body;
  const list = Array.isArray(items) ? items : [];
  const amount = list.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const info = db.prepare(`INSERT INTO bills (patient_id, appointment_id, items, amount, status, created_at)
    VALUES (?, ?, ?, ?, 'unpaid', ?)`).run(patientId, appointmentId || null, JSON.stringify(list), amount, now());
  res.json({ success: true, bill: db.prepare('SELECT * FROM bills WHERE id = ?').get(info.lastInsertRowid) });
});

app.get('/api/bills', (req, res) => {
  const { patientId } = req.query;
  const rows = patientId
    ? db.prepare('SELECT * FROM bills WHERE patient_id = ? ORDER BY created_at DESC').all(patientId)
    : db.prepare(`SELECT b.*, p.name AS patient_name FROM bills b JOIN patients p ON p.id = b.patient_id ORDER BY b.created_at DESC`).all();
  res.json(rows.map(b => ({ ...b, items: JSON.parse(b.items || '[]') })));
});

app.patch('/api/bills/:id', (req, res) => {
  const { status } = req.body;
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
  db.prepare('UPDATE bills SET status = ? WHERE id = ?').run(status === 'paid' ? 'paid' : 'unpaid', bill.id);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Hospital API running on port ${PORT}`));
