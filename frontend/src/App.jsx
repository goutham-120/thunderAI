import React, { useState, useEffect } from 'react';
import { LayoutDashboard } from 'lucide-react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import WeatherMap from './components/WeatherMap';
import RightPanel from './components/RightPanel';
import ForecastTimelineBar from './components/ForecastTimelineBar';
import NowcastSummaryBar from './components/NowcastSummaryBar';
import SpatialNowcastView from './components/SpatialNowcastView';
import StormCellsView from './components/StormCellsView';
import ForecastView from './components/ForecastView';
import AlertsView from './components/AlertsView';
import ReplayView from './components/ReplayView';
import ExplainabilityView from './components/ExplainabilityView';
import ModelView from './components/ModelView';
import DataSourcesView from './components/DataSourcesView';
import DataProvenanceModal from './components/DataProvenanceModal';
import HistoricalReplayBar from './components/HistoricalReplayBar';
import AreaIntelligencePanel from './components/AreaIntelligencePanel';
import ActiveThreatsPanel from './components/ActiveThreatsPanel';
import DashboardStatusFooter from './components/DashboardStatusFooter';

import { REGION_CONFIGS } from './components/WeatherMapConfig';
import indiaStatesData from './data/india_states.json';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'spatial', 'cells', 'forecast', 'alerts', 'replay', 'explainability', 'model', 'datasources'
  const [horizonMin, setHorizonMin] = useState(30);
  const [selectedRegion, setSelectedRegion] = useState('Telangana');
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Telangana',
    lat: '18.1124',
    lon: '79.0193'
  });

  const [forecastData, setForecastData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('HYD-PREMONSOON-2024');

  const [areaData, setAreaData] = useState(null);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  const [activeLayers, setActiveLayers] = useState({
    radar: true,
    satellite: true,
    lightning: true,
    aiRisk: true,
    lightningRisk: false,
    rainfall: false,
    wind: false,
    cloudTop: false,
    cape: false,
    adminBoundaries: true
  });

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Fetch initial system status & benchmarks
  useEffect(() => {
    fetch(`${API_BASE}/system/status`)
      .then(res => res.json())
      .then(data => setSystemStatus(data))
      .catch(err => console.warn('System status fetch fallback active', err));

    fetch(`${API_BASE}/replay/events`)
      .then(res => res.json())
      .then(data => {
        if (data.events) setHistoricalEvents(data.events);
      })
      .catch(err => console.warn('Replay events fallback active'));

    fetch(`${API_BASE}/metrics/benchmark`)
      .then(res => res.json())
      .then(data => setBenchmarkData(data))
      .catch(err => console.warn('Benchmark data fallback active'));
  }, []);

  // Fetch forecast data synchronized with selected region and location
  useEffect(() => {
    const eventParam = activeTab === 'replay' ? selectedEventId : 'LIVE';
    const regionParam = encodeURIComponent(selectedRegion || '');
    const latParam = selectedLocation?.lat || '';
    const lonParam = selectedLocation?.lon || '';

    fetch(`${API_BASE}/forecast/latest?horizon_min=${horizonMin}&event_id=${eventParam}&region_name=${regionParam}&lat=${latParam}&lon=${lonParam}`)
      .then(res => res.json())
      .then(data => {
        setForecastData(data);
        if (data.storm_cells && data.storm_cells.length > 0) {
          if (!selectedCell || !data.storm_cells.some(c => c.cell_id === selectedCell.cell_id)) {
            setSelectedCell(data.storm_cells[0]);
          }
        }
      })
      .catch(err => console.warn('API error, relying on local synthesis', err));
  }, [horizonMin, activeTab, selectedEventId, selectedRegion, selectedLocation]);

  // Update selected location & Area Intelligence whenever selectedRegion changes
  useEffect(() => {
    if (!selectedRegion) return;

    // 1. Check if selectedRegion matches a State or UT in indiaStatesData
    const matchedState = indiaStatesData.features.find(
      f => f.properties && f.properties.state_name === selectedRegion
    );

    if (matchedState) {
      const { state_name, bounds, center } = matchedState.properties; // bounds = [minLat, minLon, maxLat, maxLon]
      const centerLat = center ? center[1] : (bounds[0] + bounds[2]) / 2;
      const centerLon = center ? center[0] : (bounds[1] + bounds[3]) / 2;

      setSelectedLocation({
        name: state_name,
        lat: centerLat.toFixed(4),
        lon: centerLon.toFixed(4)
      });

      // Fetch Area Threat Assessment nowcast for the selected State/UT
      fetch(`${API_BASE}/forecast/area?min_lat=${bounds[0]}&max_lat=${bounds[2]}&min_lon=${bounds[1]}&max_lon=${bounds[3]}&horizon_min=${horizonMin}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.selected_area) {
            data.selected_area.description = `${state_name} Administrative Region`;
          }
          setAreaData(data);
        })
        .catch(err => console.warn('Area forecast fetch error', err));
    } else if (REGION_CONFIGS[selectedRegion]) {
      const cfg = REGION_CONFIGS[selectedRegion];
      const loc = cfg.mainLocation || { name: selectedRegion, lat: String(cfg.center[1]), lon: String(cfg.center[0]) };
      setSelectedLocation(loc);

      const b = cfg.bounds;
      if (b) {
        fetch(`${API_BASE}/forecast/area?min_lat=${b.minLat}&max_lat=${b.maxLat}&min_lon=${b.minLon}&max_lon=${b.maxLon}&horizon_min=${horizonMin}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.selected_area) {
              data.selected_area.description = `${selectedRegion} Radar Composite`;
            }
            setAreaData(data);
          })
          .catch(err => console.warn('Area forecast fetch error', err));
      } else {
        setAreaData(null);
      }
    }
  }, [selectedRegion, horizonMin]);

  return (
    <div className="min-h-screen bg-atmospheric flex flex-col text-[#0F2942] font-sans selection:bg-[#0284C7] selection:text-white">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        systemStatus={systemStatus}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedLocation={selectedLocation}
      />

      {/* Top Emergency Convective Threat Banner */}
      {(() => {
        const topCell = selectedCell || (forecastData?.storm_cells && forecastData.storm_cells[0]);
        const topAlert = forecastData?.cap_alerts && forecastData.cap_alerts[0];
        const hasThreat = topCell || topAlert;

        return (
          <div className={`px-5 py-2.5 flex items-center justify-between text-xs font-mono border-b border-t transition-colors ${
            hasThreat ? 'bg-[#FEF2F2] border-[#FEE2E2] text-[#991B1B]' : 'bg-[#F0FDF4] border-[#DCFCE7] text-[#166534]'
          }`}>
            <div className="flex items-center space-x-3 overflow-x-auto">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-sans shrink-0 ${
                hasThreat ? 'bg-[#DC2626] text-white' : 'bg-[#16A34A] text-white'
              }`}>
                {hasThreat ? '⚡ CONVECTIVE THREAT WARNING' : '✓ NORMAL ATMOSPHERIC STATUS'}
              </span>

              {hasThreat ? (
                <div className="flex items-center space-x-4 font-sans text-xs">
                  <span><strong className="font-mono text-[#0F2942]">Location:</strong> {selectedLocation?.name || 'Hyderabad, Telangana'}</span>
                  <span><strong className="font-mono text-[#0F2942]">Storm ID:</strong> {topCell?.cell_id || 'CELL-A'}</span>
                  <span><strong className="font-mono text-[#0F2942]">Movement:</strong> {topCell?.movement ? `${topCell.movement.direction_compass} @ ${topCell.movement.speed_kmh} km/h` : 'SE @ 24 km/h'}</span>
                  <span><strong className="font-mono text-[#0F2942]">Lifecycle:</strong> <span className="font-bold text-[#DC2626]">{topCell?.lifecycle_state || 'RAPIDLY INTENSIFYING'}</span></span>
                </div>
              ) : (
                <span className="font-sans text-xs">NO ACTIVE CONVECTIVE WARNING — All regional atmospheric sectors operating within safe baseline thresholds.</span>
              )}
            </div>

            <div className="hidden lg:flex items-center space-x-2 text-[10px] text-[#47637E] font-mono shrink-0 ml-2">
              <span>Updated: {forecastData?.timestamp ? new Date(forecastData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
        );
      })()}

      {/* Historical Replay Banner if activeTab === 'replay' */}
      {activeTab === 'replay' && (
        <HistoricalReplayBar
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          historicalEvents={historicalEvents}
        />
      )}

      {/* Main Workstation Stage */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Permanent Left Sidebar (PAGES ONLY) */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Dynamic Main View Container */}
        <main className="flex-1 p-4 overflow-y-auto max-w-[1600px] mx-auto w-full">
          
          {/* 1. MAIN OPERATIONAL DASHBOARD */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Dashboard Title & Quick Summary Bar */}
              <div className="flex items-center justify-between bg-[#F8FCFE] border border-[#D0E3F0] px-4 py-3 rounded-xl shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight uppercase flex items-center gap-2">
                      Main Operational Dashboard
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-sans font-semibold">
                        LIVE NOWCAST
                      </span>
                    </h1>
                    <p className="text-xs text-[#47637E] font-sans">
                      Spatial Overview & Unified Atmospheric Intelligence Workstation
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
                  <span className="text-[#47637E]">Active Target:</span>
                  <span className="px-2.5 py-1 rounded-md bg-[#EEF6FB] text-[#0284C7] font-bold border border-[#D0E3F0]">
                    {selectedLocation?.name || selectedRegion}
                  </span>
                </div>
              </div>

              {/* Spatial Overview Centerpiece (8-9 cols) + Operational Decision Support Panel (3-4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Spatial Overview Map (8-9 cols) */}
                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[500px]">
                  <WeatherMap
                    forecastData={forecastData}
                    selectedCell={selectedCell}
                    onSelectCell={setSelectedCell}
                    activeLayers={activeLayers}
                    toggleLayer={toggleLayer}
                    horizonMin={horizonMin}
                    selectedLocation={selectedLocation}
                    onLocationSelect={setSelectedLocation}
                    selectedRegion={selectedRegion}
                  />
                </div>

                {/* Part 6: Operational Decision Information (3-4 cols) */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col space-y-3">
                  {areaData ? (
                    <AreaIntelligencePanel
                      areaData={areaData}
                      onClose={() => setAreaData(null)}
                      horizonMin={horizonMin}
                      setHorizonMin={setHorizonMin}
                    />
                  ) : (
                    <RightPanel
                      xaiData={forecastData?.xai_explanation}
                      selectedCell={selectedCell}
                      summaryMetrics={forecastData?.summary_metrics}
                      selectedLocation={selectedLocation}
                    />
                  )}
                </div>
              </div>

              {/* Part 3: Current Atmospheric Conditions */}
              <NowcastSummaryBar
                forecastData={forecastData}
              />

              {/* Part 4: Active Threat Areas & Alerts */}
              <ActiveThreatsPanel
                forecastData={forecastData}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
                onNavigateTab={setActiveTab}
              />

              {/* Part 5: Forecast Outlook */}
              <ForecastTimelineBar
                horizonMin={horizonMin}
                setHorizonMin={setHorizonMin}
              />

              {/* Part 7: Data Sources & Model Status Bar */}
              <DashboardStatusFooter
                systemStatus={systemStatus}
                forecastData={forecastData}
                onOpenProvenance={() => setIsProvenanceOpen(true)}
              />
            </div>
          )}

          {/* 2. SPATIAL NOWCAST PAGE */}
          {activeTab === 'spatial' && (
            <SpatialNowcastView
              forecastData={forecastData}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
              activeLayers={activeLayers}
              toggleLayer={toggleLayer}
              horizonMin={horizonMin}
              setHorizonMin={setHorizonMin}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
            />
          )}

          {/* 3. STORM CELLS PAGE */}
          {activeTab === 'cells' && (
            <StormCellsView
              forecastData={forecastData}
              selectedCell={selectedCell}
              onSelectCell={setSelectedCell}
            />
          )}

          {/* 4. FORECAST PAGE */}
          {activeTab === 'forecast' && (
            <ForecastView
              forecastData={forecastData}
              horizonMin={horizonMin}
              setHorizonMin={setHorizonMin}
            />
          )}

          {/* 5. ALERTS PAGE */}
          {activeTab === 'alerts' && (
            <AlertsView
              alerts={forecastData?.cap_alerts}
            />
          )}

          {/* 6. HISTORICAL REPLAY PAGE */}
          {activeTab === 'replay' && (
            <ReplayView
              historicalEvents={historicalEvents}
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
            />
          )}

          {/* 7. EXPLAINABILITY PAGE */}
          {activeTab === 'explainability' && (
            <ExplainabilityView
              xaiData={forecastData?.xai_explanation}
            />
          )}

          {/* 8. MODEL PERFORMANCE PAGE */}
          {activeTab === 'model' && (
            <ModelView
              systemStatus={systemStatus}
              benchmarkData={benchmarkData}
            />
          )}

          {/* 9. DATA SOURCES PAGE */}
          {activeTab === 'datasources' && (
            <DataSourcesView
              systemStatus={systemStatus}
            />
          )}

        </main>
      </div>

      {/* Data Provenance Modal */}
      <DataProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
        systemStatus={systemStatus}
      />
    </div>
  );
}
