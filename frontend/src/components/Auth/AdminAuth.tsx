import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import { authService } from '../../services/authService';
import { PasswordField } from '../UI/PasswordField';

type AdminAuthProps = { mode: 'login' | 'register' };

export const AdminAuth: React.FC<AdminAuthProps> = ({ mode }) => {
  const navigate = useNavigate();
  const isRegister = mode === 'register';
  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const unlock = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (passcode.trim().length < 4) {
      setError('Enter the administrator passcode to continue.');
      return;
    }
    setUnlocked(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (isRegister && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const user = isRegister
        ? await (async () => {
            await authService.registerAdmin(form.username, form.email, form.password, form.confirmPassword, passcode);
            return authService.login(form.email, form.password);
          })()
        : await authService.login(form.email || form.username, form.password);
      if (!user || user.role !== 'admin') {
        await authService.logout();
        throw new Error(isRegister ? 'Admin registration was not completed.' : 'This account does not have administrator access.');
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to complete administrator access.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="admin-auth-page">
    <section className="admin-auth-card glass-card-strong">
      <div className="admin-auth-icon"><ShieldCheck size={24} /></div>
      <span className="eyebrow">Restricted access</span>
      <h1>{isRegister ? 'Create administrator account' : 'Administrator sign in'}</h1>
      <p className="admin-auth-description">This area is intentionally unlisted. Administrator access requires a valid passcode.</p>
      {!unlocked ? <form onSubmit={unlock} className="admin-auth-form"><label>Administrator passcode<PasswordField autoFocus required value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter passcode" /></label><button className="btn-glass-primary" type="submit">Continue <ArrowRight size={16} /></button></form> : <form onSubmit={(event) => void submit(event)} className="admin-auth-form">{isRegister && <label>Username<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Admin username" /></label>}<label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@example.com" /></label><label>Password<PasswordField required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Secure password" /></label>{isRegister && <label>Confirm password<PasswordField required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Repeat password" /></label>}<button disabled={loading} className="btn-glass-primary" type="submit">{loading ? 'Working...' : isRegister ? <><UserPlus size={16} /> Create admin account</> : <><LockKeyhole size={16} /> Sign in</>}</button></form>}
      {error && <p className="admin-auth-error">{error}</p>}
      <div className="admin-auth-links">{isRegister ? <button onClick={() => navigate('/admin/login')}>Already have admin access? Sign in</button> : <button onClick={() => navigate('/admin/register')}>Need to create an admin account?</button>}<button onClick={() => navigate('/login')}>Return to standard login</button></div>
    </section>
  </main>;
};
