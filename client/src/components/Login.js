import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const data = await response.json();
      if (data.success) onLogin(data.user);
    } catch (err) {
      alert('Cannot connect to server');
    }
  };

  return (
    <div style={{textAlign: 'center'}}>
      <h1>Healthcare App</h1>
      <p>Sign in to monitor your health</p>
      <form className="login-form" onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button type="submit">Sign In</button>
      </form>
    </div>
  );
};

export default Login;