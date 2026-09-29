import React, { useMemo, useState } from 'react';
import { ShieldAlert, Clock, MapPin, RefreshCw, Filter, RotateCcw } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatExpires(iso) {
  if (!iso) return 'T+120m';
  try {
    if (iso.includes('T')) {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' UTC';
    }
    return iso;
  } catch {
    return iso;
  }
}

/**
 * Deterministically generate demo CAP alerts scoped to the selected location.
 * Uses the location name and coords so each region feels unique.
 */
function buildFallbackAlerts(locationName, lat, lon) {
  const now = new Date();
  const exp1 = new Date(now.getTime() + 90 * 60000).toISOString();
  const exp2 = new Date(now.getTime() + 150 * 60000).toISOString();
  const sent = now.toISOString();

  const latN = parseFloat(lat) || 17.38;
  const lonE = parseFloat(lon) || 78.48;
  const region = locationName || 'Selected Region';

  return [
    {
      identifier: `CAP-${region.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}-001`,
      sent,
      color_code: '#EF4444',
      cell_id: 'CELL-A',
      info: {
        severity: 'EXTREME',
        urgency: 'Immediate',
        certainty: 'Observed',
        headline: `RED ALERT: Severe Thunderstorm & Lightning Hazard – ${region}`,
        description: `Multi-sensor Doppler Radar and Satellite fusion detected an intense convective system near ${region} (Lat: ${latN.toFixed(2)}°N, Lon: ${lonE.toFixed(2)}°E). Radar reflectivity: 62 dBZ. Lightning strike rate: 28 flashes/min. Moving SE at 24 km/h. Anticipated high-intensity rainfall (>50 mm/hr), damaging wind gusts (>60 km/h), and frequent cloud-to-ground lightning.`,
        instruction:
          '1. Seek immediate shelter in substantial enclosed buildings.\n2. Avoid open fields, elevated areas, and isolated trees.\n3. Aviation: Expect severe low-level wind shear and microburst turbulence.\n4. Power Grid: Pre-emptively isolate sensitive transmission sub-stations in track cone.',
        expires: exp1,
        area: {
          areaDesc: `Downstream Corridor (SE of ${latN.toFixed(2)}N, ${lonE.toFixed(2)}E) — ${region}`,
          affected_sectors: ['Civil Aviation', 'Power Transmission', 'Agriculture & Rural', 'Urban Road Transport'],
        },
      },
    },
    {
      identifier: `CAP-${region.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}-002`,
      sent,
      color_code: '#F97316',
      cell_id: 'CELL-B',
      info: {
        severity: 'SEVERE',
        urgency: 'Expected',
        certainty: 'Likely',
        headline: `ORANGE WARNING: Convective Storm Activity – ${region} Northern Sector`,
        description: `Convective system approaching the northern sector of ${region}. INSAT Cloud Top temperature: -65°C. Convergence zone active with elevated wind shear. Storm motion NE at 18 km/h.`,
        instruction:
          '1. Seek shelter indoors immediately.\n2. Avoid open and elevated areas.\n3. Fishermen & outdoor workers: Cease activity and move to safety.',
        expires: exp2,
        area: {
          areaDesc: `Northern Sector — ${region} (${(latN + 0.5).toFixed(2)}N, ${lonE.toFixed(2)}E)`,
          affected_sectors: ['Marine & Fisheries', 'Civil Aviation', 'Agriculture & Rural'],
        },
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Severity chip styles
// ---------------------------------------------------------------------------
function severityStyle(sev) {
  if (sev === 'EXTREME') return 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]';
  if (sev === 'SEVERE')  return 'bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]';
  return                        'bg-[#FEF9C3] text-[#713F12] border-[#FEF08A]';
}

const SEVERITY_OPTS = ['ALL', 'EXTREME', 'SEVERE', 'MODERATE'];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AlertsView({ alerts, selectedLocation, selectedRegion }) {
  const locationName = selectedLocation?.name || selectedRegion || 'Selected Region';
  const lat          = selectedLocation?.lat;
  const lon          = selectedLocation?.lon;

  // Use real API alerts if available, else generate location-specific demo data
  const rawAlerts = useMemo(() => {
    if (alerts && alerts.length > 0) return alerts;
    return buildFallbackAlerts(locationName, lat, lon);
  }, [alerts, locationName, lat, lon]);

  // Local severity filter
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filtered = useMemo(() =>
    severityFilter === 'ALL'
      ? rawAlerts
      : rawAlerts.filter(a => {
          const sev = a.info?.severity || a.severity || '';
          return sev === severityFilter;
        }),
    [rawAlerts, severityFilter]
  );

  return (
    // key forces remount + re-animation when location changes
    <div key={locationName} className="space-y-4 font-sans text-[#12324E] animate-fade-in">

      {/* ── View Header ── */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FEF3C7] border border-[#FEF3C7]">
            <ShieldAlert className="w-5 h-5 text-[#D97706]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
              METEOROLOGICAL CAP WARNING INTERFACE
            </h2>
            <p className="text-xs text-[#5E82A6] font-sans mt-0.5">
              Common Alerting Protocol (CAP) — Automated Convective Warnings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active region pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-xs font-mono text-[#0284C7] font-bold">
            <MapPin className="w-3.5 h-3.5" />
            {locationName}
            {lat && lon && (
              <span className="text-[10px] text-[#5E82A6] font-normal ml-1">
                ({parseFloat(lat).toFixed(2)}°N, {parseFloat(lon).toFixed(2)}°E)
              </span>
            )}
          </div>

          {/* Count badge */}
          <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border ${
            rawAlerts.length > 0
              ? 'bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]'
              : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
          }`}>
            {rawAlerts.length} Active Warning{rawAlerts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Severity Filter Bar ── */}
      <div className="flex items-center gap-2 bg-[#F8FCFE] border border-[#D0E3F0] px-4 py-2.5 rounded-xl shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider shrink-0">
          <Filter className="w-3 h-3" />
          Severity
        </div>
        {SEVERITY_OPTS.map(opt => (
          <button
            key={opt}
            onClick={() => setSeverityFilter(opt)}
            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
              severityFilter === opt
                ? opt === 'EXTREME' ? 'bg-red-600 text-white border-red-700'
                : opt === 'SEVERE'  ? 'bg-orange-500 text-white border-orange-600'
                : opt === 'MODERATE'? 'bg-amber-500 text-white border-amber-600'
                :                     'bg-[#0284C7] text-white border-[#0284C7]'
                : 'bg-white text-[#5E82A6] border-[#D0E3F0] hover:border-[#5E82A6]'
            }`}
          >
            {opt}
          </button>
        ))}
        {severityFilter !== 'ALL' && (
          <button
            onClick={() => setSeverityFilter('ALL')}
            className="ml-auto flex items-center gap-1 text-[10px] text-[#5E82A6] hover:text-[#0284C7] transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
        <span className="ml-auto text-[10px] font-mono text-[#5E82A6]">
          {filtered.length}/{rawAlerts.length} alerts
        </span>
      </div>

      {/* ── No alerts state ── */}
      {filtered.length === 0 && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-[#047857] mx-auto mb-2" />
          <p className="text-sm font-bold text-[#047857]">No active warnings for this filter</p>
          <p className="text-xs text-[#5E82A6] mt-1">{locationName} — all sectors within safe thresholds</p>
        </div>
      )}

      {/* ── Alert Cards ── */}
      <div className="space-y-3">
        {filtered.map((alert, idx) => {
          const info        = alert.info || {};
          const severity    = info.severity    || alert.severity    || 'SEVERE';
          const urgency     = info.urgency     || alert.urgency     || 'Expected';
          const certainty   = info.certainty   || alert.certainty   || 'Likely';
          const headline    = info.headline    || alert.headline    || 'CAP Alert';
          const description = info.description || alert.description || '';
          const instruction = info.instruction || alert.instruction || '';
          const areaDesc    = info.area?.areaDesc || alert.area     || locationName;
          const sectors     = info.area?.affected_sectors || alert.drivers || [];
          const alertId     = alert.identifier || alert.id          || `CAP-${idx + 1}`;
          const cellId      = alert.cell_id    || '';
          const colorCode   = alert.color_code ||
            (severity === 'EXTREME' ? '#EF4444' : severity === 'SEVERE' ? '#F97316' : '#EAB308');
          const expiresTime = info.expires     || alert.valid_until || null;

          return (
            <div
              key={alertId + idx}
              className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl shadow-xs hover:shadow-sm hover:border-[#5E82A6] transition-all overflow-hidden"
              style={{ borderLeft: `4px solid ${colorCode}` }}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-[#D0E3F0] px-4 py-3 gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans border shrink-0 ${severityStyle(severity)}`}>
                    {severity}
                  </span>
                  <h3 className="text-xs font-bold text-[#12324E] font-sora">{headline}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-[#5E82A6]">
                  {cellId && (
                    <span className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0]">
                      Cell: {cellId}
                    </span>
                  )}
                  <span className="hidden md:inline">{alertId}</span>
                </div>
              </div>

              {/* Meta Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans px-4 py-3">
                <div className="flex items-start space-x-2 text-[#12324E]">
                  <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0 mt-0.5" />
                  <span>{areaDesc}</span>
                </div>
                <div className="flex items-center space-x-2 text-[#12324E]">
                  <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                  <span className="font-mono">Valid until: {formatExpires(expiresTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#5E82A6] flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0]">
                    Urgency: {urgency}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0]">
                    Certainty: {certainty}
                  </span>
                </div>
              </div>

              {/* Description */}
              {description && (
                <div className="px-4 pb-3 text-xs text-[#47637E] font-sans leading-relaxed border-t border-[#D0E3F0] pt-2">
                  {description}
                </div>
              )}

              {/* Safety Instructions */}
              {instruction && (
                <div className="px-4 pb-3">
                  <p className="text-[10px] font-bold text-[#0284C7] uppercase font-sans mb-1 tracking-wider">
                    Safety Instructions
                  </p>
                  <pre className="text-[10px] text-[#12324E] font-sans whitespace-pre-wrap leading-relaxed bg-[#EEF6FB] rounded-lg p-2.5 border border-[#D0E3F0]">
                    {instruction}
                  </pre>
                </div>
              )}

              {/* Affected Sectors */}
              {sectors.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-1 border-t border-[#D0E3F0]">
                  <span className="text-[10px] text-[#5E82A6] font-bold uppercase font-sans">
                    {info.area?.affected_sectors ? 'Affected Sectors:' : 'Drivers:'}
                  </span>
                  {sectors.map((s, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#EEF6FB] text-[#12324E] border border-[#D0E3F0] font-mono text-[10px]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
