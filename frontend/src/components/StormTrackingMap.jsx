import React, { useRef, useEffect, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { 
  Maximize2, 
  Plus, 
  Minus, 
  Crosshair, 
  Zap, 
  Navigation,
  Layers,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import indiaStatesData from '../data/india_states.json';

// Regional framing default: Telangana, Andhra Pradesh, Bay of Bengal
const REGIONAL_CENTER = [80.5, 17.5]; // [longitude, latitude]
const REGIONAL_ZOOM = 6.8;

export default function StormTrackingMap({
  forecastData,
  selectedCell,
  onSelectCell,
  activeLayers: parentActiveLayers,
  toggleLayer: parentToggleLayer,
  horizonMin = 30
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [baseStyle, setBaseStyle] = useState('dark'); // 'dark' | 'satellite' | 'terrain' | 'street'
  const [actualProjection, setActualProjection] = useState('Mercator (Regional Sector [80.5°E, 17.5°N])');

  // Local active layers state if not passed
  const [localActiveLayers, setLocalActiveLayers] = useState({
    radar: true,
    satellite: true,
    lightning: true,
    vectors: true,
    boundaries: true
  });

  const activeLayers = parentActiveLayers || localActiveLayers;
  const toggleLayer = parentToggleLayer || ((key) => {
    setLocalActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  });

  const cells = forecastData?.storm_cells || [];

  // Maintain latest refs to prevent stale closure bugs in map event callbacks
  const forecastDataRef = useRef(forecastData);
  const onSelectCellRef = useRef(onSelectCell);
  useEffect(() => {
    forecastDataRef.current = forecastData;
    onSelectCellRef.current = onSelectCell;
  });

  // Handle map container resizes automatically (e.g. sidebar toggle or window resize)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // --- 1. Radar Reflectivity Canvas Tile Generator (0 to 75 dBZ) ---
  const generateRadarImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 18;
    const shiftY = (horizon / 180) * 14;
    const decay = Math.max(0.7, 1.0 - (horizon / 320));

    const drawCore = (cx, cy, rMax, alphaMult = 1.0) => {
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rMax);
      grad.addColorStop(0.0, `rgba(240, 240, 255, ${0.98 * alphaMult})`); // White-hot core (65+ dBZ)
      grad.addColorStop(0.12, `rgba(217, 70, 239, ${0.95 * alphaMult})`); // Magenta (55 dBZ)
      grad.addColorStop(0.32, `rgba(239, 68, 68, ${0.92 * alphaMult})`);  // Red (45 dBZ)
      grad.addColorStop(0.55, `rgba(245, 158, 11, ${0.88 * alphaMult})`); // Orange/Yellow (35 dBZ)
      grad.addColorStop(0.75, `rgba(34, 197, 94, ${0.78 * alphaMult})`);  // Green (25 dBZ)
      grad.addColorStop(0.92, `rgba(6, 182, 212, 0.45)`);                 // Cyan (15 dBZ)
      grad.addColorStop(1.0, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    // Synthesize radar footprints over regional coordinates
    drawCore(130 + shiftX, 120 + shiftY, 52 * decay, decay);
    drawCore(160 + shiftX, 100 + shiftY, 38 * decay, decay);
    drawCore(110 + shiftX, 165 + shiftY, 44 * decay, decay);
    drawCore(185 + shiftX * 0.9, 175 + shiftY * 0.9, 34 * decay, decay);
    return canvas.toDataURL();
  };

  // --- 2. Satellite Thermal IR Cloud Canopy Generator ---
  const generateSatelliteImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const drawCanopy = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.25, 'rgba(216, 180, 254, 0.65)');
      grad.addColorStop(0.55, 'rgba(96, 165, 250, 0.4)');
      grad.addColorStop(0.85, 'rgba(30, 58, 138, 0.2)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawCanopy(135, 130, 95);
    drawCanopy(175, 180, 80);
    return canvas.toDataURL();
  };

  // --- 3. Initialize MapLibre GL Instance ---
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use open-access Esri base & reference overlay tiles with zero API key requirements & zero watermarks
    const baseSources = {
      'dark-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, HERE, Garmin, USGS'
      },
      'dark-ref-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      },
      'satellite-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, Maxar'
      },
      'terrain-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, NAVTEQ'
      },
      'street-source': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      },
      'boundaries-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    };

    const mapOptions = {
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: baseSources,
        layers: [
          { id: 'dark-base-layer', type: 'raster', source: 'dark-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'visible' } },
          { id: 'satellite-base-layer', type: 'raster', source: 'satellite-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'terrain-base-layer', type: 'raster', source: 'terrain-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'street-base-layer', type: 'raster', source: 'street-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'boundaries-layer', type: 'raster', source: 'boundaries-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.85 } },
          { id: 'dark-ref-layer', type: 'raster', source: 'dark-ref-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'visible' }, paint: { 'raster-opacity': 0.95 } }
        ]
      },
      center: REGIONAL_CENTER, // [80.5, 17.5]
      zoom: REGIONAL_ZOOM,     // 6.8 regional framing
      minZoom: 4,
      maxZoom: 16
    };

    const map = new maplibregl.Map(mapOptions);

    map.on('load', () => {
      setMapLoaded(true);

      // Check active projection in MapLibre GL
      let projName = 'Mercator (Regional Sector [80.5°E, 17.5°N])';
      try {
        if (typeof map.getProjection === 'function') {
          const p = map.getProjection();
          if (p && p.type && p.type !== 'mercator') {
            projName = `LCC (${p.type})`;
          }
        }
      } catch (projErr) {
        console.warn('Projection check notice:', projErr);
      }
      setActualProjection(projName);

      // Add India State & Coastal Boundaries
      map.addSource('india-states-source', {
        type: 'geojson',
        data: indiaStatesData
      });

      map.addLayer({
        id: 'india-states-outline',
        type: 'line',
        source: 'india-states-source',
        paint: {
          'line-color': '#38BDF8',
          'line-width': 1.4,
          'line-opacity': 0.6
        }
      });

      // --- Add Storm Cells & Trajectory Layer Sources ---
      map.addSource('storm-cells-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addSource('storm-trajectory-cone-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addSource('storm-trajectory-line-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addSource('storm-trajectory-points-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addSource('observed-lightning-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // 1. Trajectory Expanding Uncertainty Cones
      map.addLayer({
        id: 'storm-trajectory-cone-fill',
        type: 'fill',
        source: 'storm-trajectory-cone-source',
        paint: {
          'fill-color': '#EF4444',
          'fill-opacity': 0.18
        }
      });

      // 2. Trajectory Directional Line & Motion Vectors
      map.addLayer({
        id: 'storm-trajectory-line',
        type: 'line',
        source: 'storm-trajectory-line-source',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 3.0,
          'line-dasharray': [4, 2]
        }
      });

      // 3. Georeferenced Storm Core Footprint Polygons
      map.addLayer({
        id: 'storm-cells-polygon-fill',
        type: 'fill',
        source: 'storm-cells-source',
        paint: {
          'fill-color': '#DC2626',
          'fill-opacity': 0.45
        }
      });
      map.addLayer({
        id: 'storm-cells-polygon-outline',
        type: 'line',
        source: 'storm-cells-source',
        paint: {
          'line-color': '#EF4444',
          'line-width': 2.8
        }
      });
      map.addLayer({
        id: 'storm-cells-polygon-selected-outline',
        type: 'line',
        source: 'storm-cells-source',
        filter: ['==', ['get', 'cell_id'], selectedCell?.cell_id || ''],
        paint: {
          'line-color': '#F59E0B',
          'line-width': 4.5,
          'line-opacity': 0.95
        }
      });

      // 4. Trajectory Horizon Points & Labels
      map.addLayer({
        id: 'storm-trajectory-points',
        type: 'circle',
        source: 'storm-trajectory-points-source',
        paint: {
          'circle-radius': 6,
          'circle-color': '#EF4444',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      map.addLayer({
        id: 'storm-trajectory-labels',
        type: 'symbol',
        source: 'storm-trajectory-points-source',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0.7, -0.7],
          'text-anchor': 'left'
        },
        paint: {
          'text-color': '#F8FCFE',
          'text-halo-color': '#0F2942',
          'text-halo-width': 3.0
        }
      });

      // 5. Observed Lightning Strike Layer (Explicitly Sensor Observed)
      map.addLayer({
        id: 'observed-lightning-glow',
        type: 'circle',
        source: 'observed-lightning-source',
        paint: {
          'circle-radius': 12,
          'circle-color': '#F59E0B',
          'circle-opacity': 0.4
        }
      });
      map.addLayer({
        id: 'observed-lightning-core',
        type: 'circle',
        source: 'observed-lightning-source',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#FBBF24',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      // Interactive Click Handlers on Storm Cells
      map.on('click', 'storm-cells-polygon-fill', (e) => {
        if (e.features && e.features[0]) {
          const cellId = e.features[0].properties.cell_id;
          const matchedCell = (forecastDataRef.current?.storm_cells || []).find(c => c.cell_id === cellId);
          if (matchedCell && onSelectCellRef.current) {
            onSelectCellRef.current(matchedCell);
          }
        }
      });

      map.on('mouseenter', 'storm-cells-polygon-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'storm-cells-polygon-fill', () => {
        map.getCanvas().style.cursor = '';
      });

    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- 4. Switch Basemap Style ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const styles = ['dark-base-layer', 'satellite-base-layer', 'terrain-base-layer', 'street-base-layer'];
    styles.forEach(id => {
      if (map.getLayer(id)) {
        const isTarget = id === `${baseStyle}-base-layer`;
        map.setLayoutProperty(id, 'visibility', isTarget ? 'visible' : 'none');
      }
    });

    if (map.getLayer('dark-ref-layer')) {
      map.setLayoutProperty('dark-ref-layer', 'visibility', baseStyle === 'dark' ? 'visible' : 'none');
    }
    if (map.getLayer('boundaries-layer')) {
      map.setLayoutProperty('boundaries-layer', 'visibility', baseStyle !== 'dark' && activeLayers.boundaries !== false ? 'visible' : 'none');
    }
  }, [baseStyle, mapLoaded, activeLayers.boundaries]);

  // --- 5. Update Layers Data (Radar, Cells, Lightning, Trajectories) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Regional Bounding Coordinates: [minLon, maxLat], [maxLon, maxLat], [maxLon, minLat], [minLon, minLat]
    const regionalCoords = [
      [76.0, 21.0], // Top-Left
      [86.0, 21.0], // Top-Right
      [86.0, 13.5], // Bottom-Right
      [76.0, 13.5]  // Bottom-Left
    ];

    // Radar Raster Layer Update
    const radarUrl = generateRadarImageDataUrl(horizonMin);
    if (map.getSource('radar-storm-source')) {
      map.removeLayer('radar-storm-layer');
      map.removeSource('radar-storm-source');
    }

    if (activeLayers.radar) {
      map.addSource('radar-storm-source', {
        type: 'image',
        url: radarUrl,
        coordinates: regionalCoords
      });

      map.addLayer({
        id: 'radar-storm-layer',
        type: 'raster',
        source: 'radar-storm-source',
        paint: {
          'raster-opacity': baseStyle === 'dark' ? 0.85 : 0.7,
          'raster-resampling': 'linear'
        }
      }, 'boundaries-layer');
    }

    // Satellite IR Layer Update
    const satUrl = generateSatelliteImageDataUrl();
    if (map.getSource('satellite-storm-source')) {
      map.removeLayer('satellite-storm-layer');
      map.removeSource('satellite-storm-source');
    }

    if (activeLayers.satellite) {
      map.addSource('satellite-storm-source', {
        type: 'image',
        url: satUrl,
        coordinates: regionalCoords
      });

      map.addLayer({
        id: 'satellite-storm-layer',
        type: 'raster',
        source: 'satellite-storm-source',
        paint: {
          'raster-opacity': 0.6,
          'raster-resampling': 'linear'
        }
      }, 'boundaries-layer');
    }

    // Update GeoJSON Feature Collections for Storm Cells & Trajectories
    const polyFeatures = [];
    const lineFeatures = [];
    const coneFeatures = [];
    const pointFeatures = [];

    cells.forEach(cell => {
      if (cell.polygon_geojson) {
        polyFeatures.push({
          ...cell.polygon_geojson,
          properties: {
            ...cell.polygon_geojson.properties,
            cell_id: cell.cell_id,
            max_dbz: cell.max_dbz
          }
        });
      }

      // Draw explicit centroid motion vector arrow line originating at cell center
      if (cell.center && Number.isFinite(cell.center.lat) && Number.isFinite(cell.center.lon)) {
        const headingDeg = cell.movement?.heading_deg || 135;
        const speedKmh = cell.movement?.speed_kmh || 24;
        const kmPerDeg = 111.0;
        const rad = (headingDeg * Math.PI) / 180.0;
        // Vector length scaled by speed
        const vLon = (speedKmh / kmPerDeg / 60.0) * Math.sin(rad) * 45.0; // 45-min vector projection
        const vLat = -(speedKmh / kmPerDeg / 60.0) * Math.cos(rad) * 45.0;

        const endLon = cell.center.lon + vLon;
        const endLat = cell.center.lat + vLat;

        lineFeatures.push({
          type: 'Feature',
          properties: { cell_id: cell.cell_id, type: 'velocity-vector' },
          geometry: {
            type: 'LineString',
            coordinates: [[cell.center.lon, cell.center.lat], [endLon, endLat]]
          }
        });
      }

      const traj = cell.trajectory || [];
      if (traj.length > 0) {
        const trajCoords = traj.map(pt => [pt.lon, pt.lat]);
        lineFeatures.push({
          type: 'Feature',
          properties: { cell_id: cell.cell_id, type: 'trajectory-path' },
          geometry: { type: 'LineString', coordinates: trajCoords }
        });

        const leftCoords = [];
        const rightCoords = [];

        traj.forEach(pt => {
          const kmPerDegLat = 111.32;
          const kmPerDegLon = 111.32 * Math.cos((pt.lat * Math.PI) / 180);
          const rLat = (pt.uncertainty_radius_km || 3.0) / kmPerDegLat;
          const rLon = (pt.uncertainty_radius_km || 3.0) / kmPerDegLon;

          leftCoords.push([pt.lon - rLon, pt.lat + rLat]);
          rightCoords.unshift([pt.lon + rLon, pt.lat - rLat]);

          pointFeatures.push({
            type: 'Feature',
            properties: {
              label: pt.horizon_min === 0 ? 'NOW' : `+${pt.horizon_min}m`,
              cell_id: cell.cell_id
            },
            geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] }
          });
        });

        if (leftCoords.length > 0) {
          const coneRing = [...leftCoords, ...rightCoords, leftCoords[0]];
          coneFeatures.push({
            type: 'Feature',
            properties: { cell_id: cell.cell_id },
            geometry: { type: 'Polygon', coordinates: [coneRing] }
          });
        }
      }
    });

    if (map.getSource('storm-cells-source')) {
      map.getSource('storm-cells-source').setData({ type: 'FeatureCollection', features: polyFeatures });
    }
    if (map.getSource('storm-trajectory-cone-source')) {
      map.getSource('storm-trajectory-cone-source').setData({ type: 'FeatureCollection', features: coneFeatures });
    }
    if (map.getSource('storm-trajectory-line-source')) {
      map.getSource('storm-trajectory-line-source').setData({ type: 'FeatureCollection', features: lineFeatures });
    }
    if (map.getSource('storm-trajectory-points-source')) {
      map.getSource('storm-trajectory-points-source').setData({ type: 'FeatureCollection', features: pointFeatures });
    }

    // Update Observed Lightning Strikes (Explicitly Sensor Observed Ground Strikes)
    const lightningPoints = [
      [78.48, 17.38], [79.01, 18.11], [80.12, 16.50], [81.20, 17.80], [79.80, 17.20]
    ].map((pt, i) => ({
      type: 'Feature',
      properties: { id: i },
      geometry: { type: 'Point', coordinates: pt }
    }));

    if (map.getSource('observed-lightning-source')) {
      map.getSource('observed-lightning-source').setData({
        type: 'FeatureCollection',
        features: activeLayers.lightning ? lightningPoints : []
      });
    }

    // Toggle Motion Vector Visibility
    if (map.getLayer('storm-trajectory-line')) {
      map.setLayoutProperty('storm-trajectory-line', 'visibility', activeLayers.vectors !== false ? 'visible' : 'none');
      map.setLayoutProperty('storm-trajectory-points', 'visibility', activeLayers.vectors !== false ? 'visible' : 'none');
      map.setLayoutProperty('storm-trajectory-labels', 'visibility', activeLayers.vectors !== false ? 'visible' : 'none');
    }

  }, [forecastData, mapLoaded, activeLayers, horizonMin, baseStyle, cells]);

  // --- 6. Camera Smooth FlyTo & Outline Highlight on Selected Cell ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('storm-cells-polygon-selected-outline')) {
      map.setFilter('storm-cells-polygon-selected-outline', ['==', ['get', 'cell_id'], selectedCell?.cell_id || '']);
    }

    if (!selectedCell?.center) return;

    const { lat, lon } = selectedCell.center;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo({
        center: [lon, lat], // MapLibre takes [lon, lat]
        zoom: Math.max(map.getZoom(), 8.2),
        essential: true,
        duration: 1200
      });
    }
  }, [selectedCell, mapLoaded]);

  // Reset Viewport to Regional Extent [80.5, 17.5]
  const handleResetRegionalExtent = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: REGIONAL_CENTER,
      zoom: REGIONAL_ZOOM,
      essential: true,
      duration: 1000
    });
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-[#0F172A] rounded-xl overflow-hidden font-sans border border-[#334155] shadow-md">
      
      {/* Map Element Container */}
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />

      {/* Top Map Control Bar with Honest Layer Telemetry Status */}
      <div className="absolute top-3 left-3 right-3 z-10 bg-[#0F172A]/90 backdrop-blur-md border border-[#334155] p-2.5 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#F8FAFC]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1E293B] rounded-lg border border-[#475569]">
            <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="font-bold text-[11px] text-[#94A3B8]">Projection:</span>
            <span className="text-[#38BDF8] font-bold text-[11px]">{actualProjection}</span>
          </div>

          {/* Layer Toggle Controls with Live Status Indicators */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => toggleLayer('radar')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all border flex items-center space-x-1 ${
                activeLayers.radar 
                  ? 'bg-[#0284C7] text-white border-[#38BDF8] shadow-2xs' 
                  : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
              }`}
            >
              <span>Radar dBZ</span>
              <span className="text-[9px] opacity-90">({activeLayers.radar ? 'ACTIVE' : 'OFF'})</span>
            </button>

            <button
              onClick={() => toggleLayer('satellite')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all border flex items-center space-x-1 ${
                activeLayers.satellite 
                  ? 'bg-[#0284C7] text-white border-[#38BDF8] shadow-2xs' 
                  : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
              }`}
            >
              <span>Satellite IR</span>
              <span className="text-[9px] opacity-90">({activeLayers.satellite ? 'ACTIVE' : 'OFF'})</span>
            </button>

            <button
              onClick={() => toggleLayer('lightning')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all border flex items-center space-x-1 ${
                activeLayers.lightning 
                  ? 'bg-[#D97706] text-white border-[#FBBF24] shadow-2xs' 
                  : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
              }`}
              title="Observed Ground Flash Strikes (Damini / LLN Network)"
            >
              <span>Observed Lightning</span>
              <span className="text-[9px] opacity-90">({activeLayers.lightning ? '5 STRIKES' : 'OFF'})</span>
            </button>

            <button
              onClick={() => toggleLayer('vectors')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all border flex items-center space-x-1 ${
                activeLayers.vectors !== false 
                  ? 'bg-[#0284C7] text-white border-[#38BDF8] shadow-2xs' 
                  : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
              }`}
            >
              <span>Motion Vectors</span>
              <span className="text-[9px] opacity-90">
                ({activeLayers.vectors !== false ? `${cells.length} VECTORS` : 'OFF'})
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Basemap Switcher */}
          <select
            value={baseStyle}
            onChange={(e) => setBaseStyle(e.target.value)}
            className="bg-[#1E293B] border border-[#475569] text-white text-[11px] font-bold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="dark">Dark Canvas + Reference Roads (Esri)</option>
            <option value="satellite">Satellite Imagery + Transport (Esri)</option>
            <option value="terrain">Topographic Muted (Esri Topo)</option>
            <option value="street">Street Map (OpenStreetMap)</option>
          </select>

          {/* Reset Regional Extent Button */}
          <button
            onClick={handleResetRegionalExtent}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#1E293B] hover:bg-[#334155] text-[#38BDF8] border border-[#0284C7] rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
            title="Reset Viewport to Regional Extent [80.5°E, 17.5°N]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sector</span>
          </button>
        </div>
      </div>

      {/* Map Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col space-y-1.5 font-mono">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="p-2 rounded-lg bg-[#0F172A]/90 text-white border border-[#334155] hover:bg-[#1E293B] transition-all cursor-pointer shadow-md"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="p-2 rounded-lg bg-[#0F172A]/90 text-white border border-[#334155] hover:bg-[#1E293B] transition-all cursor-pointer shadow-md"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          onClick={handleResetRegionalExtent}
          className="p-2 rounded-lg bg-[#0F172A]/90 text-[#38BDF8] border border-[#0284C7] hover:bg-[#1E293B] transition-all cursor-pointer shadow-md"
          title="Center on Regional Storm Sector [80.5°E, 17.5°N]"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
