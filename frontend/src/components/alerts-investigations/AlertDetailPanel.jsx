/**
 * AlertDetailPanel — Right panel showing full alert detail when an alert is selected.
 *
 * Shows:
 * - Alert ID, severity, type, issue time, valid until, affected location
 * - Supporting observations (only fields that actually exist on the matched cell)
 * - Model/rule provenance
 * - Source data mode
 * - Relevant storm cell information
 * - XAI drivers (only shown if xai data actually exists)
 * - Status actions: Acknowledge / Resolve (session-only, clearly labeled)
 *
 * STATUS PERSISTENCE NOTE:
 *   The backend does NOT provide an acknowledge/resolve endpoint.
 *   Status changes here are SESSION-ONLY and will reset on page reload.
 */
import React, { useState } from 'react';
import {
  ShieldAlert, MapPin, Clock, Zap, Radio, Thermometer, CloudLightning,
  Wind, Activity, Info, CheckCircle, XCircle, RotateCcw, Copy, Check,
  AlertTriangle, Satellite
} from 'lucide-react';
import { SeverityBadge, StatusBadge, ProvenanceBadge, MechanismTag } from './AlertBadges';
import { ALERT_STATUSES } from './useAlertsData';

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'UTC',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) + ' UTC';
  } catch { return iso; }
}

function EvidenceRow({ icon: Icon, label, value, status }) {
  const statusColor =
    status === 'CRITICAL' ? 'text-red-600' :
    status === 'HIGH' || status === 'ELEVATED' ? 'text-orange-600' :
    status === 'FAVORABLE' ? 'text-emerald-600' :
    'text-[#0284C7]';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#EAF0F6] last:border-0">
      <div className="flex items-center gap-2 text-xs text-[#12324E]">
        <Icon className={`w-3.5 h-3.5 ${statusColor}`} />
        <span className="font-semibold">{label}</span>
      </div>
      <span className="font-mono text-xs text-[#12324E] font-bold">{value}</span>
    </div>
  );
}

