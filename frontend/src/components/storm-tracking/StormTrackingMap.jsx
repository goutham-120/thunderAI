/**
 * StormTrackingMap
 *
 * Lightweight MapLibre GL map dedicated to the Storm Tracking page.
 * Does NOT duplicate the full WeatherMap — only renders:
 *   1. OpenStreetMap base tiles
 *   2. Storm cell centroids (circle markers + labels)
 *   3. Forecast trajectory lines (dashed) and uncertainty circles
 *   4. Selected cell highlight
 *
 * Track history: backend provides no stored historical positions,
 * so only the T=0 centroid and forecast trajectory are drawn.
 * A legend note makes this clear.
 *
 * Uses real lat/lon from cell.center and cell.trajectory[].
 */
import React, { useRef, useEffect, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const SEVERITY_COLOR = {
  EXTREME:  '#ef4444',
  SEVERE:   '#f97316',
  MODERATE: '#eab308',
  MINOR:    '#38bdf8',
};

function buildGeoJSON(cells, selectedCellId) {
  const centroids = {
    type: 'FeatureCollection',
    features: cells
      .filter(c => c.center?.lat != null && c.center?.lon != null)
      .map(c => ({
        type: 'Feature',
        id: c.cell_id,
        properties: {
          cell_id: c.cell_id,
          severity: c.severity || 'MINOR',
          lifecycle: c.lifecycle_state || '',
          max_dbz: c.max_dbz || 0,
          color: SEVERITY_COLOR[c.severity] || '#38bdf8',
          selected: c.cell_id === selectedCellId ? 1 : 0,
        },
        geometry: {
          type: 'Point',
          coordinates: [c.center.lon, c.center.lat],
        },
      })),
  };

  // Forecast trajectory lines — only for selected cell
  const selectedCell = cells.find(c => c.cell_id === selectedCellId);
  const trajectoryLines = { type: 'FeatureCollection', features: [] };
  const trajectoryPoints = { type: 'FeatureCollection', features: [] };

  if (selectedCell?.trajectory?.length > 0) {
    const traj = selectedCell.trajectory;

    // Line connecting all trajectory points
    const coords = traj
      .filter(p => p.lat != null && p.lon != null)
      .map(p => [p.lon, p.lat]);

    if (coords.length >= 2) {
      trajectoryLines.features.push({
        type: 'Feature',
        properties: { type: 'forecast' },
        geometry: { type: 'LineString', coordinates: coords },
      });
    }

    // Individual points with uncertainty radius labels
    traj.forEach(p => {
      if (p.lat == null || p.lon == null) return;
      const isObserved = p.horizon_min === 0;
      trajectoryPoints.features.push({
        type: 'Feature',
        properties: {
          horizon: p.horizon_min,
          label: isObserved ? 'NOW' : `+${p.horizon_min}m`,
          type: isObserved ? 'observed' : 'forecast',
          uncertainty: p.uncertainty_radius_km ?? null,
        },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      });
    });
  }

  return { centroids, trajectoryLines, trajectoryPoints };
}

export default function StormTrackingMap({ cells, selectedCellId, onSelectCell }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Initialise map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Determine initial centre from first cell or default to Telangana
    const firstCell = cells?.find(c => c.center?.lat != null);
    const center = firstCell
      ? [firstCell.center.lon, firstCell.center.lat]
      : [79.0193, 18.1124];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [
          { id: 'osm-tiles', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 },
        ],
      },
      center,
      zoom: 6,
      minZoom: 3,
      maxZoom: 14,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // ── Storm cell centroid source & layers ────────────────────────
      map.addSource('storm-centroids', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Shadow glow for selected
      map.addLayer({
        id: 'storm-centroid-glow',
        type: 'circle',
        source: 'storm-centroids',
        filter: ['==', ['get', 'selected'], 1],
        paint: {
          'circle-radius': 24,
          'circle-color': '#38bdf8',
          'circle-opacity': 0.18,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#38bdf8',
          'circle-stroke-opacity': 0.4,
        },
      });

      map.addLayer({
        id: 'storm-centroid-circle',
        type: 'circle',
        source: 'storm-centroids',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'max_dbz'],
            30, 8,
            50, 14,
            65, 20,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.85,
          'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 1.5],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.9,
        },
      });

      map.addLayer({
        id: 'storm-centroid-label',
        type: 'symbol',
        source: 'storm-centroids',
        layout: {
          'text-field': ['get', 'cell_id'],
          'text-size': 10,
          'text-offset': [0, -1.8],
          'text-anchor': 'bottom',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': '#f8fafc',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1.5,
        },
      });

      // ── Trajectory line ────────────────────────────────────────────
      map.addSource('storm-trajectory-line', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'storm-trajectory-line',
        type: 'line',
        source: 'storm-trajectory-line',
        paint: {
          'line-color': '#818cf8',
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.8,
        },
      });

      // ── Trajectory waypoint markers ────────────────────────────────
      map.addSource('storm-trajectory-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'storm-trajectory-observed',
        type: 'circle',
        source: 'storm-trajectory-points',
        filter: ['==', ['get', 'type'], 'observed'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#10b981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'storm-trajectory-forecast',
        type: 'circle',
        source: 'storm-trajectory-points',
        filter: ['==', ['get', 'type'], 'forecast'],
        paint: {
          'circle-radius': 4,
          'circle-color': '#6366f1',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#c7d2fe',
          'circle-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'storm-trajectory-labels',
        type: 'symbol',
        source: 'storm-trajectory-points',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#c7d2fe',
          'text-halo-color': '#0f172a',
          'text-halo-width': 1,
        },
      });

      // ── Click handler ──────────────────────────────────────────────
      map.on('click', 'storm-centroid-circle', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props?.cell_id) return;
        const found = cells?.find(c => c.cell_id === props.cell_id);
        if (found && onSelectCell) onSelectCell(found);
      });

      map.on('mouseenter', 'storm-centroid-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'storm-centroid-circle', () => {
        map.getCanvas().style.cursor = '';
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update data when cells / selection changes ──────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const { centroids, trajectoryLines, trajectoryPoints } = buildGeoJSON(cells || [], selectedCellId);

    const centSrc = map.getSource('storm-centroids');
    if (centSrc) centSrc.setData(centroids);

    const lineSrc = map.getSource('storm-trajectory-line');
    if (lineSrc) lineSrc.setData(trajectoryLines);

    const ptSrc = map.getSource('storm-trajectory-points');
    if (ptSrc) ptSrc.setData(trajectoryPoints);

  }, [mapReady, cells, selectedCellId]);

  // ── Fly to selected cell ────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedCellId) return;
    const map = mapRef.current;
    const cell = (cells || []).find(c => c.cell_id === selectedCellId);
    if (!cell?.center?.lat) return;
    map.flyTo({
      center: [cell.center.lon, cell.center.lat],
      zoom: 8,
      speed: 1.2,
      curve: 1.4,
    });
  }, [mapReady, selectedCellId]);  // cells intentionally omitted to avoid loop

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-950">
      <div ref={containerRef} className="w-full h-full" />

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-[9px] font-mono text-slate-300 space-y-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border-2 border-white" />
          <span>Observed centroid (T+0)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block border border-indigo-300" />
          <span>Forecast position</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="8" className="inline-block">
            <line x1="0" y1="4" x2="24" y2="4" stroke="#818cf8" strokeWidth="2" strokeDasharray="4,3" />
          </svg>
          <span>Forecast track</span>
        </div>
        <div className="border-t border-slate-700 pt-1 text-slate-500">
          ⚠ No track history — backend single-scan only
        </div>
      </div>
    </div>
  );
}
