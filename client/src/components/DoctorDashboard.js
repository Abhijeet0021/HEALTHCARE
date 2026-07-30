import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const DoctorDashboard = ({ user }) => {
  const [doctor, setDoctor] = useState(null);
  const [appts, setAppts] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [openId, setOpenId] = useState(null);

  const loadAppts = useCallback((docId) => {
    api.get(`/api/appointments?doctorId=${docId}`).then(setAppts).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/api/me/${user.id}`).then(d => {
      setDoctor(d.profile);
      if (d.profile) loadAppts(d.profile.id);
    });
    api.get('/api/medicines').then(setMedicines).catch(() => {});
  }, [user.id, loadAppts]);

  if (!doctor) return <p>Loading…</p>;

  const setStatus = async (id, status) => { await api.patch(`/api/appointments/${id}`, { status }); loadAppts(doctor.id); };

  return (
    <div>
      <div className="card">
        <h3>My Appointments <span className="muted small">({doctor.name} · {doctor.specialty})</span></h3>
        {appts.length === 0 ? <p className="muted">No appointments.</p> : (
          <table>
            <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {appts.map(a => (
                <React.Fragment key={a.id}>
                  <tr>
                    <td>{a.patient_name}</td><td>{a.date || '-'}</td><td>{a.time || '-'}</td><td>{a.reason || '-'}</td>
                    <td><span className={`pill ${a.status}`}>{a.status}</span></td>
                    <td className="actions">
                      {a.status === 'pending' && <button className="btn-small" onClick={() => setStatus(a.id, 'confirmed')}>Confirm</button>}
                      {a.status === 'confirmed' && <button className="btn-small" onClick={() => setStatus(a.id, 'completed')}>Complete</button>}
                      <button className="btn-small btn-ghost" onClick={() => setOpenId(openId === a.id ? null : a.id)}>
                        {openId === a.id ? 'Close' : 'Record'}
                      </button>
                    </td>
                  </tr>
                  {openId === a.id && (
                    <tr><td colSpan="6">
                      <RecordForm appt={a} doctor={doctor} medicines={medicines}
                        onDone={() => { setOpenId(null); loadAppts(doctor.id); }} />
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

function RecordForm({ appt, doctor, medicines, onDone }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [medId, setMedId] = useState('');
  const [qty, setQty] = useState(1);
  const [dosage, setDosage] = useState('');
  const [makeBill, setMakeBill] = useState(true);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    const prescriptions = medId ? [{ medicineId: Number(medId), quantity: Number(qty), dosage }] : [];
    try {
      await api.post('/api/records', {
        patientId: appt.patient_id, doctorId: doctor.id, appointmentId: appt.id, diagnosis, notes, prescriptions,
      });
      if (makeBill) {
        const items = [{ label: `Consultation — ${doctor.name}`, amount: appt.fee }];
        if (medId) {
          const med = medicines.find(m => m.id === Number(medId));
          if (med) items.push({ label: `${med.name} x${qty}`, amount: med.price * Number(qty) });
        }
        await api.post('/api/bills', { patientId: appt.patient_id, appointmentId: appt.id, items });
      }
      setMsg('Saved.'); onDone();
    } catch (err) { setMsg('Error: ' + err.message); }
  };

  return (
    <form className="subform" onSubmit={submit}>
      <div className="row">
        <input placeholder="Diagnosis" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} required />
        <input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="row">
        <select value={medId} onChange={e => setMedId(e.target.value)}>
          <option value="">No prescription</option>
          {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (stock {m.stock}, ₹{m.price})</option>)}
        </select>
        <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} style={{ maxWidth: 80 }} />
        <input placeholder="Dosage e.g. 1 tab BD" value={dosage} onChange={e => setDosage(e.target.value)} />
      </div>
      <label className="check"><input type="checkbox" checked={makeBill} onChange={e => setMakeBill(e.target.checked)} /> Generate bill (consultation ₹{appt.fee} + medicine)</label>
      <button className="btn-small">Save record</button>
      {msg && <span className="muted small"> {msg}</span>}
    </form>
  );
}

export default DoctorDashboard;
