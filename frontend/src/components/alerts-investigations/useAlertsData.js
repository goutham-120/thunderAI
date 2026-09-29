/**
 * useAlertsData — Custom hook for the Alerts & Investigations page.
 *
 * Fetches from /api/alerts/active (real CAP engine) and enriches each alert
 * with resolved forecast metadata (storm_cells, xai_explanation, data_mode).
 *
 * STATUS NOTES:
 *  - The backend has no PATCH/PUT endpoint for acknowledge/resolve.
 *  - Session-only status overrides are stored in local React state only.
 *  - No fake persistence is claimed or implied.
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export const ALERT_STATUSES = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
};

/**
 * Derive a readable source mode label from the backend data_mode string.
 */
export function resolveDataModeLabel(dataMode) {
  if (!dataMode) return 'UNKNOWN';
  const dm = dataMode.toLowerCase();
  if (dm === 'real') return 'REAL';
  if (dm === 'archive') return 'ARCHIVE';
  if (dm === 'synthetic_fallback') return 'SYNTHETIC_FALLBACK';
  if (dm === 'synthetic') return 'SYNTHETIC';
  if (dm === 'mock' || dm === 'demo') return 'MOCK/DEMO';
  return dataMode.toUpperCase();
}

/**
 * Derive alert_type from CAP event string.
 */
export function resolveAlertType(alert) {
  const evt = (alert?.info?.event || alert?.event || '').toLowerCase();
  if (evt.includes('lightning')) return 'LIGHTNING';
  if (evt.includes('thunder')) return 'THUNDERSTORM';
  if (evt.includes('rain') || evt.includes('rainfall')) return 'HEAVY_RAIN';
  if (evt.includes('wind')) return 'WIND';
  if (evt.includes('cyclone')) return 'CYCLONE';
  return 'CONVECTIVE';
}

/**
 * Determine generation mechanism from CAP identifier and certainty.
 */
export function resolveGenerationMechanism(alert, dataMode) {
  // The CAP engine always uses storm_tracker cells (model-derived)
  // and applies rule-based severity thresholds.
  const certainty = alert?.info?.certainty || '';
  const dm = (dataMode || '').toLowerCase();

  if (dm === 'real') return 'MODEL_REAL_DATA';
  if (dm === 'archive') return 'RULE_ARCHIVE';
  if (certainty === 'Observed') return 'RULE_BASED';
  if (certainty === 'Likely') return 'MODEL_DERIVED';
  return 'SYNTHETIC_DEMO';
}

export function useAlertsData({ eventId = 'LIVE', tOffsetMinutes = 0 } = {}) {
  const [rawAlerts, setRawAlerts] = useState([]);
  const [forecastMeta, setForecastMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Session-only status overrides keyed by alert identifier
  const [statusOverrides, setStatusOverrides] = useState({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Primary: /api/alerts/active
      const alertsResponse = await api.getActiveAlerts(eventId, tOffsetMinutes);
      const alerts = alertsResponse?.alerts || [];

      // Secondary: fetch full nowcast to get storm_cells, xai, data_mode, timestamps
      let meta = null;
      try {
        meta = await api.getLatestNowcast({ eventId, tOffsetMinutes });
      } catch (_e) {
        // non-fatal — we still show alerts without meta
      }

      setRawAlerts(alerts);
      setForecastMeta(meta);
    } catch (err) {
      setError(err?.message || 'Failed to fetch alerts from /api/alerts/active');
      setRawAlerts([]);
      setForecastMeta(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, tOffsetMinutes]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  /**
   * Enrich a raw CAP alert with derived fields for the UI.
   */
  const enrichAlert = useCallback(
    (alert, index) => {
      const dataMode = forecastMeta?.data_mode || 'synthetic';
      const stormCells = forecastMeta?.storm_cells || [];
      const xai = forecastMeta?.xai_explanation || null;
      const timestamps = forecastMeta?.timestamps || {};

      // Match CAP cell_id to storm cell for supporting observations
      const matchedCell = stormCells.find((c) => c.cell_id === alert.cell_id) || stormCells[0] || null;

      return {
        // Original fields preserved
        ...alert,

        // Stable ID for list
        _listKey: alert.identifier || `alert-${index}`,

        // Derived
        alert_type: resolveAlertType(alert),
        generation_mechanism: resolveGenerationMechanism(alert, dataMode),
        data_mode_label: resolveDataModeLabel(dataMode),

        // Session status (never persisted)
        _sessionStatus: statusOverrides[alert.identifier] || ALERT_STATUSES.ACTIVE,

        // Matched storm cell (null if no cells)
        _matchedCell: matchedCell,

        // XAI explanation from forecast engine
        _xai: xai,

        // Forecast metadata
        _dataMode: dataMode,
        _dataQuality: forecastMeta?.data_quality || null,
        _modelProvenance: forecastMeta?.model_provenance || null,
        _modelStatus: forecastMeta?.model_status || null,
        _inferenceMode: forecastMeta?.inference_mode || null,
        _issueTime: alert.sent || timestamps?.observation_time || null,
        _forecastGenTime: timestamps?.forecast_generation_time || null,
        _channelProvenance: forecastMeta?.channel_provenance || {},
        _realChannels: forecastMeta?.real_channels || [],
        _fallbackChannels: forecastMeta?.fallback_channels || [],
        _region: alert.info?.area?.areaDesc || 'Unknown Region',
      };
    },
    [forecastMeta, statusOverrides]
  );

  const enrichedAlerts = rawAlerts.map(enrichAlert);

  const acknowledgeAlert = useCallback((identifier) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [identifier]: ALERT_STATUSES.ACKNOWLEDGED,
    }));
  }, []);

  const resolveAlert = useCallback((identifier) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [identifier]: ALERT_STATUSES.RESOLVED,
    }));
  }, []);

  const resetAlertStatus = useCallback((identifier) => {
    setStatusOverrides((prev) => {
      const next = { ...prev };
      delete next[identifier];
      return next;
    });
  }, []);

  return {
    alerts: enrichedAlerts,
    loading,
    error,
    forecastMeta,
    onRefresh: fetchAlerts,
    onAcknowledge: acknowledgeAlert,
    onResolve: resolveAlert,
    onResetStatus: resetAlertStatus,
  };
}
