/**
 * StormCellList
 *
 * Displays the active storm cell list with:
 *   - cell ID, severity, lifecycle, max dBZ, lightning info, timestamp
 *   - clickable rows → triggers onSelectCell
 *   - empty state when cells = []
 */
import React from 'react';
import { CloudLightning, Zap, Wind, Radio, ChevronRight } from 'lucide-react';
import SeverityBadge from './SeverityBadge.jsx';

const LIFECYCLE_ICON = {
  'RAPIDLY INTENSIFYING': '🔴',
  'MATURE CONVECTIVE':    '🟠',
  'DEVELOPING':           '🟡',
  'WEAKENING / DISSIPATING': '🔵',
};

export default function StormCellList({ cells, selectedCellId, onSelectCell, observationTime }) {
  if (!cells || cells.length === 0) {
    return (
      <div
        id="storm-cell-list-empty"
        className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center bg-slate-800/40 rounded-2xl border border-slate-700/60"
      >
        <CloudLightning className="w-12 h-12 text-slate-600" />
        <div>
          <p className="text-slate-300 font-semibold text-sm font-sans">No active storm cells detected</p>
          <p className="text-slate-500 text-xs font-sans mt-1">
            No active storm cells detected for the selected region/time.
          </p>
        </div>
        {observationTime && (
          <p className="text-[10px] font-mono text-slate-600">
            Last checked: {new Date(observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="storm-cell-list" className="flex flex-col gap-2">
      {cells.map((cell) => {
        const isSelected = cell.cell_id === selectedCellId;
        const mov = cell.movement || {};
        const icon = LIFECYCLE_ICON[cell.lifecycle_state] || '⚪';

        return (
          <button
            key={cell.cell_id}
            id={`storm-cell-row-${cell.cell_id}`}
            onClick={() => onSelectCell(cell)}
            aria-pressed={isSelected}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500
              ${isSelected
                ? 'bg-sky-950/80 border-sky-500 shadow-lg shadow-sky-900/30'
                : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-700/60 hover:border-slate-600'
              }`}
          >
            {/* ── Row Header ── */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-base" role="img" aria-label={cell.lifecycle_state}>{icon}</span>
                <span className="font-mono font-bold text-sm text-sky-300">{cell.cell_id}</span>
                <SeverityBadge severity={cell.severity} />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[9px] font-mono text-slate-500 hidden sm:block">
                  {cell.lifecycle_state}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${isSelected ? 'text-sky-400 translate-x-0.5' : 'text-slate-600'}`} />
              </div>
            </div>

            {/* ── Metrics Row ── */}
            <div className="grid grid-cols-3 gap-2 bg-slate-900/50 rounded-lg p-2 text-[10px] font-mono">

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500 font-sans">Max dBZ</span>
                <span className="flex items-center gap-1 text-red-400 font-bold">
                  <Radio className="w-3 h-3" />
                  {cell.max_dbz != null ? `${cell.max_dbz}` : '—'}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500 font-sans">Motion</span>
                <span className="flex items-center gap-1 text-cyan-300">
                  <Wind className="w-3 h-3" />
                  {mov.speed_kmh != null ? `${mov.speed_kmh}k` : '—'}
                  {' '}{mov.direction_compass || ''}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-500 font-sans">⚡ Flash/min</span>
                <span className="flex items-center gap-1 text-amber-300">
                  <Zap className="w-3 h-3" />
                  {cell.lightning_flash_rate_min != null ? cell.lightning_flash_rate_min : '—'}
                  {cell.is_lightning_jump && (
                    <span className="text-[8px] bg-amber-800/70 text-amber-200 rounded px-1 ml-0.5">JUMP</span>
                  )}
                </span>
              </div>

            </div>

            {/* ── Coordinates + Timestamp footer ── */}
            <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-slate-600">
              <span>
                {cell.center?.lat != null ? `${cell.center.lat}° N, ${cell.center.lon}° E` : 'Position N/A'}
              </span>
              {observationTime && (
                <span>{new Date(observationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
