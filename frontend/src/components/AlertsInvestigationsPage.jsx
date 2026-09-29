/**
 * AlertsInvestigationsPage — Dedicated Alerts & Investigations feature page.
 *
 * Route/Tab: activeTab === 'alerts'  (replaces the old AlertsView)
 * Import path: frontend/src/components/AlertsInvestigationsPage.jsx
 *
 * Architecture:
 *  - Fetches from GET /api/alerts/active (real CAP engine, no fake)
 *  - Secondary fetch from GET /api/forecast/latest for storm cell / XAI enrichment
 *  - Session-only acknowledge/resolve (no backend persistence endpoint exists)
 *  - Hardcoded threshold logic documented in ThresholdDocumentation sub-component
 *  - Every alert clearly labels REAL / ARCHIVE / SYNTHETIC / SYNTHETIC_FALLBACK
 *  - Explicit banner on synthetic alerts: "NOT a real-world warning"
 *
 * Integration note for App.jsx owner:
 *   Replace <AlertsView alerts={forecastData?.cap_alerts} />
 *   with    <AlertsInvestigationsPage />
 *   in the activeTab === 'alerts' branch.
 *   The component is self-contained and manages its own data fetching.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, RefreshCw, ClipboardList, BookOpen,
  AlertTriangle, WifiOff, Loader2
} from 'lucide-react';

import { useAlertsData } from './alerts-investigations/useAlertsData';
import AlertFilters from './alerts-investigations/AlertFilters';
import AlertListItem from './alerts-investigations/AlertListItem';
import AlertDetailPanel from './alerts-investigations/AlertDetailPanel';
import ThresholdDocumentation from './alerts-investigations/ThresholdDocumentation';

const DEFAULT_FILTERS = { severity: 'ALL', alertType: 'ALL', status: 'ALL', region: '' };

const TABS = [
  { id: 'list', label: 'Alert List', icon: ClipboardList },
  { id: 'thresholds', label: 'Threshold Docs', icon: BookOpen },
];

export default function AlertsInvestigationsPage() {
  const [activeInnerTab, setActiveInnerTab] = useState('list');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { alerts, loading, error, forecastMeta, onRefresh, onAcknowledge, onResolve, onResetStatus } =
    useAlertsData({ eventId: 'LIVE', tOffsetMinutes: 0 });

  // ─── Apply filters ─────────────────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const severity = (a?.info?.severity || a?.severity || '').toUpperCase();
      const atype = (a.alert_type || '').toUpperCase();
      const region = (a._region || '').toLowerCase();
      const status = (a._sessionStatus || '').toUpperCase();

      if (filters.severity !== 'ALL' && severity !== filters.severity) return false;
      if (filters.alertType !== 'ALL' && atype !== filters.alertType) return false;
      if (filters.status !== 'ALL' && status !== filters.status) return false;
      if (filters.region && !region.includes(filters.region.toLowerCase())) return false;
      return true;
    });
  }, [alerts, filters]);

  // ─── Keep selection in sync ────────────────────────────────────────────────
  const handleSelectAlert = (alert) => {
    setSelectedAlert(alert);
    setActiveInnerTab('list'); // ensure list tab is active when selecting
  };

  // When selected alert's status changes via enrichment, re-select from enriched list
  const selectedEnriched = selectedAlert
    ? filteredAlerts.find((a) => a._listKey === selectedAlert._listKey) ||
      alerts.find((a) => a._listKey === selectedAlert._listKey) ||
      selectedAlert
    : null;

  // Status counts for header badges
  const counts = useMemo(() => {
    const base = { ACTIVE: 0, ACKNOWLEDGED: 0, RESOLVED: 0 };
    alerts.forEach((a) => {
      const s = a._sessionStatus || 'ACTIVE';
      if (s in base) base[s]++;
    });
    return base;
  }, [alerts]);

  return (
    <div id="alerts-investigations-page" className="space-y-4 font-sans text-[#12324E]">

      {/* ─── Page Header ──────────────────────────────────────────────────── */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl px-5 py-4 flex items-start justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-sm font-bold text-[#12324E] font-sora flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#DC2626]" />
            ALERTS & INVESTIGATIONS
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-sans font-semibold">
              CAP ITU-T X.1303
            </span>
          </h1>
          <p className="text-xs text-[#5E82A6]">
            Common Alerting Protocol — real-time convective threat warnings with full evidence chain and data provenance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Status summary badges */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="px-2 py-1 rounded text-[10px] font-bold font-mono bg-red-100 text-red-700 border border-red-200">
              {counts.ACTIVE} ACTIVE
            </span>
            <span className="px-2 py-1 rounded text-[10px] font-bold font-mono bg-amber-100 text-amber-700 border border-amber-200">
              {counts.ACKNOWLEDGED} ACK
            </span>
            <span className="px-2 py-1 rounded text-[10px] font-bold font-mono bg-emerald-100 text-emerald-700 border border-emerald-200">
              {counts.RESOLVED} RESOLVED
            </span>
          </div>

          <button
            id="alerts-refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-[#0369A1] transition-all disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Data source info ────────────────────────────────────────────── */}
      {forecastMeta && (
        <div className="text-[10px] font-mono text-[#5E82A6] px-1 flex items-center gap-2 flex-wrap">
          <span>Source: <strong className="text-[#12324E]">GET /api/alerts/active</strong></span>
          <span>•</span>
          <span>Data mode: <strong className="text-[#12324E]">{forecastMeta.data_mode || '—'}</strong></span>
          <span>•</span>
          <span>Quality: <strong className="text-[#12324E]">{forecastMeta.data_quality || '—'}</strong></span>
          <span>•</span>
          <span>Inference: <strong className="text-[#12324E]">{forecastMeta.inference_mode || '—'}</strong></span>
          {forecastMeta.fallback_used && (
            <>
              <span>•</span>
              <span className="text-amber-600 font-bold">⚠ Fallback channels active</span>
            </>
          )}
        </div>
      )}

      {/* ─── Inner Tab Bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[#D0E3F0] pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeInnerTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`alerts-tab-${tab.id}`}
              onClick={() => setActiveInnerTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all ${
                isActive
                  ? 'text-[#0284C7] border-[#0284C7] bg-[#F0F9FF]'
                  : 'text-[#5E82A6] border-transparent hover:text-[#0284C7] hover:bg-[#F8FCFE]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── ALERT LIST TAB ─────────────────────────────────────────────── */}
      {activeInnerTab === 'list' && (
        <div className="space-y-4">

          {/* Filter bar */}
          <AlertFilters
            filters={filters}
            onChange={setFilters}
            totalCount={alerts.length}
            filteredCount={filteredAlerts.length}
          />

          {/* Loading */}
          {loading && (
            <div
              id="alerts-loading-state"
              className="flex flex-col items-center justify-center py-16 text-[#5E82A6] space-y-3"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[#0284C7]" />
              <p className="text-sm font-semibold">Fetching alerts from /api/alerts/active…</p>
            </div>
          )}

          {/* API Error */}
          {!loading && error && (
            <div
              id="alerts-error-state"
              className="flex flex-col items-center justify-center py-12 text-red-700 space-y-3 bg-red-50 rounded-xl border border-red-200"
            >
              <WifiOff className="w-8 h-8" />
              <p className="text-sm font-semibold">Alert API Error</p>
              <p className="text-xs text-red-600 font-mono max-w-md text-center">{error}</p>
              <button
                onClick={onRefresh}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state — no alerts at all */}
          {!loading && !error && alerts.length === 0 && (
            <div
              id="alerts-empty-state"
              className="flex flex-col items-center justify-center py-16 text-[#5E82A6] space-y-3"
            >
              <ShieldAlert className="w-10 h-10 text-[#D0E3F0]" />
              <p className="text-sm font-semibold">No Active CAP Alerts</p>
              <p className="text-xs text-center max-w-xs">
                The CAP engine found no convective cells meeting severity thresholds
                (EXTREME / SEVERE / MODERATE) at this time.
              </p>
              <p className="text-[10px] font-mono text-[#7FA4C2]">
                Storm cells require dBZ ≥ 38 to generate a cell, and
                further thresholds for MODERATE/SEVERE/EXTREME classification.
              </p>
            </div>
          )}

          {/* Empty state — filtered to zero */}
          {!loading && !error && alerts.length > 0 && filteredAlerts.length === 0 && (
            <div
              id="alerts-filtered-empty-state"
              className="flex flex-col items-center justify-center py-12 text-[#5E82A6] space-y-2 bg-[#F8FCFE] rounded-xl border border-[#D0E3F0]"
            >
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-sm font-semibold">No alerts match the current filters</p>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs text-[#0284C7] hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Main layout: List + Detail */}
          {!loading && !error && filteredAlerts.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

              {/* Alert list */}
              <div
                id="alerts-list"
                className="xl:col-span-5 space-y-2 overflow-y-auto max-h-[70vh] pr-1"
              >
                {filteredAlerts.map((alert) => (
                  <AlertListItem
                    key={alert._listKey}
                    alert={alert}
                    isSelected={selectedEnriched?._listKey === alert._listKey}
                    onSelect={handleSelectAlert}
                  />
                ))}
              </div>

              {/* Detail panel */}
              <div
                id="alerts-detail-column"
                className="xl:col-span-7 overflow-y-auto max-h-[70vh]"
              >
                <AlertDetailPanel
                  alert={selectedEnriched}
                  onAcknowledge={onAcknowledge}
                  onResolve={onResolve}
                  onResetStatus={onResetStatus}
                />
              </div>

            </div>
          )}

        </div>
      )}

      {/* ─── THRESHOLD DOCS TAB ────────────────────────────────────────── */}
      {activeInnerTab === 'thresholds' && (
        <ThresholdDocumentation />
      )}

    </div>
  );
}
