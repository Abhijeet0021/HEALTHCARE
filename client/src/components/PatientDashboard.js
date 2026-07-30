import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const TABS = ['Health Check', 'Book Appointment', 'My Appointments', 'My Records', 'My Bills'];

const PatientDashboard = ({ user }) => {
  const [tab, setTab] = useState('Health Check');
  const [patientId, setPatientId] = useState(null);

  useEffect(() => {
    api.get(`/api/me/${user.id}`).then(d => setPatientId(d.profile && d.profile.id)).catch(() => {});
  }, [user.id]);

  if (!patientId) return <p>Loading your profile…</p>;

  return (
    <div>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>
      {tab === 'Health Check'     && <HealthCheck patientId={patientId} />}
      {tab === 'Book Appointment' && <BookAppointment patientId={patientId} />}
      {tab === 'My Appointments'  && <MyAppointments patientId={patientId} />}
      {tab === 'My Records'       && <MyRecords patientId={patientId} />}
      {tab === 'My Bills'         && <MyBills patientId={patientId} />}
    </div>
  );
};

// The vitals shown in the form, in order. `key` matches the API field name.
const VITALS = [
  { key: 'sugar',       label: 'Blood Sugar',   unit: 'mg/dL', placeholder: '70–180' },
  { key: 'systolic',    label: 'Systolic BP',   unit: 'mmHg',  placeholder: '90–140' },
  { key: 'diastolic',   label: 'Diastolic BP',  unit: 'mmHg',  placeholder: '60–90' },
  { key: 'temperature', label: 'Temperature',   unit: '°F',    placeholder: '97–99' },
  { key: 'heartRate',   label: 'Heart Rate',    unit: 'bpm',   placeholder: '60–100' },
  { key: 'spo2',        label: 'SpO₂',          unit: '%',     placeholder: '95–100' },
  { key: 'weight',      label: 'Weight',        unit: 'kg',    placeholder: 'e.g. 68' },
];

const emptyVitals = { sugar: '', systolic: '', diastolic: '', temperature: '', heartRate: '', spo2: '', weight: '' };

