import React, { useState } from 'react';
import { Shield, UserPlus, Mail, Lock, Building, Phone, User, CheckCircle2, AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage({ onNavigateToLogin }) {
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    phone: '',
    requestedRole: 'WEATHER_FORECASTER',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        organization: formData.organization.trim(),
        phone: formData.phone.trim(),
        requested_role: formData.requestedRole,
      });

      setSuccessMsg(
        res.message || 'Account created successfully. Your account is awaiting administrator approval.'
      );
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit registration request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1929] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient decorative glow */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-[#0284C7]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-[#0369A1]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg z-10 my-6">
        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-2.5 bg-[#0F2942] border border-[#0284C7]/40 rounded-2xl shadow-lg mb-2">
            <Zap className="w-6 h-6 text-[#0284C7]" />
          </div>
          <h1 className="text-2xl font-black text-white font-sora tracking-tight">
            <span>VAJRA</span>
            <span className="text-[#38BDF8]">AI</span>
          </h1>
          <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider mt-0.5">
            Operational Account Access Registration
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0F2942]/95 border border-[#1E3A5F] rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md">
          {successMsg ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-950/60 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-base font-bold text-white mb-1">Registration Submitted</h2>
                <div className="bg-amber-950/40 border border-amber-600/40 p-4 rounded-xl text-xs text-amber-200 text-left leading-relaxed mt-3">
                  <p className="font-semibold text-amber-100 flex items-center gap-1.5 mb-1">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Account Status: PENDING_APPROVAL
                  </p>
                  {successMsg}
                </div>
              </div>

              <p className="text-xs text-[#94A3B8] leading-relaxed">
                An administrator will review your requested credentials and role assignment. Once verified, you will be able to sign in directly.
              </p>

              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 pb-3 border-b border-[#1E3A5F] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Request Account</h2>
                  <p className="text-xs text-[#94A3B8]">Select your specialized operational role</p>
                </div>
                <UserPlus className="w-5 h-5 text-[#38BDF8]" />
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-950/40 border border-red-600/50 rounded-xl text-xs text-red-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Dr. Rajesh Kumar"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="forecaster@imd.gov.in"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Organization & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                      Organization / Dept
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="organization"
                        value={formData.organization}
                        onChange={handleChange}
                        placeholder="IMD / Discom / SDMA"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Requested Role (ADMIN NOT ALLOWED) */}
                <div>
                  <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5 font-mono">
                    Requested Account Role *
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <label
                      className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formData.requestedRole === 'WEATHER_FORECASTER'
                          ? 'bg-[#0284C7]/20 border-[#38BDF8] text-white'
                          : 'bg-[#0A1929] border-[#1E3A5F] text-[#94A3B8] hover:border-[#38BDF8]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="requestedRole"
                        value="WEATHER_FORECASTER"
                        checked={formData.requestedRole === 'WEATHER_FORECASTER'}
                        onChange={handleChange}
                        className="mt-1 mr-3 text-[#0284C7] focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          Weather Forecaster
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#0284C7]/40 text-[#38BDF8] rounded">
                            METEOROLOGICAL OPS
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          Full operational access: Live nowcast, GIS layers, Storm tracking, XAI, Radar/Sat replay, What-If simulation.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formData.requestedRole === 'ELECTRICAL_INFRASTRUCTURE'
                          ? 'bg-[#0284C7]/20 border-[#38BDF8] text-white'
                          : 'bg-[#0A1929] border-[#1E3A5F] text-[#94A3B8] hover:border-[#38BDF8]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="requestedRole"
                        value="ELECTRICAL_INFRASTRUCTURE"
                        checked={formData.requestedRole === 'ELECTRICAL_INFRASTRUCTURE'}
                        onChange={handleChange}
                        className="mt-1 mr-3 text-[#0284C7] focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          Electrical & Infrastructure
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded">
                            RISK & UTILITIES
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          Prioritized severe storm & lightning hazard warnings, storm trajectory, utility risk indicators, and What-If scenario.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-all ${
                        formData.requestedRole === 'USER'
                          ? 'bg-[#0284C7]/20 border-[#38BDF8] text-white'
                          : 'bg-[#0A1929] border-[#1E3A5F] text-[#94A3B8] hover:border-[#38BDF8]/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="requestedRole"
                        value="USER"
                        checked={formData.requestedRole === 'USER'}
                        onChange={handleChange}
                        className="mt-1 mr-3 text-[#0284C7] focus:ring-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          Standard User
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-500/20 text-slate-300 rounded">
                            GENERAL OBSERVER
                          </span>
                        </div>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">
                          Overview dashboard, spatial nowcast, forecast matrix, active alerts, and scenario simulations.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#CBD5E1] mb-1 font-mono">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0A1929] border border-[#1E3A5F] text-white text-xs placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 font-mono uppercase tracking-wider mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Submit for Admin Approval</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-4 pt-3 border-t border-[#1E3A5F]/70 text-center">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-xs text-[#38BDF8] hover:text-white font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Already have an account? Sign In</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
