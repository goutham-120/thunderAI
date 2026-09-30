import React, { useState } from 'react';
import { Shield, Lock, Mail, Eye, EyeOff, AlertTriangle, Clock, CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorType, setErrorType] = useState('error'); // 'error' | 'pending' | 'rejected'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorType('error');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // Login successful — App.jsx will automatically re-render authenticated views
    } catch (err) {
      const message = err.message || 'Login failed';
      if (message.includes('awaiting administrator approval')) {
        setErrorType('pending');
        setErrorMsg('Your account is awaiting administrator approval. Please check back once verified by the system authority.');
      } else if (message.includes('not been approved') || message.includes('REJECTED')) {
        setErrorType('rejected');
        setErrorMsg(message);
      } else if (message.includes('disabled')) {
        setErrorType('rejected');
        setErrorMsg('Your account has been disabled. Please contact the meteorological administrator.');
      } else {
        setErrorType('error');
        setErrorMsg(message.includes('401') || message.includes('Invalid') ? 'Invalid email or password.' : message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1929] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient decorative glow */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-[#0284C7]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-[#0369A1]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2.5 bg-[#0F2942] border border-[#0284C7]/40 rounded-2xl shadow-lg mb-3">
            <Zap className="w-7 h-7 text-[#0284C7]" />
          </div>
          <h1 className="text-2xl font-black text-white font-sora tracking-tight flex items-center justify-center gap-2">
            <span>VAJRA</span>
            <span className="text-[#38BDF8]">AI</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono mt-1 uppercase tracking-wider">
            Ministry of Earth Sciences (MoES) / IMD
          </p>
          <div className="mt-1.5 inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0369A1]/20 text-[#38BDF8] border border-[#0284C7]/30">
            Spatio-Temporal Thunderstorm & Lightning Nowcasting
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0F2942]/95 border border-[#1E3A5F] rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md">
          <div className="mb-5 pb-3 border-b border-[#1E3A5F] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">System Sign In</h2>
              <p className="text-xs text-[#94A3B8]">Enter your accredited operational credentials</p>
            </div>
            <Shield className="w-5 h-5 text-[#38BDF8]" />
          </div>

          {/* Status Message Banners */}
          {errorMsg && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                errorType === 'pending'
                  ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  : errorType === 'rejected'
                  ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                  : 'bg-red-950/40 border-red-600/50 text-red-200'
              }`}
            >
              {errorType === 'pending' ? (
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {errorType === 'pending'
                    ? 'Awaiting Administrator Approval'
                    : errorType === 'rejected'
                    ? 'Access Not Approved'
                    : 'Authentication Error'}
                </p>
                <p className="mt-0.5 opacity-90">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5 font-mono">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.gov.in"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-all font-mono"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#CBD5E1]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 font-mono uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate & Enter</span>
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-4 pt-3 border-t border-[#1E3A5F]/70 text-center">
            <p className="text-xs text-[#94A3B8]">
              Need operational access?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-[#38BDF8] hover:text-white font-bold transition-colors ml-1 underline decoration-dotted"
              >
                Register New Account
              </button>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-[10px] text-[#64748B] font-mono leading-relaxed">
          SECURE GOVERNMENT RESEARCH PLATFORM • RBAC LEVEL 4 ENFORCED • ALL ACCESS ATTEMPTS ARE LOGGED
        </div>
      </div>
    </div>
  );
}
