import React, { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  return (
    <div className="app-container">
      {!user ? <Login onLogin={setUser} /> : <Dashboard user={user} onLogout={() => setUser(null)} />}
    </div>
  );
}
export default App;