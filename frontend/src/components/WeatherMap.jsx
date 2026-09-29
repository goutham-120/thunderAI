import React, { useRef, useEffect, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { 
  Maximize2,
  Plus,
  Minus,
  Crosshair,
  Zap,
  MapPin,
  Square,
  X
} from 'lucide-react';
import { REGION_CONFIGS } from './WeatherMapConfig';
import indiaStatesData from '../data/india_states.json';

export default function WeatherMap({
  forecastData,
  selectedCell,
  onSelectCell,
  activeLayers,
  toggleLayer,
  horizonMin,
  selectedLocation,
  onLocationSelect,
  selectedRegion
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [baseMapStyle, setBaseMapStyle] = useState('map');

  const currentRegion = REGION_CONFIGS[selectedRegion] || REGION_CONFIGS['Andhra Pradesh & Telangana'];

  // --- 1. Radar Reflectivity Canvas (0 to 70 dBZ) ---
  const generateRadarImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;
    const decay = Math.max(0.65, 1.0 - (horizon / 300));

    const drawCore = (cx, cy, rMax, alphaMult = 1.0) => {
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rMax);
      grad.addColorStop(0.0, `rgba(240, 240, 255, ${0.95 * alphaMult})`); // White-hot core (65+ dBZ)
      grad.addColorStop(0.15, `rgba(217, 70, 239, ${0.95 * alphaMult})`); // Magenta
      grad.addColorStop(0.35, `rgba(239, 68, 68, ${0.92 * alphaMult})`);  // Red
      grad.addColorStop(0.55, `rgba(249, 115, 22, ${0.88 * alphaMult})`); // Orange
      grad.addColorStop(0.72, `rgba(234, 179, 8, ${0.85 * alphaMult})`);  // Yellow
      grad.addColorStop(0.88, `rgba(34, 197, 94, ${0.75 * alphaMult})`);  // Green
      grad.addColorStop(1.0, 'rgba(6, 182, 212, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawCore(105 + shiftX, 115 + shiftY, 48 * decay, decay);
    drawCore(130 + shiftX, 95 + shiftY, 36 * decay, decay);
    drawCore(90 + shiftX, 140 + shiftY, 32 * decay, decay);
    drawCore(145 + shiftX, 145 + shiftY, 28 * decay, decay);
    drawCore(145 + shiftX * 0.8, 195 + shiftY * 0.8, 38 * decay, decay);
    return canvas.toDataURL();
  };

  // --- 2. Satellite Thermal IR Canvas ---
  const generateSatelliteImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const drawCanopy = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      grad.addColorStop(0.3, 'rgba(216, 180, 254, 0.7)');
      grad.addColorStop(0.6, 'rgba(96, 165, 250, 0.45)');
      grad.addColorStop(0.85, 'rgba(30, 58, 138, 0.25)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawCanopy(115, 120, 85);
    drawCanopy(150, 200, 70);
    return canvas.toDataURL();
  };

  // --- 3. Thunderstorm AI Risk Heatmap ---
  const generateAIRiskImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawRisk = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.85)');
      grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.6)');
      grad.addColorStop(0.75, 'rgba(234, 179, 8, 0.35)');
      grad.addColorStop(1.0, 'rgba(59, 130, 246, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawRisk(105 + shiftX, 115 + shiftY, 70);
    drawRisk(145 + shiftX, 195 + shiftY, 60);
    return canvas.toDataURL();
  };

  // --- 4. Lightning Risk Heatmap ---
  const generateLightningRiskImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawLightRisk = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(245, 158, 11, 0.9)');
      grad.addColorStop(0.35, 'rgba(168, 85, 247, 0.7)');
      grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawLightRisk(105 + shiftX, 115 + shiftY, 55);
    drawLightRisk(145 + shiftX, 195 + shiftY, 45);
    return canvas.toDataURL();
  };

  // --- 5. Rainfall Isohyet Canvas ---
  const generateRainfallImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawRain = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(6, 182, 212, 0.85)');
      grad.addColorStop(0.35, 'rgba(59, 130, 246, 0.7)');
      grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.45)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawRain(105 + shiftX, 115 + shiftY, 65);
    drawRain(145 + shiftX, 195 + shiftY, 55);
    return canvas.toDataURL();
  };

  // --- 6. Cloud Top Temp Canvas ---
  const generateCloudTopTempImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const drawTemp = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(232, 121, 249, 0.9)');
      grad.addColorStop(0.3, 'rgba(139, 92, 246, 0.75)');
      grad.addColorStop(0.6, 'rgba(59, 130, 246, 0.5)');
      grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.3)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
      ctx.fill();
    };

    drawTemp(110, 118, 75);
    drawTemp(148, 198, 60);
    return canvas.toDataURL();
  };

  // --- 7. CAPE Energy Canvas ---
  const generateCAPEImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(120, 140, 10, 120, 140, 120);
    grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.55)');
    grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.4)');
    grad.addColorStop(0.8, 'rgba(234, 179, 8, 0.25)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return canvas.toDataURL();
  };

  const createGeographicSelectionFeatures = (label, bounds, center, isCustom = false) => {
    let minLat, maxLat, minLon, maxLon;
    let centerLat, centerLon;

    if (bounds) {
      if (Array.isArray(bounds)) {
        [minLat, minLon, maxLat, maxLon] = bounds;
      } else {
        ({ minLat, maxLat, minLon, maxLon } = bounds);
      }
    }

    if (center) {
      [centerLon, centerLat] = center;
    } else if (minLat !== undefined && maxLat !== undefined) {
      centerLat = (minLat + maxLat) / 2;
      centerLon = (minLon + maxLon) / 2;
    }

    if (minLat === undefined && centerLat !== undefined) {
      minLat = centerLat - 0.8;
      maxLat = centerLat + 0.8;
      minLon = centerLon - 1.0;
      maxLon = centerLon + 1.0;
    }

    if (centerLat === undefined || centerLon === undefined) return null;

    const radiusLatKm = Math.max(((maxLat - minLat) / 2) * 111.32, 14);
    const radiusLonKm = Math.max(((maxLon - minLon) / 2) * 111.32 * Math.cos((centerLat * Math.PI) / 180), 14);

    // Generate 64-point smooth geographic ellipse ring
    const ellipseCoords = [];
    const points = 64;
    const kmPerDegreeLat = 111.32;
    const kmPerDegreeLon = 111.32 * Math.cos((centerLat * Math.PI) / 180);

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * (2 * Math.PI);
      const dx = radiusLonKm * Math.cos(angle);
      const dy = radiusLatKm * Math.sin(angle);

      const lon = centerLon + dx / kmPerDegreeLon;
      const lat = centerLat + dy / kmPerDegreeLat;
      ellipseCoords.push([lon, lat]);
    }
    ellipseCoords.push(ellipseCoords[0]);

    // Bounding rectangle box ring
    const boxCoords = [[
      [minLon, maxLat],
      [maxLon, maxLat],
      [maxLon, minLat],
      [minLon, minLat],
      [minLon, maxLat]
    ]];

    const labelText = isCustom ? '● SELECTED AREA TARGET' : `● AREA: ${label.toUpperCase()}`;

    return {
      boxFill: {
        type: 'Feature',
        properties: { name: labelText, type: 'selection-fill', isCustom },
        geometry: {
          type: 'Polygon',
          coordinates: boxCoords
        }
      },
      ellipse: {
        type: 'Feature',
        properties: { name: labelText, type: 'selection-ellipse', isCustom },
        geometry: {
          type: 'Polygon',
          coordinates: [ellipseCoords]
        }
      },
      box: {
        type: 'Feature',
        properties: { name: labelText, type: 'selection-box', isCustom },
        geometry: {
          type: 'Polygon',
          coordinates: boxCoords
        }
      },
      center: {
        type: 'Feature',
        properties: { name: labelText, type: 'selection-center', isCustom },
        geometry: {
          type: 'Point',
          coordinates: [centerLon, centerLat]
        }
      },
      corners: [
        { type: 'Feature', properties: { type: 'selection-corner' }, geometry: { type: 'Point', coordinates: [minLon, maxLat] } },
        { type: 'Feature', properties: { type: 'selection-corner' }, geometry: { type: 'Point', coordinates: [maxLon, maxLat] } },
        { type: 'Feature', properties: { type: 'selection-corner' }, geometry: { type: 'Point', coordinates: [maxLon, minLat] } },
        { type: 'Feature', properties: { type: 'selection-corner' }, geometry: { type: 'Point', coordinates: [minLon, minLat] } }
      ],
      labelBadge: {
        type: 'Feature',
        properties: { name: labelText, type: 'selection-label' },
        geometry: {
          type: 'Point',
          coordinates: [minLon, maxLat]
        }
      }
    };
  };

  const bringSelectionLayersToFront = (map) => {
    if (!map) return;
    const layersToMove = [
      'india-all-states-base-outline',
      'selected-state-polygon-fill',
      'selected-state-polygon-glow',
      'selected-state-polygon-outline',
      'selected-region-fill',
      'selected-region-outline-glow',
      'selected-region-box',
      'selected-region-outline',
      'selected-region-corner',
      'selected-region-center',
      'selected-region-label',
      'selected-area-fill',
      'selected-area-outline-glow',
      'selected-area-box',
      'selected-area-outline',
      'selected-area-corner',
      'selected-area-center',
      'selected-area-label'
    ];
    layersToMove.forEach(id => {
      if (map.getLayer(id)) {
        map.moveLayer(id);
      }
    });
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const baseSources = {
      'map-source': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap'
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
        tileSize: 256
      },
      'boundaries-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      }
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: baseSources,
        layers: [
          { id: 'base-map-layer', type: 'raster', source: 'map-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'visible' } },
          { id: 'base-satellite-layer', type: 'raster', source: 'satellite-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'base-terrain-layer', type: 'raster', source: 'terrain-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'boundaries-layer', type: 'raster', source: 'boundaries-source', minzoom: 0, maxzoom: 19, paint: { 'raster-opacity': 0.85 } }
        ]
      },
      center: currentRegion.center,
      zoom: currentRegion.zoom,
      minZoom: 4,
      maxZoom: 16
    });

    map.on('load', () => {
      setMapLoaded(true);

      // Register India States GeoJSON boundary source & polygon layers
      map.addSource('india-states-boundary-source', {
        type: 'geojson',
        data: indiaStatesData
      });

      map.addLayer({
        id: 'india-all-states-base-outline',
        type: 'line',
        source: 'india-states-boundary-source',
        paint: {
          'line-color': '#64748B',
          'line-width': 1.2,
          'line-opacity': 0.35
        }
      });

      map.addLayer({
        id: 'selected-state-polygon-fill',
        type: 'fill',
        source: 'india-states-boundary-source',
        filter: ['==', 'state_name', ''],
        paint: {
          'fill-color': '#0284C7',
          'fill-opacity': 0.18
        }
      });

      map.addLayer({
        id: 'selected-state-polygon-glow',
        type: 'line',
        source: 'india-states-boundary-source',
        filter: ['==', 'state_name', ''],
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7.5,
          'line-opacity': 0.9
        }
      });

      map.addLayer({
        id: 'selected-state-polygon-outline',
        type: 'line',
        source: 'india-states-boundary-source',
        filter: ['==', 'state_name', ''],
        paint: {
          'line-color': '#0284C7',
          'line-width': 3.5,
          'line-opacity': 1.0
        }
      });

      // Helper function to register selection boundary sources & layers
      const addSelectionLayers = (sourceId, layerPrefix, defaultColor) => {
        map.addSource(sourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        // 1. Transparent Cyan Fill over entire bounding box
        map.addLayer({
          id: `${layerPrefix}-fill`,
          type: 'fill',
          source: sourceId,
          filter: ['in', 'type', 'selection-fill', 'selection-ellipse'],
          paint: {
            'fill-color': defaultColor,
            'fill-opacity': 0.18
          }
        });

        // 2. High-Contrast White Casing Outer Glow (7.5px)
        map.addLayer({
          id: `${layerPrefix}-outline-glow`,
          type: 'line',
          source: sourceId,
          filter: ['in', 'type', 'selection-box', 'selection-ellipse'],
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 7.5,
            'line-opacity': 0.9
          }
        });

        // 3. Primary Solid Bounding Box Border (3.5px)
        map.addLayer({
          id: `${layerPrefix}-box`,
          type: 'line',
          source: sourceId,
          filter: ['==', 'type', 'selection-box'],
          paint: {
            'line-color': defaultColor,
            'line-width': 3.5,
            'line-opacity': 1.0
          }
        });

        // 4. Secondary Inner Dashed Target Ring
        map.addLayer({
          id: `${layerPrefix}-outline`,
          type: 'line',
          source: sourceId,
          filter: ['==', 'type', 'selection-ellipse'],
          paint: {
            'line-color': '#38BDF8',
            'line-width': 2.5,
            'line-dasharray': [4, 3],
            'line-opacity': 0.9
          }
        });

        // 5. Corner Target Dots
        map.addLayer({
          id: `${layerPrefix}-corner`,
          type: 'circle',
          source: sourceId,
          filter: ['==', 'type', 'selection-corner'],
          paint: {
            'circle-radius': 5.5,
            'circle-color': defaultColor,
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#FFFFFF'
          }
        });

        // 6. Center Point Marker
        map.addLayer({
          id: `${layerPrefix}-center`,
          type: 'circle',
          source: sourceId,
          filter: ['==', 'type', 'selection-center'],
          paint: {
            'circle-radius': 8,
            'circle-color': defaultColor,
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#FFFFFF'
          }
        });

        // 7. Top-Left "SELECTED AREA" Map Text Badge Label
        map.addLayer({
          id: `${layerPrefix}-label`,
          type: 'symbol',
          source: sourceId,
          filter: ['==', 'type', 'selection-label'],
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 11,
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-offset': [0.6, 0.6],
            'text-anchor': 'top-left',
            'text-transform': 'uppercase'
          },
          paint: {
            'text-color': '#0F2942',
            'text-halo-color': '#F8FCFE',
            'text-halo-width': 3.5
          }
        });
      };

      addSelectionLayers('selected-region-source', 'selected-region', '#0284C7');
      addSelectionLayers('selected-area-source', 'selected-area', '#0284C7');

      // Add Cities
      const cityFeatures = currentRegion.cities.map(c => ({
        type: 'Feature',
        properties: { name: c.name, isMain: !!c.isMain, isState: !!c.isState, lat: c.lat, lon: c.lon },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] }
      }));

      map.addSource('cities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: cityFeatures }
      });

      map.addLayer({
        id: 'cities-points',
        type: 'circle',
        source: 'cities',
        filter: ['!=', 'isState', true],
        paint: {
          'circle-radius': ['case', ['get', 'isMain'], 6, 3.5],
          'circle-color': '#DC2626',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      map.addLayer({
        id: 'cities-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['case', ['get', 'isState'], 13, ['get', 'isMain'], 11, 10],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0.6, -0.6],
          'text-anchor': 'left',
          'text-transform': ['case', ['get', 'isState'], 'uppercase', 'none']
        },
        paint: {
          'text-color': '#0F2942',
          'text-halo-color': '#F8FCFE',
          'text-halo-width': 3
        }
      });

      // Lightning Strikes GeoJSON
      const lightningPoints = currentRegion.lightning.map((pt, i) => ({
        type: 'Feature',
        properties: { id: i },
        geometry: { type: 'Point', coordinates: pt }
      }));

      map.addSource('lightning-strikes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: lightningPoints }
      });

      map.addLayer({
        id: 'lightning-glow',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 12,
          'circle-color': '#F59E0B',
          'circle-opacity': 0.4
        }
      });

      map.addLayer({
        id: 'lightning-core',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 4,
          'circle-color': '#D97706',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#FFFFFF'
        }
      });

      // Wind Vector GeoJSON
      const windVectors = [];
      const b = currentRegion.bounds;
      for (let lat = b.minLat + 0.6; lat < b.maxLat; lat += 0.8) {
        for (let lon = b.minLon + 0.6; lon < b.maxLon; lon += 0.9) {
          windVectors.push({
            type: 'Feature',
            properties: { speed: 18, direction: 'SE' },
            geometry: {
              type: 'LineString',
              coordinates: [[lon, lat], [lon + 0.35, lat - 0.25]]
            }
          });
        }
      }

      map.addSource('wind-vectors', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: windVectors }
      });

      map.addLayer({
        id: 'wind-lines',
        type: 'line',
        source: 'wind-vectors',
        layout: { visibility: 'none' },
        paint: {
          'line-color': '#0284C7',
          'line-width': 2,
          'line-opacity': 0.7,
          'line-dasharray': [2, 2]
        }
      });

      // --- Storm Cells & Trajectory Sources ---
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

      // 1. Trajectory Expanding Uncertainty Cone Fill
      map.addLayer({
        id: 'storm-trajectory-cone-fill',
        type: 'fill',
        source: 'storm-trajectory-cone-source',
        paint: {
          'fill-color': '#DC2626',
          'fill-opacity': 0.14
        }
      });

      // 2. Trajectory Directional Line Arrow
      map.addLayer({
        id: 'storm-trajectory-line',
        type: 'line',
        source: 'storm-trajectory-line-source',
        paint: {
          'line-color': '#DC2626',
          'line-width': 3,
          'line-dasharray': [3, 2]
        }
      });

      // 3. Storm Core Polygon Fill & Outline
      map.addLayer({
        id: 'storm-cells-polygon-fill',
        type: 'fill',
        source: 'storm-cells-source',
        paint: {
          'fill-color': '#DC2626',
          'fill-opacity': 0.35
        }
      });
      map.addLayer({
        id: 'storm-cells-polygon-outline',
        type: 'line',
        source: 'storm-cells-source',
        paint: {
          'line-color': '#DC2626',
          'line-width': 2.5
        }
      });

      // 4. Trajectory Point Markers & Horizon Labels
      map.addLayer({
        id: 'storm-trajectory-points',
        type: 'circle',
        source: 'storm-trajectory-points-source',
        paint: {
          'circle-radius': 5,
          'circle-color': '#DC2626',
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
          'text-size': 10,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0.6, -0.6],
          'text-anchor': 'left'
        },
        paint: {
          'text-color': '#991B1B',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2
        }
      });

      map.on('click', 'cities-points', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          if (onLocationSelect) {
            onLocationSelect({
              name: `${props.name}, ${selectedRegion}`,
              lat: String(props.lat),
              lon: String(props.lon)
            });
          }
        }
      });

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['cities-points'] });
        if (features.length === 0 && onLocationSelect) {
          onLocationSelect({
            name: `${e.lngLat.lat.toFixed(2)}°N, ${e.lngLat.lng.toFixed(2)}°E (${selectedRegion || 'Target'})`,
            lat: e.lngLat.lat.toFixed(4),
            lon: e.lngLat.lng.toFixed(4)
          });
        }
      });
    });


    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Region Dynamic Center, Cities & State Polygon / Box Selection Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Check if selectedRegion corresponds to a State or Union Territory polygon feature
    const matchedState = indiaStatesData.features.find(
      f => f.properties && f.properties.state_name === selectedRegion
    );

    const regionSource = map.getSource('selected-region-source');

    if (matchedState) {
      // Highlight state polygon using MapLibre filter
      if (map.getLayer('selected-state-polygon-fill')) {
        map.setFilter('selected-state-polygon-fill', ['==', 'state_name', selectedRegion]);
      }
      if (map.getLayer('selected-state-polygon-glow')) {
        map.setFilter('selected-state-polygon-glow', ['==', 'state_name', selectedRegion]);
      }
      if (map.getLayer('selected-state-polygon-outline')) {
        map.setFilter('selected-state-polygon-outline', ['==', 'state_name', selectedRegion]);
      }

      // Clear legacy box overlay so it doesn't overlap exact state polygon
      if (regionSource) {
        regionSource.setData({ type: 'FeatureCollection', features: [] });
      }

      // Fit map camera to exact State/UT bounds: [minLat, minLon, maxLat, maxLon]
      const b = matchedState.properties.bounds;
      if (b && b.length === 4) {
        map.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: 60, maxZoom: 9.5, duration: 1000 });
      } else if (matchedState.properties.center) {
        map.flyTo({ center: matchedState.properties.center, zoom: 7.5, essential: true });
      }
    } else {
      // Clear State polygon highlights
      if (map.getLayer('selected-state-polygon-fill')) {
        map.setFilter('selected-state-polygon-fill', ['==', 'state_name', '']);
      }
      if (map.getLayer('selected-state-polygon-glow')) {
        map.setFilter('selected-state-polygon-glow', ['==', 'state_name', '']);
      }
      if (map.getLayer('selected-state-polygon-outline')) {
        map.setFilter('selected-state-polygon-outline', ['==', 'state_name', '']);
      }

      // Fallback for Operational Composite Regions
      if (currentRegion) {
        map.flyTo({ center: currentRegion.center, zoom: currentRegion.zoom, essential: true });

        if (regionSource && selectedRegion) {
          const selectionData = createGeographicSelectionFeatures(
            selectedRegion,
            currentRegion.bounds,
            currentRegion.center,
            false
          );
          if (selectionData) {
            regionSource.setData({
              type: 'FeatureCollection',
              features: [
                selectionData.boxFill,
                selectionData.box,
                selectionData.ellipse,
                selectionData.center,
                ...selectionData.corners,
                selectionData.labelBadge
              ]
            });
          }
        }
      }
    }

    // Update city markers if currentRegion has cities
    if (currentRegion && currentRegion.cities) {
      const cityFeatures = currentRegion.cities.map(c => ({
        type: 'Feature',
        properties: { name: c.name, isMain: !!c.isMain, isState: !!c.isState, lat: c.lat, lon: c.lon },
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] }
      }));

      if (map.getSource('cities')) {
        map.getSource('cities').setData({ type: 'FeatureCollection', features: cityFeatures });
      }
    }

    // Update lightning points if currentRegion has lightning
    if (currentRegion && currentRegion.lightning) {
      const lightningPoints = currentRegion.lightning.map((pt, i) => ({
        type: 'Feature',
        properties: { id: i },
        geometry: { type: 'Point', coordinates: pt }
      }));

      if (map.getSource('lightning-strikes')) {
        map.getSource('lightning-strikes').setData({ type: 'FeatureCollection', features: lightningPoints });
      }
    }

    bringSelectionLayersToFront(map);
  }, [selectedRegion, mapLoaded]);



  // Switch Base Style
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('base-satellite-layer')) {
      map.setLayoutProperty('base-satellite-layer', 'visibility', baseMapStyle === 'satellite' ? 'visible' : 'none');
    }
    if (map.getLayer('base-map-layer')) {
      map.setLayoutProperty('base-map-layer', 'visibility', baseMapStyle === 'map' ? 'visible' : 'none');
    }
    if (map.getLayer('base-terrain-layer')) {
      map.setLayoutProperty('base-terrain-layer', 'visibility', baseMapStyle === 'terrain' ? 'visible' : 'none');
    }
    bringSelectionLayersToFront(map);
  }, [baseMapStyle, mapLoaded]);

  // Dynamic Rendering for Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const b = currentRegion.bounds;
    const coordinates = [
      [b.minLon, b.maxLat],
      [b.maxLon, b.maxLat],
      [b.maxLon, b.minLat],
      [b.minLon, b.minLat]
    ];

    // 1. Radar Layer
    const radarDataUrl = generateRadarImageDataUrl(horizonMin);
    if (map.getSource('radar-source')) {
      map.removeLayer('radar-layer');
      map.removeSource('radar-source');
    }
    if (activeLayers.radar) {
      map.addSource('radar-source', { type: 'image', url: radarDataUrl, coordinates });
      map.addLayer({
        id: 'radar-layer',
        type: 'raster',
        source: 'radar-source',
        paint: { 'raster-opacity': 0.85, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 2. Satellite Layer
    const satDataUrl = generateSatelliteImageDataUrl();
    if (map.getSource('satellite-ir-source')) {
      map.removeLayer('satellite-ir-layer');
      map.removeSource('satellite-ir-source');
    }
    if (activeLayers.satellite) {
      map.addSource('satellite-ir-source', { type: 'image', url: satDataUrl, coordinates });
      map.addLayer({
        id: 'satellite-ir-layer',
        type: 'raster',
        source: 'satellite-ir-source',
        paint: { 'raster-opacity': 0.65, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 3. AI Risk Layer
    const riskDataUrl = generateAIRiskImageDataUrl(horizonMin);
    if (map.getSource('ai-risk-source')) {
      map.removeLayer('ai-risk-layer');
      map.removeSource('ai-risk-source');
    }
    if (activeLayers.aiRisk) {
      map.addSource('ai-risk-source', { type: 'image', url: riskDataUrl, coordinates });
      map.addLayer({
        id: 'ai-risk-layer',
        type: 'raster',
        source: 'ai-risk-source',
        paint: { 'raster-opacity': 0.6, 'raster-resampling': 'linear' }
      }, 'radar-layer');
    }

    // 4. Lightning Risk Layer
    const lightRiskDataUrl = generateLightningRiskImageDataUrl(horizonMin);
    if (map.getSource('lightning-risk-source')) {
      map.removeLayer('lightning-risk-layer');
      map.removeSource('lightning-risk-source');
    }
    if (activeLayers.lightningRisk) {
      map.addSource('lightning-risk-source', { type: 'image', url: lightRiskDataUrl, coordinates });
      map.addLayer({
        id: 'lightning-risk-layer',
        type: 'raster',
        source: 'lightning-risk-source',
        paint: { 'raster-opacity': 0.7, 'raster-resampling': 'linear' }
      }, 'radar-layer');
    }

    // 5. Rainfall Isohyets
    const rainDataUrl = generateRainfallImageDataUrl(horizonMin);
    if (map.getSource('rainfall-source')) {
      map.removeLayer('rainfall-layer');
      map.removeSource('rainfall-source');
    }
    if (activeLayers.rainfall) {
      map.addSource('rainfall-source', { type: 'image', url: rainDataUrl, coordinates });
      map.addLayer({
        id: 'rainfall-layer',
        type: 'raster',
        source: 'rainfall-source',
        paint: { 'raster-opacity': 0.75, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 6. Cloud Top Temp
    const cloudTopDataUrl = generateCloudTopTempImageDataUrl();
    if (map.getSource('cloud-top-source')) {
      map.removeLayer('cloud-top-layer');
      map.removeSource('cloud-top-source');
    }
    if (activeLayers.cloudTop) {
      map.addSource('cloud-top-source', { type: 'image', url: cloudTopDataUrl, coordinates });
      map.addLayer({
        id: 'cloud-top-layer',
        type: 'raster',
        source: 'cloud-top-source',
        paint: { 'raster-opacity': 0.7, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 7. CAPE Energy
    const capeDataUrl = generateCAPEImageDataUrl();
    if (map.getSource('cape-source')) {
      map.removeLayer('cape-layer');
      map.removeSource('cape-source');
    }
    if (activeLayers.cape) {
      map.addSource('cape-source', { type: 'image', url: capeDataUrl, coordinates });
      map.addLayer({
        id: 'cape-layer',
        type: 'raster',
        source: 'cape-source',
        paint: { 'raster-opacity': 0.5, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 8. Wind Vectors
    if (map.getLayer('wind-lines')) {
      map.setLayoutProperty('wind-lines', 'visibility', activeLayers.wind ? 'visible' : 'none');
    }

    // 9. Lightning Points
    if (map.getLayer('lightning-glow')) {
      map.setLayoutProperty('lightning-glow', 'visibility', activeLayers.lightning ? 'visible' : 'none');
      map.setLayoutProperty('lightning-core', 'visibility', activeLayers.lightning ? 'visible' : 'none');
    }

    // 10. Boundaries
    if (map.getLayer('boundaries-layer')) {
      map.setLayoutProperty('boundaries-layer', 'visibility', activeLayers.adminBoundaries ? 'visible' : 'none');
    }

    // 11. Storm Cells, Velocity Vectors & Uncertainty Cones
    const cells = forecastData?.storm_cells || [];
    const polyFeatures = [];
    const lineFeatures = [];
    const coneFeatures = [];
    const pointFeatures = [];

    cells.forEach((cell) => {
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

      const traj = cell.trajectory;
      if (traj && traj.length > 0) {
        const lineCoords = traj.map(pt => [pt.lon, pt.lat]);
        lineFeatures.push({
          type: 'Feature',
          properties: { cell_id: cell.cell_id },
          geometry: { type: 'LineString', coordinates: lineCoords }
        });

        const leftCoords = [];
        const rightCoords = [];

        traj.forEach((pt) => {
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
              dbz: pt.predicted_max_dbz,
              cell_id: cell.cell_id
            },
            geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] }
          });
        });

        const coneRing = [...leftCoords, ...rightCoords, leftCoords[0]];
        coneFeatures.push({
          type: 'Feature',
          properties: { cell_id: cell.cell_id },
          geometry: { type: 'Polygon', coordinates: [coneRing] }
        });
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

    bringSelectionLayersToFront(map);
  }, [forecastData, mapLoaded, activeLayers, horizonMin, selectedRegion]);

  // Selected Cell Map Centering & Focus Effect
  // Selected Cell Map Centering & Focus Effect
useEffect(() => {
  const map = mapRef.current;
  if (!map || !mapLoaded || !selectedCell?.center) return;

  const { lat, lon } = selectedCell.center;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  map.flyTo({
    center: [lon, lat],
    zoom: Math.max(map.getZoom(), 8.5),
    essential: true
  });
}, [selectedCell, mapLoaded]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetCenter = () => mapRef.current?.flyTo({ center: currentRegion.center, zoom: currentRegion.zoom });

  return (
    <div className="relative w-full h-full bg-[#F8FCFE] rounded-xl overflow-hidden border border-[#D0E3F0] shadow-xs flex flex-col min-h-[480px]">
      
      {/* Map Type Controls (Map, Satellite, Terrain) */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5">
        <div className="bg-[#F8FCFE]/95 backdrop-blur-xs p-1 rounded-lg border border-[#D0E3F0] shadow-xs flex items-center space-x-1 text-xs font-medium text-[#0F2942]">
          <button
            onClick={() => setBaseMapStyle('map')}
            className={`px-3 py-1 rounded-md transition-all ${
              baseMapStyle === 'map' 
                ? 'bg-[#0284C7] text-white font-semibold shadow-2xs' 
                : 'text-[#47637E] hover:text-[#0F2942] hover:bg-[#EEF6FB]'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setBaseMapStyle('satellite')}
            className={`px-3 py-1 rounded-md transition-all ${
              baseMapStyle === 'satellite' 
                ? 'bg-[#0284C7] text-white font-semibold shadow-2xs' 
                : 'text-[#47637E] hover:text-[#0F2942] hover:bg-[#EEF6FB]'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setBaseMapStyle('terrain')}
            className={`px-3 py-1 rounded-md transition-all ${
              baseMapStyle === 'terrain' 
                ? 'bg-[#0284C7] text-white font-semibold shadow-2xs' 
                : 'text-[#47637E] hover:text-[#0F2942] hover:bg-[#EEF6FB]'
            }`}
          >
            Terrain
          </button>
        </div>

        <button 
          onClick={handleResetCenter}
          className="p-2 bg-[#F8FCFE]/95 backdrop-blur-xs hover:bg-[#EEF6FB] text-[#0F2942] rounded-lg border border-[#D0E3F0] shadow-xs transition-all"
          title="Fullscreen / Center"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Map Zoom Controls */}
      <div className="absolute right-3 top-16 z-20 flex flex-col space-y-1">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-[#F8FCFE]/95 backdrop-blur-xs hover:bg-[#EEF6FB] text-[#0F2942] rounded-lg border border-[#D0E3F0] shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-[#F8FCFE]/95 backdrop-blur-xs hover:bg-[#EEF6FB] text-[#0F2942] rounded-lg border border-[#D0E3F0] shadow-xs transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCenter}
          className="p-2 bg-[#F8FCFE]/95 backdrop-blur-xs hover:bg-[#EEF6FB] text-[#0284C7] rounded-lg border border-[#D0E3F0] shadow-xs transition-all"
          title="Recenter"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* MapLibre Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 min-h-[480px] bg-[#EEF6FB]"
      />

      {/* Bottom-Left Reflectivity Scale Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-[#F8FCFE]/95 backdrop-blur-xs p-2.5 rounded-lg border border-[#D0E3F0] shadow-sm font-sans text-xs">
        <div className="text-[10px] font-bold text-[#0F2942] uppercase tracking-wider mb-1 flex items-center justify-between gap-2">
          <span>Radar Reflectivity Scale (dBZ)</span>
          {selectedCell && (
            <span className="text-[9px] font-mono text-[#DC2626] font-bold bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#FEE2E2]">
              Focus: {selectedCell.cell_id}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-semibold text-[#0F2942] mb-1">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-cyan-400 inline-block border border-cyan-500"></span>
            <span>15–30 Light</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-yellow-400 inline-block border border-yellow-500"></span>
            <span>30–45 Mod</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-500 inline-block border border-red-600"></span>
            <span>45–55 Heavy</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-purple-600 inline-block border border-purple-700"></span>
            <span>&gt;55 Severe</span>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-[9px] font-mono font-bold text-[#0F2942]">
          <span>15</span>
          <div className="flex flex-1 rounded overflow-hidden border border-[#D0E3F0] h-2">
            <span className="w-1/4 bg-cyan-400 inline-block"></span>
            <span className="w-1/4 bg-yellow-400 inline-block"></span>
            <span className="w-1/4 bg-red-500 inline-block"></span>
            <span className="w-1/4 bg-purple-600 inline-block"></span>
          </div>
          <span>65+</span>
        </div>
      </div>

      {/* Bottom-Right Lightning Legend */}
      <div className="absolute bottom-3 right-3 z-20 bg-[#F8FCFE]/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#D0E3F0] shadow-sm flex items-center space-x-2 text-xs">
        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
        <span className="font-medium text-[#0F2942] text-[11px]">Lightning Strikes</span>
      </div>
    </div>
  );
}
