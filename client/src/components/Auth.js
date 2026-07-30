import React, { useState } from 'react';
import { api } from '../api';

const Auth = ({ onAuth }) => {
  const [mode, setMode] = useState('login');   // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', gender: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const data = mode === 'login'
        ? await api.post('/api/auth/login', { email: form.email, password: form.password })
        : await api.post('/api/auth/register', form);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>🏥 City Hospital</h1>
        <p className="muted">{mode === 'login' ? 'Sign in to continue' : 'Register as a patient'}</p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <input placeholder="Full name" value={form.name} onChange={set('name')} required />
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
          {mode === 'register' && (
            <div className="row">
              <input type="number" placeholder="Age" value={form.age} onChange={set('age')} />
              <select value={form.gender} onChange={set('gender')}>
                <option value="">Gender</option>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              <input placeholder="Phone" value={form.phone} onChange={set('phone')} />
            </div>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create account'}
          </button>
        </form>

        <p className="muted small">
          {mode === 'login' ? "New patient? " : 'Already have an account? '}
          <button className="linkbtn" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? 'Register here' : 'Sign in'}
          </button>
        </p>

        {mode === 'login' && (
          <div className="hint">
            <strong>Demo logins</strong>
            <div>Admin — admin@hospital.com / admin123</div>
            <div>Doctor — sarah.smith@hospital.com / doctor123</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
