import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { ArrowLeft, ArrowRight, Briefcase, Mail, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { PasswordField } from '../UI/PasswordField';
import { useGoogleSignInButton } from './useGoogleSignInButton';

const PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];

export const Register: React.FC = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        evaluation: 'Core', // Default
        proxy: 'US', // Default
        role: 'user' as 'user' | 'client'
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const EVALUATIONS = ['Core', 'Search', 'Ads', 'Map', 'AI Training'];

    const handleGoogleSignup = useCallback(async (credential: string) => {
        setError('');
        setIsLoading(true);
        try {
            await authService.registerWithGoogle(credential, formData.role, formData.proxy);
            navigate(formData.role === 'client' ? '/client-dashboard' : '/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Google signup failed.');
        } finally {
            setIsLoading(false);
        }
    }, [formData.proxy, formData.role, navigate]);
    const { buttonRef: googleButtonRef, isReady: googleReady } = useGoogleSignInButton(handleGoogleSignup);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!formData.username || !formData.password || !formData.confirmPassword || !formData.email) {
            setError('Please fill in all required fields.');
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network
            await authService.register(
                formData.username,
                formData.password,
                formData.email,
                formData.evaluation,
                formData.proxy,
                formData.role,
                formData.confirmPassword
            );
            alert('Registration submitted. Check your email and verify your address, then wait for administrator approval before signing in.');
            navigate('/login');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden py-10">

            {/* Ambient Background Elements */}
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-700/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-blob"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-700/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-blob animation-delay-2000"></div>

            {/* Noise Texture */}

            <div className="relative z-10 w-full max-w-md px-6">
                <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 relative overflow-hidden">

                    {/* Inner Card Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

                    <div className="text-center mb-6">
                        <motion.img
                          src="/A1raters_black_bg.png"
                          alt="A1 Raters Logo"
                          className="h-12 w-auto mx-auto"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                        />
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            A1 Raters
                        </h2>
                        <p className="text-slate-400 text-sm mt-2">Create your secure evaluation profile</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleRegister}>

                        {/* Profile Name */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Profile Name (Login)</label>
                            <div className="relative">
                                <input
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="Your Name"
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="name@example.com"
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        {/* Evaluation & Proxy Row */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Account Type</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as 'user' | 'client' })}
                                className="block w-full px-3 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-cyan-400 transition-all duration-200 text-sm outline-none"
                            >
                                <option value="user" className="text-gray-900">Rater</option>
                                <option value="client" className="text-gray-900">Client</option>
                            </select>
                        </div>

                        {/* Evaluation & Proxy Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Evaluation</label>
                                <div className="relative">
                                    <select
                                        value={formData.evaluation}
                                        onChange={e => setFormData({ ...formData, evaluation: e.target.value })}
                                        className="block w-full px-3 py-3 pl-9 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-cyan-400 transition-all duration-200 text-sm outline-none appearance-none"
                                    >
                                        {EVALUATIONS.map(e => <option key={e} value={e} className="text-gray-900">{e}</option>)}
                                    </select>
                                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Proxy Type</label>
                                <select
                                    value={formData.proxy}
                                    onChange={e => setFormData({ ...formData, proxy: e.target.value })}
                                    className="block w-full px-3 py-3 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-cyan-400 transition-all duration-200 text-sm outline-none"
                                >
                                    {PROXIES.map(p => <option key={p} value={p} className="text-gray-900">{p}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Create Password</label>
                            <PasswordField
                                required
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                placeholder="Min 6 characters"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Confirm Password</label>
                            <PasswordField
                                    required
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="Repeat your password"
                                />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center justify-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 hover:shadow-cyan-400/20 active:scale-[0.98] transition-all duration-200 shadow-xl ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isLoading ? 'Creating Account...' : 'Register Now'}
                            {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </button>

                        <div className="relative py-1 text-center text-xs uppercase tracking-widest text-slate-500"><span className="relative z-10 bg-slate-900 px-3">or</span><span className="absolute inset-x-0 top-1/2 border-t border-white/10" /></div>

                        <div className={`flex min-h-11 w-full justify-center ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
                            <div ref={googleButtonRef} className="w-full" aria-label={googleReady ? 'Continue with Google' : 'Loading Google sign-up'} />
                        </div>

                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="w-full flex items-center justify-center py-2 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                        </button>

                    </form>
                </div>
            </div>
        </div>
    );
};
