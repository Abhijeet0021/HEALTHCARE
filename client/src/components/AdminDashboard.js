import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const TABS = ['Overview', 'Doctors', 'Patients', 'Appointments', 'Pharmacy', 'Billing'];

const AdminDashboard = () => {
  const [tab, setTab] = useState('Overview');
  return (
    <div>
      <nav className="tabs">
        {TABS.map(t => <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>{t}</button>)}
      </nav>
      {tab === 'Overview'     && <Overview />}
      {tab === 'Doctors'      && <Doctors />}
      {tab === 'Patients'     && <Patients />}
      {tab === 'Appointments' && <Appointments />}
      {tab === 'Pharmacy'     && <Pharmacy />}
      {tab === 'Billing'      && <Billing />}
    </div>
  );
};

function Overview() {
  const [s, setS] = useState({ doctors: 0, patients: 0, appts: 0, revenue: 0 });
  useEffect(() => {
    Promise.all([
      api.get('/api/doctors'), api.get('/api/patients'),
      api.get('/api/appointments'), api.get('/api/bills'),
    ]).then(([d, p, a, b]) => setS({
      doctors: d.length, patients: p.length, appts: a.length,
      revenue: b.filter(x => x.status === 'paid').reduce((t, x) => t + x.amount, 0),
    })).catch(() => {});
  }, []);
  const cards = [
    ['Doctors', s.doctors], ['Patients', s.patients],
    ['Appointments', s.appts], ['Revenue (paid)', '₹' + s.revenue],
  ];
  return (
    <div className="grid stats">
      {cards.map(([label, val]) => (
        <div key={label} className="card stat"><div className="stat-num">{val}</div><div className="muted">{label}</div></div>
      ))}
    </div>
  );
}

function Doctors() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', specialty: '', email: '', password: '', fee: 500 });
  const [msg, setMsg] = useState('');
  const load = useCallback(() => api.get('/api/doctors').then(setRows).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault(); setMsg('');
    try { await api.post('/api/doctors', { ...form, fee: Number(form.fee) }); setMsg('Doctor added.'); setForm({ name: '', specialty: '', email: '', password: '', fee: 500 }); load(); }
    catch (err) { setMsg('Error: ' + err.message); }
  };
  const toggle = async (d) => { await api.patch(`/api/doctors/${d.id}`, { available: !d.available }); load(); };

  return (
    <div className="grid">
      <div className="card">
        <h3>Doctors</h3>
        <table>
          <thead><tr><th>Name</th><th>Specialty</th><th>Fee</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.id}>
                <td>{d.name}</td><td>{d.specialty}</td><td>₹{d.fee}</td>
                <td><span className={`pill ${d.available ? 'completed' : 'cancelled'}`}>{d.available ? 'available' : 'unavailable'}</span></td>
                <td><button className="btn-small btn-ghost" onClick={() => toggle(d)}>{d.available ? 'Set off' : 'Set on'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Add Doctor</h3>
        <form onSubmit={add}>
          <input placeholder="Name (Dr. …)" value={form.name} onChange={set('name')} required />
          <input placeholder="Specialty" value={form.specialty} onChange={set('specialty')} required />
          <input type="email" placeholder="Login email" value={form.email} onChange={set('email')} required />
          <input type="password" placeholder="Login password" value={form.password} onChange={set('password')} required />
          <label>Consultation fee (₹)</label>
          <input type="number" value={form.fee} onChange={set('fee')} />
          <button>Add doctor</button>
        </form>
        {msg && <p className="muted">{msg}</p>}
      </div>
    </div>
  );
}

