import React, { useState } from 'react';
import DoctorList from './DoctorList';
import HealthModal from './HealthModal';

const Dashboard = ({ user, onLogout }) => {
  const [sugar, setSugar] = useState('');
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const checkHealth = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/health/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sugarLevel: parseInt(sugar) })
    });
    const data = await res.json();
    setResult(data);
    setShowModal(true);
  };

  return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <h2>Welcome, {user.name}</h2>
        <button style={{background: '#e74c3c'}} onClick={onLogout}>Logout</button>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Check Health</h3>
          <form onSubmit={checkHealth}>
            <label>Sugar Level:</label>
            <input type="number" value={sugar} onChange={e => setSugar(e.target.value)} required />
            <button type="submit">Check Status</button>
          </form>
        </div>
        <div className="card">
          <DoctorList diagnosis={result} />
        </div>
      </div>

      {showModal && result && (
        <HealthModal 
          status={result.status} 
          advice={result.advice} 
          warning={result.warning} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
};
export default Dashboard;