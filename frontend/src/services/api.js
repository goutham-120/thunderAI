/**
 * VAJRA AI - Centralized Backend API Client Service
 */
const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8000/api';

/**
 * Helper wrapper for fetch with standard JSON error handling & fallback
 */
async function fetchJson(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('vajra_auth_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorDetail = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson && errorJson.detail) {
          errorDetail = errorJson.detail;
        }
      } catch {
        const errorText = await res.text();
        if (errorText) errorDetail = errorText;
      }
      console.warn(`[API] HTTP ${res.status} for ${endpoint}:`, errorDetail);
      throw new Error(errorDetail);
    }

    return await res.json();
  } catch (err) {
    console.error(`[API Network Error] ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health & Status
  getHealth: () => fetchJson('/health'),
  getSystemStatus: () => fetchJson('/system/status'),

  // Forecast & Nowcast
  getLatestNowcast: ({ horizonMin = 30, eventId = 'LIVE', tOffsetMinutes = 0, regionName = '', lat = '', lon = '', minLat = '', maxLat = '', minLon = '', maxLon = '' } = {}) => {
    const params = new URLSearchParams();
    if (horizonMin) params.append('horizon_min', horizonMin);
    if (eventId) params.append('event_id', eventId);
    if (tOffsetMinutes) params.append('t_offset_minutes', tOffsetMinutes);
    if (regionName) params.append('region_name', regionName);
    if (lat) params.append('lat', lat);
    if (lon) params.append('lon', lon);
    if (minLat) params.append('min_lat', minLat);
    if (maxLat) params.append('max_lat', maxLat);
    if (minLon) params.append('min_lon', minLon);
    if (maxLon) params.append('max_lon', maxLon);

    return fetchJson(`/forecast/latest?${params.toString()}`);
  },

  getAvailableHorizons: () => fetchJson('/forecast/horizons'),

  getAreaNowcast: ({ minLat, maxLat, minLon, maxLon, horizonMin = 30, eventId = 'LIVE', lat = '', lon = '' }) => {
    const params = new URLSearchParams({
      horizon_min: horizonMin,
      event_id: eventId,
    });
    if (minLat !== undefined && minLat !== '') params.append('min_lat', minLat);
    if (maxLat !== undefined && maxLat !== '') params.append('max_lat', maxLat);
    if (minLon !== undefined && minLon !== '') params.append('min_lon', minLon);
    if (maxLon !== undefined && maxLon !== '') params.append('max_lon', maxLon);
    if (lat !== undefined && lat !== '') params.append('lat', lat);
    if (lon !== undefined && lon !== '') params.append('lon', lon);

    return fetchJson(`/forecast/area?${params.toString()}`);
  },

  getMlNowcast: (horizonMin = 30, roiName = 'AP_TELANGANA') => 
    fetchJson(`/forecast/ml-nowcast?horizon_min=${horizonMin}&roi_name=${encodeURIComponent(roiName)}`),

  getModelMetricsReport: () => fetchJson('/forecast/model-metrics'),

  // Weather & NWP Data
  getWeatherCurrent: (lat = 17.3850, lon = 78.4867) => 
    fetchJson(`/weather/current?lat=${lat}&lon=${lon}`),

  getNwpForecast: (lat = 17.3850, lon = 78.4867) => 
    fetchJson(`/weather/nwp?lat=${lat}&lon=${lon}`),

  // Storm Cells
  getActiveStorms: (eventId = 'LIVE', tOffsetMinutes = 0) => 
    fetchJson(`/storms/active?event_id=${eventId}&t_offset_minutes=${tOffsetMinutes}`),

  getStormById: (cellId, eventId = 'LIVE') => 
    fetchJson(`/storms/${cellId}?event_id=${eventId}`),

  // Alerts
  getActiveAlerts: (eventId = 'LIVE', tOffsetMinutes = 0) => 
    fetchJson(`/alerts/active?event_id=${eventId}&t_offset_minutes=${tOffsetMinutes}`),

  // Explainability (XAI)
  getExplainability: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchJson(`/explainability/drivers?${query}`);
  },

  // Historical Replay
  getReplayEvents: () => fetchJson('/replay/events'),
  getReplayEventDetails: (eventId) => fetchJson(`/replay/events/${eventId}`),

  // Validation Metrics & Benchmarks
  getBenchmarkMetrics: () => fetchJson('/metrics/benchmark'),

  // Doppler Weather Radar (DWR)
  getRadarStatus: () => fetchJson('/data/radar/status'),
  getRadarFiles: () => fetchJson('/data/radar/files'),
  getRadarScan: (filename, rows = 64, cols = 64) => {
    const params = new URLSearchParams();
    if (filename) params.append('filename', filename);
    if (rows) params.append('grid_rows', rows);
    if (cols) params.append('grid_cols', cols);
    return fetchJson(`/data/radar/scan?${params.toString()}`);
  },
  getRadarPlotUrl: (filename) => {
    return filename 
      ? `${API_BASE}/data/radar/plot?filename=${encodeURIComponent(filename)}`
      : `${API_BASE}/data/radar/plot`;
  },
  getRadarAlignment: (roiName = 'NATIONAL') => 
    fetchJson(`/data/radar/alignment?roi_name=${encodeURIComponent(roiName)}`),

  // Live Radar Stream (Open IMD Mosaic)
  getLiveRadarStream: () => fetchJson('/data/radar/live-stream'),

  // What-If Scenario (POST — isolated from live forecast)
  postWhatIf: (body) =>
    fetchJson('/forecast/what-if', { method: 'POST', body: JSON.stringify(body) }),

  // Authentication & Session
  login: (email, password) =>
    fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData) =>
    fetchJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => fetchJson('/auth/me'),
  logout: () => fetchJson('/auth/logout', { method: 'POST' }),

  // Administrator Management
  getAdminStats: () => fetchJson('/admin/stats'),
  getAdminUsers: () => fetchJson('/admin/users'),
  getPendingUsers: () => fetchJson('/admin/pending-users'),
  approveUser: (userId) =>
    fetchJson(`/admin/users/${userId}/approve`, { method: 'POST' }),
  rejectUser: (userId, reason) =>
    fetchJson(`/admin/users/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  updateUserRole: (userId, role) =>
    fetchJson(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  updateUserStatus: (userId, status) =>
    fetchJson(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export default api;
