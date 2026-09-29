/**
 * AlertFilters — Filter bar for the Alerts & Investigations page.
 * Filters: severity, alert_type, region, status, time range.
 */
import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

const SEVERITY_OPTIONS = ['ALL', 'EXTREME', 'SEVERE', 'MODERATE'];
const TYPE_OPTIONS = ['ALL', 'THUNDERSTORM', 'LIGHTNING', 'HEAVY_RAIN', 'CONVECTIVE', 'WIND', 'CYCLONE'];
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];

export default function AlertFilters({ filters, onChange, totalCount, filteredCount }) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div
      id="alerts-filter-bar"
      className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-xs"
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E82A6] uppercase tracking-wider shrink-0">
        <Filter className="w-3.5 h-3.5" />
        Filters
      </div>

      {/* Severity */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-[#5E82A6] uppercase font-mono shrink-0">Severity</span>
        <div className="flex gap-1">
          {SEVERITY_OPTIONS.map((opt) => (
            <button
              key={opt}
              id={`filter-severity-${opt.toLowerCase()}`}
              onClick={() => set('severity', opt)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                filters.severity === opt
                  ? opt === 'EXTREME'
                    ? 'bg-red-600 text-white border-red-700'
                    : opt === 'SEVERE'
                    ? 'bg-orange-500 text-white border-orange-600'
                    : opt === 'MODERATE'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-[#0284C7] text-white border-[#0284C7]'
                  : 'bg-white text-[#5E82A6] border-[#D0E3F0] hover:border-[#5E82A6]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Type */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-[#5E82A6] uppercase font-mono shrink-0">Type</span>
        <select
          id="filter-alert-type"
          value={filters.alertType}
          onChange={(e) => set('alertType', e.target.value)}
          className="text-[10px] font-mono bg-white border border-[#D0E3F0] rounded px-2 py-1 text-[#12324E] focus:outline-none focus:border-[#0284C7]"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-[#5E82A6] uppercase font-mono shrink-0">Status</span>
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              id={`filter-status-${opt.toLowerCase()}`}
              onClick={() => set('status', opt)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                filters.status === opt
                  ? opt === 'ACTIVE'
                    ? 'bg-red-600 text-white border-red-700'
                    : opt === 'ACKNOWLEDGED'
                    ? 'bg-amber-500 text-white border-amber-600'
                    : opt === 'RESOLVED'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-[#0284C7] text-white border-[#0284C7]'
                  : 'bg-white text-[#5E82A6] border-[#D0E3F0] hover:border-[#5E82A6]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Region text filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-[#5E82A6] uppercase font-mono shrink-0">Region</span>
        <input
          id="filter-region"
          type="text"
          placeholder="e.g. Telangana"
          value={filters.region}
          onChange={(e) => set('region', e.target.value)}
          className="text-[10px] font-mono bg-white border border-[#D0E3F0] rounded px-2 py-1 text-[#12324E] focus:outline-none focus:border-[#0284C7] w-32"
        />
      </div>

      {/* Reset */}
      <button
        id="filter-reset"
        onClick={() =>
          onChange({ severity: 'ALL', alertType: 'ALL', status: 'ALL', region: '' })
        }
        className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[#5E82A6] hover:text-[#0284C7] transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>

      {/* Count badge */}
      <span className="text-[10px] font-mono text-[#5E82A6] shrink-0">
        {filteredCount}/{totalCount} alerts
      </span>
    </div>
  );
}
