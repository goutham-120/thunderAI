import React, { useState, useEffect } from 'react';
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

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'spatial', 'cells', 'forecast', 'alerts', 'replay', 'explainability', 'model', 'datasources'
  const [horizonMin, setHorizonMin] = useState(30);
  const [selectedRegion, setSelectedRegion] = useState('Andhra Pradesh & Telangana');
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Hyderabad, Telangana',
    lat: '17.3850',
    lon: '78.4867'
  });

  const [forecastData, setForecastData] = useState(null);
  const [systemStatus, setSystemStatus] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('HYD-PREMONSOON-2024');

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

  // Fetch forecast data
  useEffect(() => {
    const eventParam = activeTab === 'replay' ? selectedEventId : 'LIVE';
    fetch(`${API_BASE}/forecast/latest?horizon_min=${horizonMin}&event_id=${eventParam}`)
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
  }, [horizonMin, activeTab, selectedEventId]);

  // Update location when region changes
  useEffect(() => {
    if (selectedRegion === 'East Coast (Odisha & WB)') {
      setSelectedLocation({ name: 'Bhubaneswar, Odisha', lat: '20.2961', lon: '85.8245' });
    } else if (selectedRegion === 'South Interior Karnataka') {
      setSelectedLocation({ name: 'Bengaluru, Karnataka', lat: '12.9716', lon: '77.5946' });
    } else if (selectedRegion === 'All India Composite') {
      setSelectedLocation({ name: 'National Composite, India', lat: '21.5937', lon: '78.9629' });
    } else {
      setSelectedLocation({ name: 'Hyderabad, Telangana', lat: '17.3850', lon: '78.4867' });
    }
  }, [selectedRegion]);

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
          
          {/* 1. OVERVIEW PAGE */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Map Centerpiece (8 cols) + Right Side Location/XAI Panel (4 cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Center Map (8 cols) */}
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

                {/* Right Panel (4 cols) */}
                <div className="lg:col-span-4 xl:col-span-3 flex flex-col">
                  <RightPanel
                    xaiData={forecastData?.xai_explanation}
                    selectedCell={selectedCell}
                    summaryMetrics={forecastData?.summary_metrics}
                    selectedLocation={selectedLocation}
                  />
                </div>
              </div>

              {/* FORECAST TIMELINE */}
              <ForecastTimelineBar
                horizonMin={horizonMin}
                setHorizonMin={setHorizonMin}
              />

              {/* COMPACT NOWCAST SUMMARY */}
              <NowcastSummaryBar
                forecastData={forecastData}
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
