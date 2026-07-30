import React, { useState } from 'react';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';

function App() {
  const [user, setUser] = useState(null);

  if (!user) return <Auth onAuth={setUser} />;

  const logout = () => setUser(null);
  return (
    <div className="app">
      <header className="topbar">
        <h1>🏥 City Hospital</h1>
        <div className="topbar-right">
          <span>{user.name} · <em>{user.role}</em></span>
          <button className="btn-danger" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="content">
        {user.role === 'admin'   && <AdminDashboard user={user} />}
        {user.role === 'doctor'  && <DoctorDashboard user={user} />}
        {user.role === 'patient' && <PatientDashboard user={user} />}
      </main>
    </div>
  );
}

export default App;
