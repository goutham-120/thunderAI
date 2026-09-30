/**
 * StormCellDetailPanel
 *
 * Shows all available fields for a selected storm cell as returned by
 * /api/storms/{cell_id} (or the inline object from /api/storms/active).
 *
 * Clearly labels fields that are NOT available with "—  N/A".
 * Trajectory table distinguishes OBSERVED (t=0 centroid) from FORECAST (t>0).
 *
 * Track history: the backend does NOT persist historical positions between
 * API calls — there is no track history in the current data model.
 * This panel makes that limitation explicit.
 */
import React from 'react';
import {
  MapPin, Zap, Wind, Radio, Thermometer, Activity,
  TrendingUp, Clock, Target, ChevronRight, AlertTriangle
} from 'lucide-react';
import SeverityBadge from './SeverityBadge.jsx';
import ProvenanceBadge from './ProvenanceBadge.jsx';

const Field = ({ label, value, unit = '', mono = true, highlight = false }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-sans">{label}</span>
    <span className={`text-xs ${mono ? 'font-mono' : 'font-sans'} ${highlight ? 'text-amber-300 font-bold' : 'text-slate-100'}`}>
      {value != null && value !== '' ? `${value}${unit ? ' ' + unit : ''}` : <span className="text-slate-500 italic">N/A</span>}
    </span>
  </div>
);

const NA = () => <span className="text-slate-500 italic text-xs">N/A</span>;

export default function StormCellDetailPanel({ cell, dataMode, onClose }) {
  if (!cell) return null;

  const mov = cell.movement || {};
  const center = cell.center || {};
  const traj = Array.isArray(cell.trajectory) ? cell.trajectory : [];

  const observedPt = traj.find(p => p.horizon_min === 0);
  const forecastPts = traj.filter(p => p.horizon_min > 0);

  return (
    <div
      id="storm-cell-detail-panel"
      className="flex flex-col gap-4 bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-100 shadow-2xl"
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-400 shrink-0" />
            <h2 className="font-mono font-bold text-base text-sky-300 tracking-tight">{cell.cell_id}</h2>
            <SeverityBadge severity={cell.severity} />
          </div>
          {cell.name && (
            <p className="text-xs text-slate-400 font-sans ml-6">{cell.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ProvenanceBadge mode={dataMode} />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Close detail panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Position ───────────────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Centroid Position</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude"  value={center.lat != null ? `${center.lat}° N` : null} />
          <Field label="Longitude" value={center.lon != null ? `${center.lon}° E` : null} />
        </div>
      </section>

      {/* ── Intensity ──────────────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <Radio className="w-3.5 h-3.5 text-red-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Radar Intensity</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max dBZ"  value={cell.max_dbz} unit="dBZ" highlight />
          <Field label="Avg dBZ"  value={cell.avg_dbz} unit="dBZ" />
          <Field label="Lifecycle" value={cell.lifecycle_state} mono={false} />
          <Field label="Area"      value={cell.area_km2} unit="km²" />
        </div>
      </section>

      {/* ── Cloud Top & Thermodynamics ─────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <Thermometer className="w-3.5 h-3.5 text-violet-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Thermodynamics</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cloud-Top Temp" value={cell.min_cloud_top_c != null ? `${cell.min_cloud_top_c}° C` : null} highlight={cell.min_cloud_top_c < -50} />
          <Field label="CAPE" value={cell.mean_cape_jkg} unit="J/kg" />
        </div>
      </section>

      {/* ── Lightning ──────────────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Lightning</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Flash Rate" value={cell.lightning_flash_rate_min} unit="/min" highlight={cell.lightning_flash_rate_min > 20} />
          <Field label="Accel ΔRate" value={cell.flash_rate_accel_min2} unit="/min²" />
          <div className="col-span-2 flex items-center gap-2">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-sans">Lightning Jump</span>
            {cell.is_lightning_jump
              ? <span className="text-[10px] font-bold text-amber-300 font-mono">⚡ DETECTED</span>
              : <span className="text-[10px] text-slate-500 font-mono">None</span>
            }
          </div>
        </div>
      </section>

      {/* ── Movement ───────────────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Movement</h3>
          <span className="text-[9px] text-slate-500 ml-1">(environment-derived estimate)</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Speed"     value={mov.speed_kmh}          unit="km/h" />
          <Field label="Heading"   value={mov.heading_deg != null ? `${mov.heading_deg}°` : null} />
          <Field label="Direction" value={mov.direction_compass} />
        </div>
      </section>

      {/* ── Track History ──────────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Track History</h3>
        </div>
        <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded-lg p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-300 font-sans leading-relaxed">
            The current backend does not persist multi-scan track history between API calls.
            Historical positions are <strong>not available</strong> in this data model.
            Only the current centroid (T+0) and forecast trajectory are returned.
          </p>
        </div>
      </section>

      {/* ── Forecast Trajectory ────────────────────────── */}
      <section className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/60">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Forecast Trajectory</h3>
        </div>

        {traj.length === 0 ? (
          <NA />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 text-[9px] uppercase tracking-wider">
                  <th className="text-left pb-1.5 pr-3">Type</th>
                  <th className="text-left pb-1.5 pr-3">T (min)</th>
                  <th className="text-left pb-1.5 pr-3">Lat</th>
                  <th className="text-left pb-1.5 pr-3">Lon</th>
                  <th className="text-left pb-1.5 pr-3">±Err (km)</th>
                  <th className="text-left pb-1.5">Pred dBZ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {traj.map((pt, i) => {
                  const isObserved = pt.horizon_min === 0;
                  return (
                    <tr
                      key={i}
                      className={isObserved ? 'bg-emerald-900/20 text-emerald-300' : 'text-slate-300 hover:bg-slate-700/30'}
                    >
                      <td className="py-1.5 pr-3">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isObserved ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700' : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'}`}>
                          {isObserved ? 'OBSERVED' : 'FORECAST'}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3">{isObserved ? 'NOW' : `+${pt.horizon_min}m`}</td>
                      <td className="py-1.5 pr-3">{pt.lat}° N</td>
                      <td className="py-1.5 pr-3">{pt.lon}° E</td>
                      <td className="py-1.5 pr-3">
                        {pt.uncertainty_radius_km != null
                          ? `± ${pt.uncertainty_radius_km}`
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-1.5">
                        {pt.predicted_max_dbz != null
                          ? `${pt.predicted_max_dbz} dBZ`
                          : <span className="text-slate-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
