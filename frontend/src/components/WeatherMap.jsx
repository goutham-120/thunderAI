import React, { useRef, useEffect, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { 
  Layers, 
  Zap, 
  Radio, 
  Navigation, 
  Sparkles, 
  Crosshair,
  Maximize2,
  Plus,
  Minus
} from 'lucide-react';
import { REGION_CONFIGS } from './WeatherMapConfig';

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
  const [baseMapStyle, setBaseMapStyle] = useState('satellite');

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
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)'); // Cold White Top (-70C)
      grad.addColorStop(0.3, 'rgba(216, 180, 254, 0.7)');  // Deep Purple
      grad.addColorStop(0.6, 'rgba(96, 165, 250, 0.45)');  // Blue Anvil
      grad.addColorStop(0.85, 'rgba(30, 58, 138, 0.25)'); // Cirrus Fringe
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

  // --- 3. Thunderstorm AI Risk Heatmap (Crimson/Orange) ---
  const generateAIRiskImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawRisk = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.85)'); // 90%+ Red
      grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.6)'); // 70% Orange
      grad.addColorStop(0.75, 'rgba(234, 179, 8, 0.35)'); // 40% Yellow
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

  // --- 4. Lightning Risk Heatmap (Electric Violet / Amber) ---
  const generateLightningRiskImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawLightRisk = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 3, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(245, 158, 11, 0.9)');  // Amber
      grad.addColorStop(0.35, 'rgba(168, 85, 247, 0.7)'); // Violet
      grad.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)');  // Blue
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

  // --- 5. Rainfall Forecast Isohyets Canvas (Cyan/Blue mm/hr) ---
  const generateRainfallImageDataUrl = (horizon) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const shiftX = (horizon / 180) * 20;
    const shiftY = (horizon / 180) * 16;

    const drawRain = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(6, 182, 212, 0.85)');  // 70+ mm/hr Heavy Downpour (Cyan)
      grad.addColorStop(0.35, 'rgba(59, 130, 246, 0.7)'); // 40 mm/hr Blue
      grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.45)'); // 15 mm/hr Emerald
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

  // --- 6. Cloud Top Temperature Map (-75C to -20C) ---
  const generateCloudTopTempImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const drawTemp = (cx, cy, rMax) => {
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rMax);
      grad.addColorStop(0.0, 'rgba(232, 121, 249, 0.9)'); // -75C Extreme Deep Overshoot
      grad.addColorStop(0.3, 'rgba(139, 92, 246, 0.75)'); // -60C
      grad.addColorStop(0.6, 'rgba(59, 130, 246, 0.5)');  // -40C
      grad.addColorStop(0.85, 'rgba(6, 182, 212, 0.3)');  // -20C
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

  // --- 7. NWP CAPE Instability Energy Canvas (1500 to 3200 J/kg) ---
  const generateCAPEImageDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Broad atmospheric instability field
    const grad = ctx.createRadialGradient(120, 140, 10, 120, 140, 120);
    grad.addColorStop(0.0, 'rgba(239, 68, 68, 0.55)');   // Extreme CAPE (>2800 J/kg)
    grad.addColorStop(0.45, 'rgba(249, 115, 22, 0.4)');  // High CAPE (2000 J/kg)
    grad.addColorStop(0.8, 'rgba(234, 179, 8, 0.25)');   // Moderate CAPE (1400 J/kg)
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return canvas.toDataURL();
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const baseSources = {
      'satellite-source': {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, Maxar'
      },
      'map-source': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap'
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
          { id: 'base-satellite-layer', type: 'raster', source: 'satellite-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'visible' } },
          { id: 'base-map-layer', type: 'raster', source: 'map-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'base-terrain-layer', type: 'raster', source: 'terrain-source', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
          { id: 'boundaries-layer', type: 'raster', source: 'boundaries-source', minzoom: 0, maxzoom: 19, paint: { 'raster-opacity': 0.95 } }
        ]
      },
      center: currentRegion.center,
      zoom: currentRegion.zoom,
      minZoom: 4,
      maxZoom: 16
    });

    map.on('load', () => {
      setMapLoaded(true);

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
          'circle-color': ['case', ['get', 'isMain'], '#EF4444', '#FFFFFF'],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0F172A'
        }
      });

      map.addLayer({
        id: 'cities-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['case', ['get', 'isState'], 14, ['get', 'isMain'], 12, 10],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0.6, -0.6],
          'text-anchor': 'left',
          'text-transform': ['case', ['get', 'isState'], 'uppercase', 'none']
        },
        paint: {
          'text-color': '#F8FAFC',
          'text-halo-color': '#070B14',
          'text-halo-width': 2.5
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
          'circle-radius': 14,
          'circle-color': '#F59E0B',
          'circle-opacity': 0.5
        }
      });

      map.addLayer({
        id: 'lightning-core',
        type: 'circle',
        source: 'lightning-strikes',
        paint: {
          'circle-radius': 4.5,
          'circle-color': '#FEF08A',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#F59E0B'
        }
      });

      // Wind Vector GeoJSON (stream flow arrows SE 18 km/h)
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
          'line-color': '#38BDF8',
          'line-width': 2,
          'line-opacity': 0.75,
          'line-dasharray': [2, 2]
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
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Region Dynamic Center, Zoom, Cities, and Lightning Strikes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    map.flyTo({ center: currentRegion.center, zoom: currentRegion.zoom, essential: true });

    const cityFeatures = currentRegion.cities.map(c => ({
      type: 'Feature',
      properties: { name: c.name, isMain: !!c.isMain, isState: !!c.isState, lat: c.lat, lon: c.lon },
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] }
    }));

    if (map.getSource('cities')) {
      map.getSource('cities').setData({ type: 'FeatureCollection', features: cityFeatures });
    }

    const lightningPoints = currentRegion.lightning.map((pt, i) => ({
      type: 'Feature',
      properties: { id: i },
      geometry: { type: 'Point', coordinates: pt }
    }));

    if (map.getSource('lightning-strikes')) {
      map.getSource('lightning-strikes').setData({ type: 'FeatureCollection', features: lightningPoints });
    }
  }, [selectedRegion, mapLoaded]);

  // Switch Base Style (Map, Satellite, Terrain)
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
  }, [baseMapStyle, mapLoaded]);

  // --- DYNAMIC RENDERING FOR ALL 10 LAYERS ---
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

    // 1. Radar Reflectivity Layer
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
        paint: { 'raster-opacity': 0.9, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 2. Satellite (IR) Layer
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
        paint: { 'raster-opacity': 0.7, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 3. Thunderstorm AI Risk Layer
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
        paint: { 'raster-opacity': 0.65, 'raster-resampling': 'linear' }
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
        paint: { 'raster-opacity': 0.75, 'raster-resampling': 'linear' }
      }, 'radar-layer');
    }

    // 5. Rainfall Forecast Isohyet Layer (mm/hr)
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
        paint: { 'raster-opacity': 0.8, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 6. Cloud Top Temperature Layer
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
        paint: { 'raster-opacity': 0.75, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 7. CAPE (Model) Thermodynamic Energy Layer
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
        paint: { 'raster-opacity': 0.55, 'raster-resampling': 'linear' }
      }, 'boundaries-layer');
    }

    // 8. Wind Vectors Layer
    if (map.getLayer('wind-lines')) {
      map.setLayoutProperty('wind-lines', 'visibility', activeLayers.wind ? 'visible' : 'none');
    }

    // 9. Lightning Points Toggle
    const isLightningActive = activeLayers.lightning;
    if (map.getLayer('lightning-glow')) {
      map.setLayoutProperty('lightning-glow', 'visibility', isLightningActive ? 'visible' : 'none');
      map.setLayoutProperty('lightning-core', 'visibility', isLightningActive ? 'visible' : 'none');
    }

    // 10. Boundaries Toggle
    if (map.getLayer('boundaries-layer')) {
      map.setLayoutProperty('boundaries-layer', 'visibility', activeLayers.adminBoundaries ? 'visible' : 'none');
    }

  }, [forecastData, mapLoaded, activeLayers, horizonMin, selectedRegion]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetCenter = () => mapRef.current?.flyTo({ center: currentRegion.center, zoom: currentRegion.zoom });

  return (
    <div className="relative w-full h-full bg-[#070B14] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col min-h-[480px]">
      {/* Top Map Type Toggles (Map, Satellite, Terrain) */}
      <div className="absolute top-3 right-3 z-20 flex items-center space-x-1.5">
        <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg flex items-center space-x-1 text-xs font-semibold">
          <button
            onClick={() => setBaseMapStyle('map')}
            className={`px-3 py-1 rounded-lg transition-all ${
              baseMapStyle === 'map' 
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/40 font-bold' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setBaseMapStyle('satellite')}
            className={`px-3 py-1 rounded-lg transition-all ${
              baseMapStyle === 'satellite' 
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/40 font-bold' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setBaseMapStyle('terrain')}
            className={`px-3 py-1 rounded-lg transition-all ${
              baseMapStyle === 'terrain' 
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)] border border-blue-400/40 font-bold' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Terrain
          </button>
        </div>

        <button 
          onClick={handleResetCenter}
          className="p-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 shadow-lg transition-all"
          title="Fullscreen / Center"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Map Navigation Controls (+, -, Target) */}
      <div className="absolute right-3 top-20 z-20 flex flex-col space-y-1.5">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700 shadow-lg transition-all"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCenter}
          className="p-2 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-cyan-400 rounded-xl border border-slate-700 shadow-lg transition-all"
          title="Recenter"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* MapLibre WebGL Container */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 min-h-[480px] bg-[#070B14]"
      />

      {/* Bottom-Left Radar Reflectivity Scale Legend */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>Doppler Reflectivity Scale (dBZ)</span>
        </div>
        <div className="flex items-center space-x-1 text-[9px] font-mono font-bold">
          <span className="text-slate-400">0</span>
          <div className="flex rounded overflow-hidden border border-slate-700 h-2.5">
            <span className="w-4 bg-cyan-400 inline-block"></span>
            <span className="w-4 bg-emerald-400 inline-block"></span>
            <span className="w-4 bg-green-500 inline-block"></span>
            <span className="w-4 bg-yellow-400 inline-block"></span>
            <span className="w-4 bg-orange-500 inline-block"></span>
            <span className="w-4 bg-red-500 inline-block"></span>
            <span className="w-4 bg-fuchsia-500 inline-block"></span>
            <span className="w-4 bg-purple-500 inline-block"></span>
            <span className="w-4 bg-white inline-block"></span>
          </div>
          <span className="text-white">70</span>
        </div>
        <div className="flex justify-between text-[8px] font-mono text-slate-400 mt-1">
          <span>0</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>60</span>
          <span>70</span>
        </div>
      </div>

      {/* Bottom-Right Lightning Legend */}
      <div className="absolute bottom-3 right-16 z-20 bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-3 text-xs">
        <div className="flex items-center space-x-1 font-bold text-amber-400 text-[11px]">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Lightning (last 30 min)</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-300">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300"></span>1-5</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span>6-20</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>21-50</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>51-100</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span>&gt;100</span>
        </div>
      </div>
    </div>
  );
}