export default function AlertDetailPanel({ alert, onAcknowledge, onResolve, onResetStatus }) {
  const [copied, setCopied] = useState(false);

  if (!alert) {
    return (
      <div
        id="alert-detail-empty"
        className="flex flex-col items-center justify-center h-full min-h-[400px] text-[#5E82A6] text-sm font-sans space-y-3"
      >
        <ShieldAlert className="w-10 h-10 text-[#D0E3F0]" />
        <p className="font-semibold">Select an alert to investigate</p>
        <p className="text-xs text-center max-w-48 text-[#7FA4C2]">
          Click any alert in the list to view its full detail and evidence.
        </p>
      </div>
    );
  }

  const severity = alert?.info?.severity || alert?.severity || 'UNKNOWN';
  const status = alert._sessionStatus;
  const cell = alert._matchedCell;
  const xai = alert._xai;
  const dataMode = alert._dataMode;
  const isSynthetic = (dataMode || '').toLowerCase().includes('synthetic') || (dataMode || '').toLowerCase().includes('mock');

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(alert, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="alert-detail-panel" className="flex flex-col h-full overflow-y-auto space-y-3 font-sans">

      {/* ─── Synthetic Warning Banner ─────────────────────────────────── */}
      {isSynthetic && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-purple-700 font-semibold">
            <span className="font-bold">SYNTHETIC / DEMO DATA</span> — This alert was generated from
            simulated sensor data and does <em>not</em> represent a real operational warning. Do not
            distribute or act upon this alert in a real emergency context.
          </p>
        </div>
      )}

      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={severity} />
              <StatusBadge status={status} />
              <MechanismTag mechanism={alert.generation_mechanism} />
            </div>
            <h2 className="text-sm font-bold text-[#12324E] font-sora leading-tight">
              {alert?.info?.headline || 'CAP Alert'}
            </h2>
            <p className="text-[10px] font-mono text-[#5E82A6]">
              ID: {alert._listKey}  •  Sender: {alert.sender || '—'}
            </p>
          </div>
          <button
            id="alert-detail-copy-json"
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D0E3F0] hover:bg-[#EEF6FB] text-[10px] font-semibold text-[#12324E] transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-[#5E82A6]" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>

      {/* ─── Metadata Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono">Timing</h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-[#12324E]">
              <Clock className="w-3 h-3 text-[#0284C7]" />
              <span className="font-semibold">Issued:</span>
              <span className="font-mono">{fmt(alert._issueTime || alert.sent)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#12324E]">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="font-semibold">Valid Until:</span>
              <span className="font-mono">{fmt(alert?.info?.expires)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#12324E]">
              <Clock className="w-3 h-3 text-[#5E82A6]" />
              <span className="font-semibold">Effective:</span>
              <span className="font-mono">{fmt(alert?.info?.effective)}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono">Location</h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-start gap-1.5 text-[#12324E]">
              <MapPin className="w-3 h-3 text-[#0284C7] mt-0.5 shrink-0" />
              <span>{alert._region || '—'}</span>
            </div>
            {alert?.info?.area?.circle && (
              <p className="text-[10px] font-mono text-[#5E82A6]">
                Impact radius: {alert?.info?.area?.circle}
              </p>
            )}
            {alert?.info?.area?.affected_sectors && (
              <div className="flex flex-wrap gap-1 mt-1">
                {alert.info.area.affected_sectors.map((sec, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-[#EEF6FB] text-[9px] font-mono text-[#0284C7] border border-[#D0E3F0]">
                    {sec}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono">Alert Classification</h3>
          <div className="space-y-1 text-[11px] text-[#12324E]">
            <div><span className="font-semibold">Type:</span> <span className="font-mono">{alert.alert_type}</span></div>
            <div><span className="font-semibold">Urgency:</span> <span className="font-mono">{alert?.info?.urgency || '—'}</span></div>
            <div><span className="font-semibold">Certainty:</span> <span className="font-mono">{alert?.info?.certainty || '—'}</span></div>
            <div><span className="font-semibold">Event Code:</span> <span className="font-mono">{alert?.info?.eventCode || '—'}</span></div>
          </div>
        </div>

        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono">Data Provenance</h3>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <ProvenanceBadge mode={alert.data_mode_label} />
            </div>
            <div className="text-[#12324E]">
              <span className="font-semibold">Mode:</span> <span className="font-mono">{alert._dataMode || '—'}</span>
            </div>
            <div className="text-[#12324E]">
              <span className="font-semibold">Quality:</span> <span className="font-mono">{alert._dataQuality || '—'}</span>
            </div>
            <div className="text-[#12324E]">
              <span className="font-semibold">Inference:</span> <span className="font-mono">{alert._inferenceMode || '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ─── Model Provenance ─────────────────────────────────────────── */}
      {alert._modelProvenance && (
        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Model / Rule Provenance
          </h3>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#12324E]">
            {Object.entries(alert._modelProvenance).map(([k, v]) => (
              <div key={k}>
                <span className="font-semibold capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                <span className="font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[#5E82A6] font-mono mt-1">
            CAP Engine: rule-based severity threshold (EXTREME ≥ dBZ&gt;50, lightning_rate&gt;20, cloud_top&lt;-55°C)
            applied to model-tracked storm cells. Certainty = Observed if dBZ&gt;50, else Likely.
          </div>
        </div>
      )}

      {/* ─── Hazard Description ────────────────────────────────────────── */}
      {alert?.info?.description && (
        <div className="bg-[#FEF2F2] border border-red-200 rounded-xl p-3 space-y-1">
          <h3 className="text-[10px] font-bold text-red-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Meteorological Hazard Summary
          </h3>
          <p className="text-xs text-[#12324E] leading-relaxed">{alert.info.description}</p>
        </div>
      )}

      {/* ─── Supporting Observations (Storm Cell) ─────────────────────── */}
      {cell ? (
        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-1.5">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <CloudLightning className="w-3.5 h-3.5 text-[#0284C7]" />
            Storm Cell: {cell.cell_id} — Supporting Observations
          </h3>

          <div className="space-y-0.5">
            {/* Only render fields that actually exist on the cell */}
            {cell.max_dbz != null && (
              <EvidenceRow
                icon={Radio}
                label="Radar Reflectivity"
                value={`${cell.max_dbz} dBZ`}
                status={cell.max_dbz > 50 ? 'CRITICAL' : 'MODERATE'}
              />
            )}
            {cell.lightning_flash_rate_min != null && (
              <EvidenceRow
                icon={Zap}
                label="Lightning Flash Rate"
                value={`${cell.lightning_flash_rate_min} flashes/min`}
                status={cell.lightning_flash_rate_min > 20 ? 'CRITICAL' : 'ELEVATED'}
              />
            )}
            {cell.min_cloud_top_c != null && (
              <EvidenceRow
                icon={Satellite}
                label="Cloud-Top Temperature"
                value={`${cell.min_cloud_top_c} °C`}
                status={cell.min_cloud_top_c < -55 ? 'CRITICAL' : 'ACTIVE'}
              />
            )}
            {cell.mean_cape_jkg != null && (
              <EvidenceRow
                icon={Thermometer}
                label="Mean CAPE"
                value={`${cell.mean_cape_jkg} J/kg`}
                status={cell.mean_cape_jkg > 2000 ? 'HIGH' : 'MODERATE'}
              />
            )}
            {cell.avg_dbz != null && (
              <EvidenceRow
                icon={Radio}
                label="Avg Reflectivity"
                value={`${cell.avg_dbz} dBZ`}
                status="MODERATE"
              />
            )}
            {cell.area_km2 != null && (
              <EvidenceRow
                icon={Activity}
                label="Cell Area"
                value={`${cell.area_km2} km²`}
                status="MODERATE"
              />
            )}
            {cell.movement?.speed_kmh != null && (
              <EvidenceRow
                icon={Wind}
                label="Storm Motion"
                value={`${cell.movement.direction_compass} @ ${cell.movement.speed_kmh} km/h`}
                status="MODERATE"
              />
            )}
            {cell.is_lightning_jump != null && (
              <EvidenceRow
                icon={Zap}
                label="Lightning Jump Detected"
                value={cell.is_lightning_jump ? 'YES ⚡' : 'No'}
                status={cell.is_lightning_jump ? 'CRITICAL' : 'MODERATE'}
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border font-mono ${
              cell.severity === 'EXTREME' ? 'bg-red-100 text-red-700 border-red-200' :
              cell.severity === 'SEVERE' ? 'bg-orange-100 text-orange-700 border-orange-200' :
              'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              Cell Severity: {cell.severity}
            </span>
            <span className="text-[9px] font-mono text-[#5E82A6]">
              Lifecycle: {cell.lifecycle_state}
            </span>
            <span className="text-[9px] font-mono text-[#5E82A6]">
              Center: {cell.center?.lat}°N, {cell.center?.lon}°E
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 text-[11px] text-[#5E82A6] font-sans italic">
          No matching storm cell data available for this alert.
        </div>
      )}

      {/* ─── XAI Drivers ──────────────────────────────────────────────── */}
      {xai?.drivers && xai.drivers.length > 0 && (
        <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-2">
          <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            XAI Feature Attribution (SHAP-style Weights)
          </h3>
          <div className="space-y-1.5">
            {xai.drivers.map((d, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#12324E]">{d.feature}</span>
                  <span className="font-mono text-[#0284C7] font-bold">{d.value}</span>
                </div>
                <div className="w-full bg-[#E2EAF0] rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full ${
                      d.status === 'CRITICAL' ? 'bg-red-500' :
                      d.status === 'HIGH' ? 'bg-orange-500' :
                      d.status === 'FAVORABLE' ? 'bg-emerald-500' :
                      'bg-[#0284C7]'
                    }`}
                    style={{ width: `${d.impact_percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#5E82A6] font-mono">
                  <span>{d.trend}</span>
                  <span>{d.impact_percent}% weight</span>
                </div>
              </div>
            ))}
          </div>
          {xai.meteorological_rationale && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 text-[10px] text-indigo-800 leading-relaxed italic font-sans mt-1">
              {xai.meteorological_rationale}
            </div>
          )}
        </div>
      )}

      {/* ─── Safety Instructions ────────────────────────────────────── */}
      {alert?.info?.instruction && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
          <h3 className="text-[10px] font-bold text-red-700 uppercase tracking-wider font-mono">
            Safety Instructions
          </h3>
          <p className="text-[10px] text-red-900 font-mono whitespace-pre-line leading-relaxed">
            {alert.info.instruction}
          </p>
        </div>
      )}

      {/* ─── Status Actions ─────────────────────────────────────────── */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-3 space-y-2">
        <h3 className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider font-mono">
          Status Actions
        </h3>
        <p className="text-[9px] text-[#7FA4C2] font-sans italic">
          ⓘ Session-only — no backend persistence. Status resets on page reload.
          Backend does not currently support PATCH/acknowledge/resolve endpoints.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="alert-action-acknowledge"
            onClick={() => onAcknowledge(alert.identifier)}
            disabled={status === ALERT_STATUSES.ACKNOWLEDGED}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              status === ALERT_STATUSES.ACKNOWLEDGED
                ? 'bg-amber-50 text-amber-500 border-amber-200 cursor-not-allowed opacity-60'
                : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Acknowledge
          </button>

          <button
            id="alert-action-resolve"
            onClick={() => onResolve(alert.identifier)}
            disabled={status === ALERT_STATUSES.RESOLVED}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              status === ALERT_STATUSES.RESOLVED
                ? 'bg-emerald-50 text-emerald-500 border-emerald-200 cursor-not-allowed opacity-60'
                : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Resolve
          </button>

          {status !== ALERT_STATUSES.ACTIVE && (
            <button
              id="alert-action-reactivate"
              onClick={() => onResetStatus(alert.identifier)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-white text-[#5E82A6] border-[#D0E3F0] hover:border-[#5E82A6] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reactivate
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
