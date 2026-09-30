/**
 * StormTrackingPage
 * ==================
 * Dedicated Storm Tracking page for VAJRA-AI / ThunderAI.
 * Branch: feature/storm-tracking
 *
 * ENDPOINTS USED
 *  - GET /api/storms/active?event_id=LIVE   → active cell list + trajectories
 *  - GET /api/storms/{cell_id}?event_id=LIVE → single-cell detail refresh
 *
 * DATA PROVENANCE
 *  Backend returns data_mode / data_quality from forecast_engine.
 *  All provenance labels come from the API; nothing is fabricated.
 *
 * LIMITATIONS (honest)
 *  - No multi-scan track history — storm_tracker.py is stateless.
 *  - Movement vector is environment-derived (single-pass), not cross-frame.
 *  - trajectory[] contains FORECAST positions only (plus T=0 centroid).
 *
 * INTEGRATION STEPS (for integration owner)
 *  1. Import StormTrackingPage from './components/StormTrackingPage'
 *  2. Add tab id 'storm-tracking' to App.jsx (activeTab === 'storm-tracking')
 *  3. Add nav entry in LeftSidebar.jsx navSections if desired
 *     (this file does NOT modify App.jsx or LeftSidebar.jsx)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CloudLightning, RefreshCw, AlertTriangle, CheckCircle2,
  Loader2, Radio, Wind, Zap, Activity, MapPin, TrendingUp,
  Maximize2, X, Info
} from 'lucide-react';
import api from '../services/api.js';
import StormCellList from './storm-tracking/StormCellList.jsx';
import StormCellDetailPanel from './storm-tracking/StormCellDetailPanel.jsx';
import StormTrackingMap from './storm-tracking/StormTrackingMap.jsx';
import ProvenanceBadge from './storm-tracking/ProvenanceBadge.jsx';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return 'N/A';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function SummaryKPI({ icon: Icon, label, value, iconColor = 'text-sky-400', valueColor = 'text-sky-200' }) {
  return (
    <div className="flex flex-col gap-1 bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-sans">{label}</span>
      </div>
      <span className={`font-mono font-bold text-sm ${valueColor}`}>{value ?? '—'}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function StormTrackingPage() {
  const [cells, setCells]           = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellDetail, setCellDetail] = useState(null);   // from /storms/{id}
  const [dataMode, setDataMode]     = useState(null);
  const [timestamp, setTimestamp]   = useState(null);
  const [status, setStatus]         = useState('idle'); // idle | loading | error | ok
  const [errorMsg, setErrorMsg]     = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const pollerRef = useRef(null);

  // ── Fetch active storms ──────────────────────────────────────────────
  const fetchActiveStorms = useCallback(async (silent = false) => {
    if (!silent) setStatus('loading');
    setErrorMsg('');

    try {
      const data = await api.getActiveStorms('LIVE', 0);
      const stormCells = data?.storm_cells ?? [];
      setCells(stormCells);
      setDataMode(data?.data_mode ?? null);
      setTimestamp(data?.timestamp ?? new Date().toISOString());

      // Auto-select first cell if none selected
      setSelectedCell(prev => {
        if (prev && stormCells.some(c => c.cell_id === prev.cell_id)) return prev;
        return stormCells.length > 0 ? stormCells[0] : null;
      });

      setStatus('ok');
    } catch (err) {
      console.error('[StormTrackingPage] fetchActiveStorms error:', err);
      setErrorMsg(err.message || 'Failed to fetch storm data');
      setStatus('error');
    }
    if (!silent) setIsRefreshing(false);
  }, []);

  // ── Fetch single-cell detail when selected changes ────────────────────
  useEffect(() => {
    if (!selectedCell?.cell_id) {
      setCellDetail(null);
      return;
    }

    // First, use the inline data immediately (avoids extra spinner)
    setCellDetail(selectedCell);

    // Then fetch from /storms/{id} to get the freshest authoritative object
    let cancelled = false;
    api.getStormById(selectedCell.cell_id, 'LIVE')
      .then(detail => {
        if (!cancelled) setCellDetail(detail);
      })
      .catch(err => {
        // Keep the inline data on error; don't wipe the panel
        console.warn('[StormTrackingPage] getStormById fallback:', err);
      });

    return () => { cancelled = true; };
  }, [selectedCell?.cell_id]);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    fetchActiveStorms(false);
  }, [fetchActiveStorms]);

  // ── Auto-refresh every 90 seconds ───────────────────────────────────
  useEffect(() => {
    pollerRef.current = setInterval(() => {
      fetchActiveStorms(true);
    }, 90_000);
    return () => clearInterval(pollerRef.current);
  }, [fetchActiveStorms]);

  // ── Manual refresh ───────────────────────────────────────────────────
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchActiveStorms(false);
  };

  // ── Derived stats ────────────────────────────────────────────────────
  const extremeCount = cells.filter(c => c.severity === 'EXTREME').length;
  const severeCount  = cells.filter(c => c.severity === 'SEVERE').length;
  const maxDbz       = cells.length > 0 ? Math.max(...cells.map(c => c.max_dbz ?? 0)) : null;
  const lightningJumpCells = cells.filter(c => c.is_lightning_jump).length;

  return (
    <div
      id="storm-tracking-page"
      className="flex flex-col gap-4 text-slate-100 min-h-screen"
    >
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-900/40 border border-red-700/60">
            <CloudLightning className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-base text-slate-100 tracking-tight flex items-center gap-2">
              STORM TRACKING
              <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/60 font-semibold">
                LIVE CONVECTIVE INTELLIGENCE
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              TITAN/SCIT-style cell detection via storm_tracker.py · Environment-derived motion vectors · No track-history persistence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Status badge */}
          {status === 'ok' && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live · {fmtTime(timestamp)}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>API Error</span>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading…</span>
            </div>
          )}

          {dataMode && <ProvenanceBadge mode={dataMode} />}

          <button
            id="storm-tracking-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing || status === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-900/50 border border-sky-700/60
                       text-sky-300 text-xs font-medium hover:bg-sky-800/60 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────── */}
      {status === 'error' && (
        <div className="flex items-start gap-3 bg-red-900/30 border border-red-700/60 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-300">Unable to load storm data</p>
            <p className="text-xs text-red-400/80 font-sans mt-0.5">{errorMsg}</p>
            <p className="text-xs text-red-500/70 font-sans mt-1">
              Check that the FastAPI backend is running on port 8000.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Summary Row ────────────────────────────────────────── */}
      {status !== 'loading' && cells.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryKPI
            icon={CloudLightning}
            label="Active Cells"
            value={cells.length}
            iconColor="text-sky-400"
            valueColor="text-sky-200"
          />
          <SummaryKPI
            icon={AlertTriangle}
            label="Extreme / Severe"
            value={`${extremeCount} / ${severeCount}`}
            iconColor="text-red-400"
            valueColor={extremeCount > 0 ? 'text-red-300' : 'text-orange-300'}
          />
          <SummaryKPI
            icon={Radio}
            label="Peak dBZ"
            value={maxDbz != null ? `${maxDbz} dBZ` : '—'}
            iconColor="text-rose-400"
            valueColor="text-rose-200"
          />
          <SummaryKPI
            icon={Zap}
            label="Lightning Jump Cells"
            value={lightningJumpCells}
            iconColor="text-amber-400"
            valueColor={lightningJumpCells > 0 ? 'text-amber-300' : 'text-slate-400'}
          />
        </div>
      )}

      {/* ── Main Content Grid ──────────────────────────────────────── */}
      {status === 'loading' ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-slate-900 border border-slate-700 rounded-2xl">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          <p className="text-slate-400 text-sm font-sans">Loading storm cell data…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

          {/* ── Left Column: Cell List ─────────────────────────── */}
          <div className="xl:col-span-3 flex flex-col gap-4">

            {/* Cell count header */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Active Storm Cells
                <span className="text-sky-300 bg-sky-900/60 border border-sky-700/60 px-2 py-0.5 rounded-full text-[10px]">
                  {cells.length}
                </span>
              </h2>
            </div>

            <StormCellList
              cells={cells}
              selectedCellId={selectedCell?.cell_id}
              onSelectCell={(cell) => {
                setSelectedCell(cell);
              }}
              observationTime={timestamp}
            />

            {/* Provenance info card */}
            {dataMode && (
              <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] text-slate-500 font-sans uppercase tracking-wider mb-1">Data Provenance</p>
                  <ProvenanceBadge mode={dataMode} />
                  <p className="text-[9px] text-slate-600 font-sans mt-2 leading-relaxed">
                    Cells derived from storm_tracker.py · dBZ threshold ≥ 38 · Minimum 8 pixels · Environment motion vector
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Centre Column: Map ─────────────────────────────── */}
          <div className={`xl:col-span-${selectedCell ? '5' : '9'} flex flex-col gap-3`}>
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Geographical Positions
              </h2>
              <button
                id="storm-map-expand-btn"
                onClick={() => setIsMapExpanded(!isMapExpanded)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title={isMapExpanded ? 'Collapse map' : 'Expand map'}
              >
                {isMapExpanded ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div
              id="storm-tracking-map"
              className={`${isMapExpanded ? 'h-[75vh]' : 'h-[420px]'} transition-all duration-300`}
            >
              <StormTrackingMap
                cells={cells}
                selectedCellId={selectedCell?.cell_id}
                onSelectCell={(cell) => {
                  setSelectedCell(cell);
                }}
              />
            </div>

            {/* Map methodology note */}
            <div className="flex items-start gap-2 bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-3">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[9px] text-indigo-300/70 font-sans leading-relaxed">
                <strong className="text-indigo-300">Dashed line:</strong> forecast trajectory from environment-derived motion vector ·
                <strong className="text-indigo-300 ml-1">Green dot:</strong> observed centroid (T+0) ·
                <strong className="text-indigo-300 ml-1">Indigo dots:</strong> forecast positions (T+15 … T+180 min) ·
                Track history is <em>not available</em> — backend performs single-scan detection only.
              </p>
            </div>
          </div>

          {/* ── Right Column: Cell Detail ──────────────────────── */}
          {selectedCell && (
            <div className="xl:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CloudLightning className="w-3.5 h-3.5 text-red-400" />
                  Cell Detail
                </h2>
              </div>

              <div id="storm-cell-detail-wrapper" className="overflow-y-auto max-h-[calc(100vh-280px)]">
                <StormCellDetailPanel
                  cell={cellDetail}
                  dataMode={dataMode}
                  onClose={() => {
                    setSelectedCell(null);
                    setCellDetail(null);
                  }}
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Footer: Last updated + auto-refresh notice ──────────── */}
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 text-[9px] font-mono text-slate-600">
        <span>
          Storm Tracking · Endpoint: <code className="text-slate-500">/api/storms/active</code> + <code className="text-slate-500">/api/storms/&#123;cell_id&#125;</code>
        </span>
        <span>Auto-refresh: 90s · Last: {fmtTime(timestamp)}</span>
      </div>
    </div>
  );
}
