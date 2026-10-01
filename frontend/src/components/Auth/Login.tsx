import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { PasswordField } from '../UI/PasswordField';
import { ArrowRight, MailCheck, UserPlus } from 'lucide-react';
import { useGoogleSignInButton } from './useGoogleSignInButton';

export const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'rater' | 'client'>('rater');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState(() =>
    searchParams.get('verified') === '1'
      ? 'Email verified. You can now sign in; account approval is still required.'
      : ''
  );
  const navigate = useNavigate();

  const handleGoogleSignIn = useCallback(async (credential: string) => {
    setError('');
    setVerificationNotice('');
    setIsLoading(true);

    try {
      const user = await authService.registerWithGoogle(
        credential,
        mode === 'client' ? 'client' : 'user'
      );

      if (mode === 'client' && user.role !== 'client' && user.role !== 'admin') {
        await authService.logout();
        setError('This account does not have client access');
        return;
      }

      navigate(user.role === 'client' ? '/client-dashboard' : '/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign in with Google';
      setError(message);
      setShowResendVerification(false);
    } finally {
      setIsLoading(false);
    }
  }, [mode, navigate]);
  const { buttonRef: googleButtonRef, isReady: googleReady } = useGoogleSignInButton(handleGoogleSignIn);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationNotice('');
    setShowResendVerification(false);
    setIsLoading(true);

    try {
      const user = await authService.login(
        mode === 'rater' ? usernameOrEmail : clientEmail,
        mode === 'rater' ? password : clientPassword
      );

      if (!user) {
        setError('Invalid email or password');
        return;
      }

      if (mode === 'client' && user.role !== 'client' && user.role !== 'admin') {
        await authService.logout();
        setError('This account does not have client access');
        return;
      }

      navigate(mode === 'client' ? '/client-dashboard' : '/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to sign in';
      setError(message);
      setShowResendVerification(message.toLowerCase().includes('verify your email'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const email = mode === 'rater' ? usernameOrEmail : clientEmail;
    if (!email.includes('@')) {
      setError('Enter your email address to resend the verification link.');
      return;
    }

    setResendLoading(true);
    setError('');
    try {
      setVerificationNotice(await authService.resendVerificationEmail(email));
      setShowResendVerification(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const toggleMode = (newMode: 'rater' | 'client') => {
    setMode(newMode);
    setError('');
    setVerificationNotice('');
    setShowResendVerification(false);
    setClientEmail('');
    setClientPassword('');
    setPassword('');
    setUsernameOrEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden py-12 px-4">
      {/* Ambient Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-700/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-blob"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-700/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-emerald-700/20 rounded-full blur-[100px] mix-blend-screen opacity-40 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 sm:p-10 relative overflow-hidden"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="text-center mb-6">
            <motion.img
              src="/A1raters_black_bg.png"
              alt="A1 Raters Logo"
              className="h-12 w-auto mx-auto"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
            />
            <h2 className="text-3xl font-bold text-white tracking-tight">A1 Raters</h2>
          </div>

          {/* Toggle Switch */}
          <motion.div
            className="flex bg-white/10 p-1 rounded-xl mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <button
              type="button"
              onClick={() => toggleMode('rater')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'rater'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Rater Login
            </button>
            <button
              type="button"
              onClick={() => toggleMode('client')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                mode === 'client'
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Client Access
            </button>
          </motion.div>

          <motion.form
            className="space-y-6"
            onSubmit={handleLogin}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.4 }}
          >
            {mode === 'rater' ? (
              <>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                  <label htmlFor="user" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                    Email or username
                  </label>
                  <input
                    id="user"
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                    placeholder="Enter your email or username"
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                    Password
                  </label>
                    <PasswordField
                      id="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                      placeholder="••••••••"
                    />
                </motion.div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">
                  Enter Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="block w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                    placeholder="name@example.com"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 px-1">
                  Enter the email address used in reports to view report history.
                </p>

                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label htmlFor="client-pass" className="block text-sm font-medium text-blue-50 mb-1.5 ml-1">
                    Password
                  </label>
                  <PasswordField
                      id="client-pass"
                      required
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="block w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-blue-200/50 focus:bg-white/10 focus:border-red-400 focus:ring-4 focus:ring-red-500/20 transition-all duration-200 text-sm outline-none"
                      placeholder="Enter Access Code"
                    />
                </motion.div>
              </motion.div>
            )}

            {error && (
              <motion.div
                className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center justify-center"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {showResendVerification && (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-cyan-300 hover:text-white disabled:opacity-60"
              >
                <MailCheck className="h-4 w-4" />
                {resendLoading ? 'Sending verification email...' : 'Resend verification email'}
              </button>
            )}

            {verificationNotice && (
              <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-center text-sm text-emerald-200">
                {verificationNotice}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-slate-900 bg-white hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 shadow-xl ${
                isLoading ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              {isLoading ? 'Signing in...' : mode === 'rater' ? 'Sign in' : 'Open Client Dashboard'}
              {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
            </motion.button>

            <div className="relative py-1 text-center text-xs uppercase tracking-widest text-slate-500">
              <span className="relative z-10 bg-slate-900 px-3">or</span>
              <span className="absolute inset-x-0 top-1/2 border-t border-white/10" />
            </div>

            <div className={`flex justify-center py-4 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
              <div ref={googleButtonRef} className="w-[50px] h-[50px] flex items-center justify-center" aria-label={googleReady ? 'Sign in with Google' : 'Loading Google sign-in'} />
            </div>

            {mode === 'rater' && (
              <motion.div
                className="text-center pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full py-3 rounded-xl border border-white/20 text-cyan-300 hover:bg-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Create New Account
                </button>
              </motion.div>
            )}
          </motion.form>

          <motion.div
            className="mt-8 text-center text-xs text-blue-300/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            Protected by secure evaluation protocols.
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
