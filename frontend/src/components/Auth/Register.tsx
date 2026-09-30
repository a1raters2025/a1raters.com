import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { ArrowLeft, ArrowRight, Briefcase, ChevronDown, LoaderCircle, Mail, Shield, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { PasswordField } from '../UI/PasswordField';

declare global {
    interface Window {
        google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; prompt: () => void } } };
    }
}

interface Country {
    name: { common: string };
    cca2: string;
    flags: { svg?: string; png?: string };
}

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
    const [countries, setCountries] = useState<Country[]>([]);
    const [countriesLoading, setCountriesLoading] = useState(true);
    const [countryMenuOpen, setCountryMenuOpen] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
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

    useEffect(() => {
        let mounted = true;
        apiClient.get<{ status: string; data: Country[] }>('/user/countries')
            .then(response => {
                if (!Array.isArray(response.data)) {
                    throw new Error('The country service returned an invalid response.');
                }
                if (mounted) {
                    setCountries(response.data.sort((a, b) => a.name.common.localeCompare(b.name.common)));
                }
            })
            .catch((err: unknown) => {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unable to load countries.');
                }
            })
            .finally(() => {
                if (mounted) setCountriesLoading(false);
            });

        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) return;

        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        const initializeGoogle = () => {
            if (!window.google) return;
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: ({ credential }) => { void handleGoogleSignup(credential); },
            });
            setGoogleReady(true);
        };

        if (existingScript) {
            initializeGoogle();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGoogle;
        document.head.appendChild(script);
    }, [handleGoogleSignup]);

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
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Proxy Type</label>
                                <button type="button" onClick={() => setCountryMenuOpen(open => !open)} className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-white outline-none focus:border-cyan-400">
                                    {formData.proxy && <img src={countries.find(country => country.cca2 === formData.proxy)?.flags.svg} alt="" className="h-4 w-6 object-cover" />}
                                    <span className="flex-1 truncate">{countries.find(country => country.cca2 === formData.proxy)?.name.common || (countriesLoading ? 'Loading countries...' : 'Select country')}</span>
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                </button>
                                {countryMenuOpen && <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl">
                                    {countries.map(country => <button type="button" key={country.cca2} onClick={() => { setFormData({ ...formData, proxy: country.cca2 }); setCountryMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-800">
                                        <img src={country.flags.svg || country.flags.png} alt="" className="h-4 w-6 object-cover" />
                                        <span>{country.name.common}</span>
                                    </button>)}
                                </div>}
                                <Shield className="pointer-events-none absolute left-3 top-9 hidden h-4 w-4 text-slate-400" />
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

                        <button type="button" disabled={!googleReady || isLoading} onClick={() => window.google?.accounts.id.prompt()} className="group flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3.5 px-4 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/20 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">
                            {isLoading ? (
                                <LoaderCircle className="h-5 w-5 animate-spin text-white/80" />
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            )}
                            {googleReady ? 'Continue with Google' : 'Google signup unavailable'}
                        </button>

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
