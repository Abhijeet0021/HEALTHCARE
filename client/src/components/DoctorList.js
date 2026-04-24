import React, { useState, useEffect } from 'react';

const DoctorList = ({ diagnosis }) => {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (diagnosis && diagnosis.status.includes('Sugar')) setSearch('Endocrinologist');
  }, [diagnosis]);

  useEffect(() => {
    fetch(`/api/doctors?specialty=${search}`)
      .then(res => res.json())
      .then(data => setDoctors(data));
  }, [search]);

  const book = async (id, name) => {
    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: id })
    });
    alert(`Booked with ${name}`);
  };

  return (
    <div>
      <h3>Find Specialist</h3>
      <input placeholder="Filter..." value={search} onChange={e => setSearch(e.target.value)} />
      {doctors.map(d => (
        <div key={d.id} className="doctor-item">
          <div>
            <strong>{d.name}</strong>
            <p style={{margin:0}}>{d.specialty}</p>
          </div>
          <button onClick={() => book(d.id, d.name)}>Book</button>
        </div>
      ))}
    </div>
  );
};
export default DoctorList;