import React, { useState, useEffect, useCallback, useRef } from 'react';
import WeatherMap from '../WeatherMap';
import SpatialNowcastHeader from './SpatialNowcastHeader';
import SpatialCoordinateSearch from './SpatialCoordinateSearch';
import SpatialControlSidebar from './SpatialControlSidebar';
import SpatialMapLegend from './SpatialMapLegend';
import SpatialLocationInspector from './SpatialLocationInspector';
import api from '../../services/api';
import { 
  AlertTriangle, 
  RefreshCw
} from 'lucide-react';

export default function SpatialNowcastPage({
  forecastData: parentForecastData,
  selectedCell: parentSelectedCell,
  onSelectCell: parentOnSelectCell,
  activeLayers: parentActiveLayers,
  toggleLayer: parentToggleLayer,
  horizonMin: parentHorizonMin = 30,
  setHorizonMin: parentSetHorizonMin,
  selectedLocation: parentSelectedLocation,
  onLocationSelect: parentOnLocationSelect,
  selectedRegion: parentSelectedRegion = 'Telangana',
  setSelectedRegion: parentSetSelectedRegion
}) {
  // Local state fallbacks
  const [localHorizonMin, setLocalHorizonMin] = useState(parentHorizonMin);
  const [localRegion, setLocalRegion] = useState(parentSelectedRegion);
  const [localLocation, setLocalLocation] = useState(
    parentSelectedLocation || { name: 'Telangana', lat: '18.1124', lon: '79.0193' }
  );
  const [baseMapStyle, setBaseMapStyle] = useState('map');

  const horizonMin = parentSetHorizonMin ? parentHorizonMin : localHorizonMin;
  const setHorizonMin = parentSetHorizonMin || setLocalHorizonMin;

  const selectedRegion = parentSetSelectedRegion ? parentSelectedRegion : localRegion;
  const setSelectedRegion = parentSetSelectedRegion || setLocalRegion;

  const selectedLocation = parentSelectedLocation || localLocation;
  const setSelectedLocation = parentOnLocationSelect || setLocalLocation;

  // Active layers state (Defaulting to 4 core weather layers + boundaries)
  const [localActiveLayers, setLocalActiveLayers] = useState(
    parentActiveLayers || {
      radar: true,
      aiRisk: true,
      lightningRisk: false,
      rainfall: false,
      satellite: false,
      lightning: false,
      cloudTop: false,
      wind: false,
      adminBoundaries: true
    }
  );

  const activeLayers = parentActiveLayers || localActiveLayers;
  const toggleLayer = parentToggleLayer || ((key) => {
    setLocalActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  });

  const [localCell, setLocalCell] = useState(null);
  const selectedCell = parentSelectedCell !== undefined ? parentSelectedCell : localCell;
  const onSelectCell = parentOnSelectCell || setLocalCell;

  // Forecast API state & Race condition prevention counter
  const [fetchedData, setFetchedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const forecastData = parentForecastData || fetchedData;

  // Fetch forecast data when region, location, or horizon changes
  const loadNowcastData = useCallback(async (isManualRefresh = false) => {
    const currentRequestId = ++requestIdRef.current;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await api.getLatestNowcast({
        horizonMin,
        regionName: selectedRegion,
        lat: selectedLocation?.lat,
        lon: selectedLocation?.lon
      });

      // Discard older out-of-order response if a newer request was initiated
      if (currentRequestId === requestIdRef.current) {
        setFetchedData(data);
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.error('[SpatialNowcast] API fetch error:', err);
        setError(err.message || 'Failed to connect to VAJRA backend (127.0.0.1:8008)');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [horizonMin, selectedRegion, selectedLocation]);

  useEffect(() => {
    if (!parentForecastData) {
      loadNowcastData();
    }
  }, [parentForecastData, loadNowcastData]);

  // Check data freshness (> 15 minutes old)
  const checkIsStale = () => {
    const obsTime = forecastData?.timestamp || forecastData?.timestamps?.observation_time;
    if (!obsTime) return false;
    try {
      const obsDt = new Date(obsTime).getTime();
      const now = new Date().getTime();
      return (now - obsDt) / (1000 * 60) > 15;
    } catch (e) {
      return false;
    }
  };

  const isStale = checkIsStale();

  return (
    <div className="space-y-4 font-sans text-[#12324E]">
      
      {/* 1. Header Bar */}
      <SpatialNowcastHeader
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        onRefresh={() => loadNowcastData(true)}
        isRefreshing={isRefreshing}
        forecastData={forecastData}
        isLoading={isLoading}
        error={error}
        isStale={isStale}
      />

      {/* 2. Main Workstation Area: Map (70%) + Control Sidebar (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Main Map Column */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-w-0 min-h-0 space-y-2">
          
          {/* Exact Latitude / Longitude Search Bar */}
          <SpatialCoordinateSearch
            selectedLocation={selectedLocation}
            onLocationSelect={setSelectedLocation}
          />

          {/* Map Container */}
          <div className="relative h-[550px] xl:h-[590px] w-full rounded-xl overflow-hidden border border-[#D0E3F0] shadow-xs bg-[#EEF6FB]">
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-[#F8FCFE]/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center space-y-3 font-mono">
                <RefreshCw className="w-8 h-8 text-[#0284C7] animate-spin" />
                <span className="text-xs font-bold text-[#0F2942] uppercase">
                  FETCHING SPATIAL TENSORS (+{horizonMin}m HORIZON)...
                </span>
              </div>
            )}

            {/* Error Overlay */}
            {error && (
              <div className="absolute top-4 left-4 right-4 z-20 bg-[#FEF2F2] border border-[#FEE2E2] p-3 rounded-lg text-xs font-mono text-[#991B1B] flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>BACKEND CONNECTION ERROR: {error}</span>
                </div>
                <button
                  onClick={() => loadNowcastData(true)}
                  className="px-2.5 py-1 rounded bg-[#DC2626] text-white text-[11px] font-bold hover:bg-[#B91C1C]"
                >
                  Retry
                </button>
              </div>
            )}

            {/* MapLibre WeatherMap Component */}
            <WeatherMap
              forecastData={forecastData}
              selectedCell={selectedCell}
              onSelectCell={onSelectCell}
              activeLayers={activeLayers}
              toggleLayer={toggleLayer}
              horizonMin={horizonMin}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              selectedRegion={selectedRegion}
              baseMapStyle={baseMapStyle}
            />

            {/* Top-Right Map Target Status Badge */}
            <div className="absolute top-4 right-4 z-10 bg-[#F8FCFE]/90 border border-[#D0E3F0] px-3 py-1.5 rounded-lg text-xs font-mono text-[#12324E] shadow-2xs">
              Target: <span className="text-[#0284C7] font-bold">{selectedLocation?.name || selectedRegion}</span> (+{horizonMin}m)
            </div>

          </div>

        </div>

        {/* Right Control Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 min-w-0 flex flex-col min-h-0">
          <SpatialControlSidebar
            horizonMin={horizonMin}
            setHorizonMin={setHorizonMin}
            activeLayers={activeLayers}
            toggleLayer={toggleLayer}
            baseMapStyle={baseMapStyle}
            setBaseMapStyle={setBaseMapStyle}
            forecastData={forecastData}
            isLoading={isLoading}
          />
        </div>

      </div>

      {/* 3. Bottom Analysis Area: Balanced Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        
        {/* Left Column: Layer Legends */}
        <div className="min-w-0 min-h-0">
          <SpatialMapLegend 
            activeLayers={activeLayers}
            channelProvenance={forecastData?.channel_provenance}
          />
        </div>

        {/* Right Column: Location Information */}
        <div className="min-w-0 min-h-0">
          <SpatialLocationInspector
            selectedLocation={selectedLocation}
            forecastData={forecastData}
            horizonMin={horizonMin}
            onResetLocation={() => setSelectedLocation({ name: 'Telangana Target', lat: '18.1124', lon: '79.0193' })}
          />
        </div>

      </div>

    </div>
  );
}
