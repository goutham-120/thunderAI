/**
 * AlertListItem — A single row in the Alerts list table.
 * Shows: ID, type, severity, status, region, issue time, validity, source mode.
 */
import React from 'react';
import { Clock, MapPin, Zap, ShieldAlert, Eye } from 'lucide-react';
import { ProvenanceBadge, SeverityBadge, StatusBadge, MechanismTag } from './AlertBadges';

function formatTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  } catch {
    return iso.substring(11, 16) + ' UTC';
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return iso.substring(0, 10);
  }
}

export default function AlertListItem({ alert, isSelected, onSelect }) {
  const severity = alert?.info?.severity || alert?.severity || 'MODERATE';
  const status = alert._sessionStatus;
  const issueTime = alert._issueTime || alert.sent;
  const expiresTime = alert?.info?.expires;

  return (
    <button
      id={`alert-list-item-${alert._listKey}`}
      onClick={() => onSelect(alert)}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all group font-sans ${
        isSelected
          ? 'bg-[#EEF6FB] border-[#0284C7] shadow-md'
          : 'bg-white border-[#D0E3F0] hover:border-[#5E82A6] hover:bg-[#F8FCFE]'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        {/* Left: severity + headline */}
        <div className="flex items-center gap-2 min-w-0">
          <SeverityBadge severity={severity} />
          <span className="text-xs font-bold text-[#12324E] truncate font-sora">
            {alert?.info?.headline || alert?.headline || 'CAP Alert'}
          </span>
        </div>

        {/* Right: status + select indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={status} />
          {isSelected && <Eye className="w-3.5 h-3.5 text-[#0284C7]" />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-[#5E82A6] font-mono">
        {/* ID */}
        <div className="flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-[#0284C7]" />
          <span className="truncate">{alert._listKey}</span>
        </div>

        {/* Region */}
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-[#0284C7]" />
          <span className="truncate">{alert._region || '—'}</span>
        </div>

        {/* Issue time */}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#0284C7]" />
          <span>{formatDate(issueTime)} {formatTime(issueTime)}</span>
        </div>

        {/* Valid until */}
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>Until {formatTime(expiresTime)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <MechanismTag mechanism={alert.generation_mechanism} />
        <ProvenanceBadge mode={alert.data_mode_label} />
        <span className="text-[10px] font-mono text-[#5E82A6] ml-auto">{alert.alert_type}</span>
      </div>
    </button>
  );
}
