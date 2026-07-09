import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function validateEmail(email) {
  return /.+@.+\..+/.test(email);
}

function AuthPages() {
  const navigate = useNavigate();
  const { signup, login, resetPassword, verifyEmail, error } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Product',
    role: 'Employee',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password || (!validateEmail(form.email) && mode !== 'forgot')) {
      setMessage('Please provide a valid email and password.');
      return;
    }
    if (mode === 'register' && (!form.name || !form.department || !form.role)) {
      setMessage('Please complete all registration fields.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'login') {
        await login(form.email, form.password);
        setMessage('Welcome back.');
        navigate('/dashboard');
      } else if (mode === 'register') {
        await signup({ ...form });
        await verifyEmail();
        setMessage('Account created. Please verify your email.');
        navigate('/dashboard');
      } else {
        await resetPassword(form.email);
        setMessage('Password reset email sent.');
      }
    } catch (err) {
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset password'}</h2>
          <p>Secure access to your PrismRecap workspace.</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="Product">Product</option>
                <option value="Engineering">Engineering</option>
                <option value="Operations">Operations</option>
                <option value="Marketing">Marketing</option>
              </select>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="Administrator">Administrator</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          {mode !== 'forgot' && <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'register' ? 'Register' : 'Send reset link'}
          </button>
        </form>
        {(message || error) && <p className="auth-message">{message || error}</p>}
        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button className="link-btn" type="button" onClick={() => setMode('register')}>Create account</button>
              <button className="link-btn" type="button" onClick={() => setMode('forgot')}>Forgot password?</button>
            </>
          ) : mode === 'register' ? (
            <button className="link-btn" type="button" onClick={() => setMode('login')}>Back to login</button>
          ) : (
            <button className="link-btn" type="button" onClick={() => setMode('login')}>Back to login</button>
          )}
        </div>
        <Link to="/dashboard" className="link-btn">Open dashboard</Link>
      </div>
    </div>
  );
}

export default AuthPages;