function Patients() {
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.get('/api/patients').then(setRows).catch(() => {}); }, []);
  const open = (id) => api.get(`/api/patients/${id}`).then(setDetail).catch(() => {});

  return (
    <div className="grid">
      <div className="card">
        <h3>Patients</h3>
        {rows.length === 0 ? <p className="muted">No patients yet.</p> : (
          <table>
            <thead><tr><th>Name</th><th>Age</th><th>Phone</th><th></th></tr></thead>
            <tbody>{rows.map(p => (
              <tr key={p.id}><td>{p.name}</td><td>{p.age || '-'}</td><td>{p.phone || '-'}</td>
                <td><button className="btn-small btn-ghost" onClick={() => open(p.id)}>View</button></td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h3>Patient Detail</h3>
        {!detail ? <p className="muted">Select a patient to view records.</p> : (
          <div>
            <p><strong>{detail.patient.name}</strong> · {detail.patient.email}</p>
            <h4>Records</h4>
            {detail.records.length === 0 ? <p className="muted">None.</p> :
              detail.records.map(r => <div key={r.id} className="record"><strong>{r.diagnosis || 'Consultation'}</strong> <span className="muted small">{r.doctor_name}</span><div className="muted">{r.notes}</div></div>)}
            <h4>Sugar readings</h4>
            {detail.readings.length === 0 ? <p className="muted">None.</p> :
              detail.readings.map(h => <div key={h.id} className="listrow"><span>{h.sugar} — {h.status}</span><span className="muted small">{new Date(h.checked_at).toLocaleDateString()}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Appointments() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/api/appointments').then(setRows).catch(() => {}); }, []);
  return (
    <div className="card">
      <h3>All Appointments</h3>
      {rows.length === 0 ? <p className="muted">None.</p> : (
        <table>
          <thead><tr><th>Patient</th><th>Doctor</th><th>Specialty</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>{rows.map(a => (
            <tr key={a.id}><td>{a.patient_name}</td><td>{a.doctor_name}</td><td>{a.specialty}</td><td>{a.date || '-'}</td>
              <td><span className={`pill ${a.status}`}>{a.status}</span></td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function Pharmacy() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', stock: 0, price: 0 });
  const load = useCallback(() => api.get('/api/medicines').then(setRows).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const add = async (e) => { e.preventDefault(); await api.post('/api/medicines', { name: form.name, stock: Number(form.stock), price: Number(form.price) }); setForm({ name: '', stock: 0, price: 0 }); load(); };
  const restock = async (m) => { const n = prompt(`New stock for ${m.name}`, m.stock); if (n !== null) { await api.patch(`/api/medicines/${m.id}`, { stock: Number(n) }); load(); } };

  return (
    <div className="grid">
      <div className="card">
        <h3>Pharmacy Inventory</h3>
        <table>
          <thead><tr><th>Medicine</th><th>Stock</th><th>Price</th><th></th></tr></thead>
          <tbody>{rows.map(m => (
            <tr key={m.id}><td>{m.name}</td>
              <td className={m.stock < 50 ? 'low' : ''}>{m.stock}</td><td>₹{m.price}</td>
              <td><button className="btn-small btn-ghost" onClick={() => restock(m)}>Restock</button></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card">
        <h3>Add Medicine</h3>
        <form onSubmit={add}>
          <input placeholder="Name" value={form.name} onChange={set('name')} required />
          <div className="row">
            <input type="number" placeholder="Stock" value={form.stock} onChange={set('stock')} />
            <input type="number" placeholder="Price" value={form.price} onChange={set('price')} />
          </div>
          <button>Add</button>
        </form>
      </div>
    </div>
  );
}

function Billing() {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => api.get('/api/bills').then(setRows).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  const pay = async (id) => { await api.patch(`/api/bills/${id}`, { status: 'paid' }); load(); };

  return (
    <div className="card">
      <h3>All Bills</h3>
      {rows.length === 0 ? <p className="muted">No bills yet.</p> : (
        <table>
          <thead><tr><th>Patient</th><th>Items</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map(b => (
            <tr key={b.id}>
              <td>{b.patient_name}</td>
              <td className="muted small">{b.items.map(i => i.label).join(', ')}</td>
              <td>₹{b.amount}</td>
              <td><span className={`pill ${b.status === 'paid' ? 'completed' : 'pending'}`}>{b.status}</span></td>
              <td>{b.status !== 'paid' && <button className="btn-small" onClick={() => pay(b.id)}>Mark paid</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

export default AdminDashboard;
