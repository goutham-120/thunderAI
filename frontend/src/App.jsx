import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import WeatherMap from './components/WeatherMap';
import RightPanel from './components/RightPanel';
import BottomDashboard from './components/BottomDashboard';
import AlertsModal from './components/AlertsModal';
import BenchmarkModal from './components/BenchmarkModal';
import HistoricalReplayBar from './components/HistoricalReplayBar';

const API_BASE = 'http://localhost:8000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('live'); // 'live', 'forecast', 'tracks', 'replay', 'analytics', 'alerts'
  const [horizonMin, setHorizonMin] = useState(30);
  const [selectedRegion, setSelectedRegion] = useState('Andhra Pradesh & Telangana');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Hyderabad, Telangana',
    lat: '17.3850',
    lon: '78.4867'
  });

  const [forecastData, setForecastData] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [historicalEvents, setHistoricalEvents] = useState([]);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('HYD-PREMONSOON-2024');

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

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
    adminBoundaries: true,
    stormVectors: true
  });

  const toggleLayer = (layerKey) => {
    setActiveLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Fetch initial metadata
  useEffect(() => {
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

  const activeAlerts = forecastData?.cap_alerts || [];

  return (
    <div className="min-h-screen bg-[#070B14] flex flex-col text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Main Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlertCount={activeAlerts.length || 3}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
      />

      {/* Historical Replay Banner if in Replay view */}
      {activeTab === 'replay' && (
        <HistoricalReplayBar
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          historicalEvents={historicalEvents}
          replayTimestamp="15:40"
          setReplayTimestamp={() => {}}
        />
      )}

      {/* Main Command Center Stage */}
      <main className="flex-1 p-3.5 max-w-[1600px] mx-auto w-full flex flex-col space-y-4">
        
        {/* TOP SECTION: Left Sidebar (Layers) + Center Map + Right Panel (Location & XAI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Left Column: Layers & Horizon (2.5 cols) */}
          <div className="lg:col-span-3 xl:col-span-2 flex flex-col">
            <LeftSidebar
              activeLayers={activeLayers}
              toggleLayer={toggleLayer}
              horizonMin={horizonMin}
              setHorizonMin={setHorizonMin}
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Center Column: Photorealistic Satellite + Radar Convective Map (6.5 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col min-h-[520px]">
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

          {/* Right Column: Selected Location, Dual Risk & AI Explanation (3 cols) */}
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col">
            <RightPanel
              xaiData={forecastData?.xai_explanation}
              selectedCell={selectedCell}
              summaryMetrics={forecastData?.summary_metrics}
              selectedLocation={selectedLocation}
            />
          </div>
        </div>

        {/* BOTTOM SECTION: Forecast Timeline + Probability Chart + Atmospheric Conditions + Storm Cells Table + Alerts */}
        <BottomDashboard
          forecastData={forecastData}
          horizonMin={horizonMin}
          setHorizonMin={setHorizonMin}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        />
      </main>

      {/* Modals & Overlays */}
      <AlertsModal
        isOpen={isAlertsOpen || activeTab === 'alerts'}
        onClose={() => {
          setIsAlertsOpen(false);
          if (activeTab === 'alerts') setActiveTab('live');
        }}
        alerts={activeAlerts}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen || activeTab === 'analytics'}
        onClose={() => {
          setIsBenchmarkOpen(false);
          if (activeTab === 'analytics') setActiveTab('live');
        }}
        benchmarkData={benchmarkData}
      />
    </div>
  );
}
