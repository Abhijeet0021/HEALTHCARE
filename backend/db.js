// SQLite database layer for the Hospital Management System.
// Uses Node's BUILT-IN SQLite (node:sqlite) — no native build, no extra install.
// Requires Node 22.5+ (you're on 26, so you're good).

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const crypto = require('crypto');

const db = new DatabaseSync(path.join(__dirname, 'hospital.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// --- Schema ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  email     TEXT UNIQUE NOT NULL,
  password  TEXT NOT NULL,          -- salt:hash (scrypt)
  role      TEXT NOT NULL           -- 'admin' | 'doctor' | 'patient'
);

CREATE TABLE IF NOT EXISTS doctors (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER REFERENCES users(id),
  name      TEXT NOT NULL,
  specialty TEXT NOT NULL,
  fee       REAL NOT NULL DEFAULT 500,
  available INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS patients (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER REFERENCES users(id),
  name      TEXT NOT NULL,
  email     TEXT,
  age       INTEGER,
  gender    TEXT,
  phone     TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  doctor_id  INTEGER NOT NULL REFERENCES doctors(id),
  date       TEXT,
  time       TEXT,
  reason     TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',   -- pending|confirmed|completed|cancelled
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL REFERENCES patients(id),
  doctor_id      INTEGER REFERENCES doctors(id),
  appointment_id INTEGER REFERENCES appointments(id),
  diagnosis      TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER REFERENCES patients(id),
  sugar      REAL,
  systolic   REAL,
  diastolic  REAL,
  temperature REAL,
  heart_rate REAL,
  spo2       REAL,
  weight     REAL,
  status     TEXT,
  checked_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id   INTEGER REFERENCES records(id),
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  quantity    INTEGER NOT NULL DEFAULT 1,
  dosage      TEXT
);

CREATE TABLE IF NOT EXISTS bills (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     INTEGER NOT NULL REFERENCES patients(id),
  appointment_id INTEGER REFERENCES appointments(id),
  items          TEXT,          -- JSON array of {label, amount}
  amount         REAL NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'unpaid',   -- unpaid|paid
  created_at     TEXT NOT NULL
);
`);

// --- Migrations: add any columns missing from an older readings table ---
(function migrateReadings() {
  const cols = db.prepare('PRAGMA table_info(readings)').all().map(c => c.name);
  const wanted = {
    systolic: 'REAL', diastolic: 'REAL', temperature: 'REAL',
    heart_rate: 'REAL', spo2: 'REAL', weight: 'REAL',
  };
  for (const [name, type] of Object.entries(wanted)) {
    if (!cols.includes(name)) db.exec(`ALTER TABLE readings ADD COLUMN ${name} ${type}`);
  }
})();

// --- Password helpers (scrypt, no external deps) ---
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(plain, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

// --- Seed data (only on first run) ---
function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return;

  // Admin
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)')
    .run('Admin', 'admin@hospital.com', hashPassword('admin123'), 'admin');

  // Doctors (each gets a login: <first name lowercase>@hospital.com / doctor123)
  const seedDoctors = [
    { name: 'Dr. Sarah Smith',    specialty: 'Endocrinologist',   fee: 800, available: 1 },
    { name: 'Dr. John Doe',       specialty: 'General Physician',  fee: 400, available: 1 },
    { name: 'Dr. Mike Ross',      specialty: 'Endocrinologist',   fee: 800, available: 1 },
    { name: 'Dr. John Williams',  specialty: 'Cardiologist',      fee: 1200, available: 0 },
    { name: 'Dr. Emily Johnson',  specialty: 'Dermatologist',     fee: 600, available: 1 },
    { name: 'Dr. Michael Brown',  specialty: 'Neurologist',       fee: 1500, available: 1 },
  ];
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
  const insertDoc = db.prepare('INSERT INTO doctors (user_id, name, specialty, fee, available) VALUES (?, ?, ?, ?, ?)');
  for (const d of seedDoctors) {
    // e.g. "Dr. Sarah Smith" -> "sarah.smith@hospital.com" (unique per doctor)
    const email = d.name.replace(/^Dr\.\s*/, '').toLowerCase().replace(/\s+/g, '.') + '@hospital.com';
    const info = insertUser.run(d.name, email, hashPassword('doctor123'), 'doctor');
    insertDoc.run(info.lastInsertRowid, d.name, d.specialty, d.fee, d.available);
  }

  // Pharmacy stock
  const insertMed = db.prepare('INSERT INTO medicines (name, stock, price) VALUES (?, ?, ?)');
  [
    ['Metformin', 200, 5],
    ['Insulin', 80, 120],
    ['Paracetamol', 500, 2],
    ['Amoxicillin', 150, 15],
    ['Atorvastatin', 120, 20],
    ['Aspirin', 400, 3],
  ].forEach(m => insertMed.run(...m));

  console.log('Seeded admin, doctors, and pharmacy stock.');
}

seed();

module.exports = { db, hashPassword, verifyPassword };
