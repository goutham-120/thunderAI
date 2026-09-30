import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  UserX, 
  Check, 
  X, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Filter,
  CheckCircle2,
  Lock,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';

export default function AdminDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('pending'); // 'pending' | 'all'
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Rejection modal state
  const [rejectingUser, setRejectingUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [statsRes, pendingRes, allRes] = await Promise.all([
        api.getAdminStats(),
        api.getPendingUsers(),
        api.getAdminUsers(),
      ]);

      setStats(statsRes);
      setPendingUsers(pendingRes?.pending_users || []);
      setAllUsers(allRes?.users || []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load administrator data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleApprove = async (userId) => {
    setActionLoadingId(userId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.approveUser(userId);
      setSuccessMsg(`User #${userId} successfully approved.`);
      await fetchAdminData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingUser) return;
    setActionLoadingId(rejectingUser.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.rejectUser(rejectingUser.id, rejectionReason);
      setSuccessMsg(`User #${rejectingUser.id} rejected.`);
      setRejectingUser(null);
      setRejectionReason('');
      await fetchAdminData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject user');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoadingId(userId);
    setErrorMsg('');
    try {
      await api.updateUserRole(userId, newRole);
      setSuccessMsg(`User #${userId} role updated to ${newRole}.`);
      await fetchAdminData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user role');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusToggle = async (user) => {
    const nextStatus = user.status === 'DISABLED' ? 'APPROVED' : 'DISABLED';
    setActionLoadingId(user.id);
    setErrorMsg('');
    try {
      await api.updateUserStatus(user.id, nextStatus);
      setSuccessMsg(`User #${user.id} status changed to ${nextStatus}.`);
      await fetchAdminData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Chief Admin';
      case 'WEATHER_FORECASTER':
        return 'Weather Forecaster';
      case 'ELECTRICAL_INFRASTRUCTURE':
        return 'Electrical & Infra';
      case 'USER':
        return 'Standard User';
      default:
        return role;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">APPROVED</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono animate-pulse">PENDING APPROVAL</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 font-mono">REJECTED</span>;
      case 'DISABLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-400 font-mono">DISABLED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F8FCFE] border border-[#D0E3F0] px-4 py-3 rounded-xl shadow-xs gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight uppercase flex items-center gap-2">
              VAJRA Security & Role Access Portal
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-sans font-semibold">
                ADMIN CONSOLE
              </span>
            </h1>
            <p className="text-xs text-[#47637E] font-sans">
              Ministry of Earth Sciences / IMD Central Authority User Approval System
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="text-xs font-mono text-[#12324E] hover:text-[#0284C7] bg-[#EEF6FB] hover:bg-[#E5F0F7] px-3 py-1.5 rounded-md border border-[#D0E3F0] transition-colors flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#0284C7] ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#D0E3F0] rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-[#5E82A6] font-mono">
            <span>TOTAL USERS</span>
            <Users className="w-4 h-4 text-[#0284C7]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0F2942] mt-1">
            {stats?.total_users ?? 0}
          </div>
          <div className="text-[10px] text-[#5E82A6] font-mono mt-0.5">
            Registered in Database
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-2xs bg-amber-50/30">
          <div className="flex items-center justify-between text-xs text-amber-700 font-mono">
            <span>PENDING APPROVAL</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">
            {stats?.pending_approvals ?? 0}
          </div>
          <div className="text-[10px] text-amber-700 font-mono mt-0.5">
            Awaiting Admin Review
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-2xs bg-emerald-50/30">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-mono">
            <span>APPROVED USERS</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
            {stats?.approved_accounts ?? 0}
          </div>
          <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
            Active Operating Access
          </div>
        </div>

        <div className="bg-white border border-[#D0E3F0] rounded-xl p-3 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
            <span>REJECTED / DISABLED</span>
            <UserX className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-[#0F2942] mt-1">
            {(stats?.rejected_accounts ?? 0) + (stats?.disabled_accounts ?? 0)}
          </div>
          <div className="text-[10px] text-[#5E82A6] font-mono mt-0.5">
            Rejected: {stats?.rejected_accounts ?? 0} • Disabled: {stats?.disabled_accounts ?? 0}
          </div>
        </div>
      </div>

      {/* Role Breakdown Bar */}
      {stats?.users_by_role && (
        <div className="bg-white border border-[#D0E3F0] rounded-xl p-3 shadow-2xs flex flex-wrap items-center gap-3 text-xs font-mono">
          <span className="font-bold text-[#0F2942]">Active Roles Distribution:</span>
          {Object.entries(stats.users_by_role).map(([role, count]) => (
            <span key={role} className="px-2.5 py-1 bg-[#EEF6FB] border border-[#D0E3F0] rounded-md text-[#12324E]">
              <strong>{formatRoleLabel(role)}:</strong> {count}
            </span>
          ))}
        </div>
      )}

      {/* Navigation Tabs between Pending and All Users */}
      <div className="flex border-b border-[#D0E3F0] space-x-2">
        <button
          onClick={() => setActiveSubTab('pending')}
          className={`pb-2.5 px-3 text-xs font-bold font-mono transition-all flex items-center gap-2 border-b-2 ${
            activeSubTab === 'pending'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-[#5E82A6] hover:text-[#0F2942]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          {pendingUsers.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white rounded-full font-bold">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('all')}
          className={`pb-2.5 px-3 text-xs font-bold font-mono transition-all flex items-center gap-2 border-b-2 ${
            activeSubTab === 'all'
              ? 'border-[#0284C7] text-[#0284C7]'
              : 'border-transparent text-[#5E82A6] hover:text-[#0F2942]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All User Directory ({allUsers.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeSubTab === 'pending' && (
        <div className="bg-white border border-[#D0E3F0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-3 bg-[#F8FCFE] border-b border-[#D0E3F0] flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Registration Requests Awaiting Approval ({pendingUsers.length})
            </h2>
            <span className="text-[11px] text-[#5E82A6] font-mono">
              Review applicant identity & role eligibility
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center text-[#5E82A6]">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs font-bold text-[#0F2942]">No pending registration requests</p>
              <p className="text-[11px] text-[#5E82A6] mt-0.5">All accounts have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#EEF6FB]/70 border-b border-[#D0E3F0] text-[10px] font-mono text-[#5E82A6] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Applicant Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Organization / Dept</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Requested Role</th>
                    <th className="py-2.5 px-3">Submission Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {pendingUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FCFE] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#0F2942]">
                        {u.full_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#0284C7]">
                        {u.email}
                      </td>
                      <td className="py-3 px-3 text-[#47637E]">
                        {u.organization || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#47637E]">
                        {u.phone || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7] font-mono">
                          {formatRoleLabel(u.role)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#5E82A6]">
                        {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApprove(u.id)}
                            disabled={actionLoadingId === u.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                            title="Approve user registration"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>APPROVE</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingUser(u);
                              setRejectionReason('Registration does not meet MoES accreditation requirements.');
                            }}
                            disabled={actionLoadingId === u.id}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1 shadow-xs disabled:opacity-50"
                            title="Reject user registration"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>REJECT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL USER DIRECTORY */}
      {activeSubTab === 'all' && (
        <div className="bg-white border border-[#D0E3F0] rounded-xl shadow-xs overflow-hidden">
          <div className="p-3 bg-[#F8FCFE] border-b border-[#D0E3F0] flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-[#0284C7]" />
              Registered User Directory & Role Assignment ({allUsers.length})
            </h2>
            <span className="text-[11px] text-[#5E82A6] font-mono">
              Manage operational roles and access privileges
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EEF6FB]/70 border-b border-[#D0E3F0] text-[10px] font-mono text-[#5E82A6] uppercase tracking-wider">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Assigned Role</th>
                  <th className="py-2.5 px-3">Account Status</th>
                  <th className="py-2.5 px-3">Registered</th>
                  <th className="py-2.5 px-3">Approved</th>
                  <th className="py-2.5 px-3 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F8FCFE] transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[#0F2942]">{u.full_name}</div>
                      <div className="font-mono text-[11px] text-[#0284C7]">{u.email}</div>
                    </td>
                    <td className="py-3 px-3 text-[#47637E]">
                      <div>{u.organization || '—'}</div>
                      {u.phone && <div className="text-[10px] font-mono text-[#64748B]">{u.phone}</div>}
                    </td>
                    <td className="py-3 px-3">
                      {u.role === 'ADMIN' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono">
                          ADMIN
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={actionLoadingId === u.id}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="text-xs font-mono bg-white border border-[#D0E3F0] rounded px-2 py-1 text-[#0F2942] focus:border-[#0284C7] focus:outline-none"
                        >
                          <option value="WEATHER_FORECASTER">Weather Forecaster</option>
                          <option value="ELECTRICAL_INFRASTRUCTURE">Electrical & Infra</option>
                          <option value="USER">Standard User</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div>{getStatusBadge(u.status)}</div>
                      {u.rejection_reason && (
                        <div className="text-[10px] text-rose-700 italic mt-0.5">
                          "{u.rejection_reason}"
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#5E82A6]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#5E82A6]">
                      {u.approved_at ? new Date(u.approved_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {u.role !== 'ADMIN' && (
                        <div className="flex items-center justify-end space-x-1.5">
                          {u.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={actionLoadingId === u.id}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold font-mono transition-all"
                            >
                              Approve
                            </button>
                          )}

                          {u.status === 'APPROVED' && (
                            <button
                              onClick={() => handleStatusToggle(u)}
                              disabled={actionLoadingId === u.id}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold font-mono transition-all"
                            >
                              Disable
                            </button>
                          )}

                          {u.status === 'DISABLED' && (
                            <button
                              onClick={() => handleStatusToggle(u)}
                              disabled={actionLoadingId === u.id}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold font-mono transition-all"
                            >
                              Re-enable
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-2xl border border-[#D0E3F0]">
            <h3 className="text-sm font-bold font-mono text-rose-800 uppercase flex items-center gap-2 mb-2">
              <UserX className="w-5 h-5 text-rose-600" />
              Confirm Rejection for {rejectingUser.full_name}
            </h3>
            <p className="text-xs text-[#47637E] mb-3">
              This account will be denied system access. You can provide an explanation below:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Reason for rejection (e.g. organization verification failed)..."
              className="w-full text-xs font-sans border border-[#D0E3F0] rounded-lg p-2.5 focus:border-rose-500 focus:outline-none mb-4"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setRejectingUser(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold text-[#5E82A6] hover:bg-[#EEF6FB]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoadingId === rejectingUser.id}
                className="px-3 py-1.5 rounded text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