function HealthCheck({ patientId }) {
  const [vitals, setVitals] = useState(emptyVitals);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const load = useCallback(() => {
    api.get(`/api/health/history?patientId=${patientId}`).then(setHistory).catch(() => {});
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setVitals({ ...vitals, [k]: e.target.value });

  const check = async (e) => {
    e.preventDefault();
    const anyValue = Object.values(vitals).some(v => v !== '');
    if (!anyValue) return alert('Enter at least one vital to record.');
    const data = await api.post('/api/health/data', { patientId, ...vitals });
    setResult(data); setVitals(emptyVitals); load();
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>Record Vitals</h3>
        <p className="muted small">Fill in any values you have — blanks are skipped.</p>
        <form onSubmit={check}>
          <div className="vitals-grid">
            {VITALS.map(v => (
              <div key={v.key}>
                <label>{v.label} <span className="muted">({v.unit})</span></label>
                <input type="number" step="any" placeholder={v.placeholder}
                  value={vitals[v.key]} onChange={set(v.key)} />
              </div>
            ))}
          </div>
          <button>Check &amp; Save</button>
        </form>

        {result && (
          <div className={`banner ${result.warning ? 'warn' : 'ok'}`}>
            <strong>{result.status}</strong>
            <div className="findings">
              {result.findings.map((f, i) => (
                <div key={i} className="listrow">
                  <span>{f.label}: <strong>{f.value}</strong> {f.unit}</span>
                  <span className={`pill ${f.status === 'Normal' ? 'completed' : 'pending'}`}>
                    {f.status}{f.advice ? ` — ${f.advice}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>History</h3>
        {history.length === 0 ? <p className="muted">No readings yet.</p> :
          history.map(h => (
            <div key={h.id} className="record">
              <div className="listrow">
                <span className={`pill ${h.status === 'All normal' ? 'completed' : 'pending'}`}>{h.status}</span>
                <span className="muted small">{new Date(h.checked_at).toLocaleString()}</span>
              </div>
              <div className="vital-chips">
                {h.sugar != null && <span className="chip">Sugar {h.sugar}</span>}
                {h.systolic != null && h.diastolic != null && <span className="chip">BP {h.systolic}/{h.diastolic}</span>}
                {h.temperature != null && <span className="chip">Temp {h.temperature}°F</span>}
                {h.heart_rate != null && <span className="chip">HR {h.heart_rate}</span>}
                {h.spo2 != null && <span className="chip">SpO₂ {h.spo2}%</span>}
                {h.weight != null && <span className="chip">Wt {h.weight}kg</span>}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function BookAppointment({ patientId }) {
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({ doctorId: '', date: '', time: '', reason: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/api/doctors').then(setDoctors).catch(() => {}); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const book = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/api/appointments', { patientId, ...form, doctorId: Number(form.doctorId) });
      setMsg('✅ Appointment booked — check "My Appointments".');
      setForm({ doctorId: '', date: '', time: '', reason: '' });
    } catch (err) { setMsg('❌ ' + err.message); }
  };

  return (
    <div className="card">
      <h3>Book an Appointment</h3>
      <form onSubmit={book}>
        <label>Doctor</label>
        <select value={form.doctorId} onChange={set('doctorId')} required>
          <option value="">Select a doctor…</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id} disabled={!d.available}>
              {d.name} — {d.specialty} (₹{d.fee}){d.available ? '' : ' — unavailable'}
            </option>
          ))}
        </select>
        <div className="row">
          <input type="date" value={form.date} onChange={set('date')} required />
          <input type="time" value={form.time} onChange={set('time')} required />
        </div>
        <label>Reason</label>
        <input value={form.reason} onChange={set('reason')} placeholder="e.g. high sugar" />
        <button>Book</button>
      </form>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}

function MyAppointments({ patientId }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => {
    api.get(`/api/appointments?patientId=${patientId}`).then(setRows).catch(() => {});
  }, [patientId]);
  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => { await api.patch(`/api/appointments/${id}`, { status: 'cancelled' }); load(); };

  if (rows.length === 0) return <div className="card"><p className="muted">No appointments yet.</p></div>;
  return (
    <div className="card">
      <h3>My Appointments</h3>
      <table>
        <thead><tr><th>Doctor</th><th>Specialty</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map(a => (
            <tr key={a.id}>
              <td>{a.doctor_name}</td><td>{a.specialty}</td><td>{a.date || '-'}</td><td>{a.time || '-'}</td>
              <td><span className={`pill ${a.status}`}>{a.status}</span></td>
              <td>{['pending', 'confirmed'].includes(a.status) &&
                <button className="btn-small btn-danger" onClick={() => cancel(a.id)}>Cancel</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyRecords({ patientId }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/api/patients/${patientId}`).then(setData).catch(() => {}); }, [patientId]);
  if (!data) return <p>Loading…</p>;
  return (
    <div className="card">
      <h3>Medical Records</h3>
      {data.records.length === 0 ? <p className="muted">No records yet.</p> :
        data.records.map(r => (
          <div key={r.id} className="record">
            <div><strong>{r.diagnosis || 'Consultation'}</strong> <span className="muted small">by {r.doctor_name || 'Doctor'} · {new Date(r.created_at).toLocaleDateString()}</span></div>
            {r.notes && <div className="muted">{r.notes}</div>}
          </div>
        ))}
    </div>
  );
}

function MyBills({ patientId }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => {
    api.get(`/api/bills?patientId=${patientId}`).then(setRows).catch(() => {});
  }, [patientId]);
  useEffect(() => { load(); }, [load]);
  const pay = async (id) => { await api.patch(`/api/bills/${id}`, { status: 'paid' }); load(); };

  if (rows.length === 0) return <div className="card"><p className="muted">No bills yet.</p></div>;
  return (
    <div className="card">
      <h3>My Bills</h3>
      {rows.map(b => (
        <div key={b.id} className="record">
          <div className="listrow">
            <strong>₹{b.amount}</strong>
            <span className={`pill ${b.status === 'paid' ? 'completed' : 'pending'}`}>{b.status}</span>
          </div>
          <ul className="items">{b.items.map((it, i) => <li key={i}>{it.label} — ₹{it.amount}</li>)}</ul>
          {b.status !== 'paid' && <button className="btn-small" onClick={() => pay(b.id)}>Pay now</button>}
        </div>
      ))}
    </div>
  );
}

export default PatientDashboard;
