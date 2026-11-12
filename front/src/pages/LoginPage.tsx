import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import kbnLogo from '../assets/kbn-logo.jpeg';
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  KeyRoundIcon,
  EyeIcon,
} from '../components/icons';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('salesperson@finovore.com');
  const [password, setPassword] = useState('Sales@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Please provide your staff username/email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Invalid staff credentials. Please check your password.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand & Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white border border-slate-700/80 shadow-lg">
            <img src={kbnLogo} alt="KBN Fruits and Traders" className="w-14 h-14 rounded-xl object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              KBN Fruits and Traders
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Fruit Wholesale &amp; Retail Business Management System
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white">Staff Terminal Login</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Authenticate to unlock your role-based Mandi operational desk.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircleIcon className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Staff Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. salesperson@finovore.com or admin"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>{showPassword ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <KeyRoundIcon className="w-4 h-4" />
                  <span>Sign In to Terminal</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span>Role-Based Access Control Active · APMC Vashi Terminal</span>
        </div>
      </div>
    </div>
  );
};

