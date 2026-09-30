import React, { useState, useEffect, useCallback } from 'react';
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
import ReportsValidationPage from './components/ReportsValidationPage';
import DataSourcesView from './components/DataSourcesView';
import StormTrackingPage from './components/StormTrackingPage';
import WhatIfView from './components/WhatIfView';
import DataProvenanceModal from './components/DataProvenanceModal';
import HistoricalReplayBar from './components/HistoricalReplayBar';
import AreaIntelligencePanel from './components/AreaIntelligencePanel';
import ActiveThreatsPanel from './components/ActiveThreatsPanel';
import DashboardStatusFooter from './components/DashboardStatusFooter';
import MultiSourceConsistencyPanel from './components/MultiSourceConsistencyPanel';
import ForecastEvolutionSection from './components/ForecastEvolutionSection';

import { REGION_CONFIGS } from './components/WeatherMapConfig';
import indiaStatesData from './data/india_states.json';
import api from './services/api';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AdminDashboard from './components/admin/AdminDashboard';

export default function App() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('live');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [horizonMin, setHorizonMin] = useState(30);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);
  };

  // Validate activeTab against user role permissions
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const role = user.role;
    const isAllowed = (tab) => {
      // Only the admin tab is restricted exclusively to ADMIN
      if (tab === 'admin') return role === 'ADMIN';
      return true;
    };

    if (!isAllowed(activeTab)) {
      setActiveTab('live');
    }
  }, [user, isAuthenticated, activeTab]);

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
  const [selectedEventId, setSelectedEventId] = useState(
    'HYD-PREMONSOON-2024'
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
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
    setActiveLayers((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  // ---------------------------------------------------------
  // Fetch initial system status, benchmark and replay data
  // ---------------------------------------------------------
  const fetchSystemTelemetry = useCallback(async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (err) {
      console.warn('System status API fallback active:', err);
    }

    try {
      const benchmark = await api.getBenchmarkMetrics();
      setBenchmarkData(benchmark);
    } catch (err) {
      console.warn('Benchmark API fallback active:', err);
    }

    try {
      const replayData = await api.getReplayEvents();

      if (replayData?.events) {
        setHistoricalEvents(replayData.events);
      }
    } catch (err) {
      console.warn('Replay events fallback active:', err);
    }
  }, []);

  useEffect(() => {
    fetchSystemTelemetry();
  }, [fetchSystemTelemetry]);

  // ---------------------------------------------------------
  // Fetch forecast data
  // ---------------------------------------------------------
  const fetchForecastData = useCallback(async () => {
    try {
      const data = await api.getLatestNowcast({
        horizonMin,
        eventId: activeTab === 'replay' ? selectedEventId : 'LIVE',
        regionName: selectedRegion,
        lat: selectedLocation?.lat,
        lon: selectedLocation?.lon
      });

      setForecastData(data);

      if (data?.storm_cells && data.storm_cells.length > 0) {
        if (
          !selectedCell ||
          !data.storm_cells.some(
            (cell) => cell.cell_id === selectedCell.cell_id
          )
        ) {
          setSelectedCell(data.storm_cells[0]);
        }
      }
    } catch (err) {
      console.warn('Forecast API fetch error:', err);
    }
  }, [
    horizonMin,
    selectedRegion,
    selectedLocation,
    selectedCell,
    activeTab,
    selectedEventId
  ]);

  useEffect(() => {
    fetchForecastData();
  }, [fetchForecastData]);

  // ---------------------------------------------------------
  // Manual refresh
  // ---------------------------------------------------------
  const handleManualRefresh = async () => {
    setIsRefreshing(true);

    try {
      await Promise.all([
        fetchSystemTelemetry(),
        fetchForecastData()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ---------------------------------------------------------
  // Update selected location whenever selected region changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (!selectedRegion) return;

    const matchedState = indiaStatesData.features.find(
      (feature) =>
        feature.properties &&
        feature.properties.state_name === selectedRegion
    );

    if (matchedState) {
      const { state_name, bounds, center } = matchedState.properties;

      const centerLat = center
        ? center[1]
        : (bounds[0] + bounds[2]) / 2;

      const centerLon = center
        ? center[0]
        : (bounds[1] + bounds[3]) / 2;

      const location = {
        name: state_name,
        lat: centerLat.toFixed(4),
        lon: centerLon.toFixed(4),
        bounds
      };

      setSelectedLocation(location);

      // Fetch area intelligence for selected state
      if (bounds) {
        api
          .getAreaNowcast({
            minLat: bounds[0],
            maxLat: bounds[2],
            minLon: bounds[1],
            maxLon: bounds[3],
            horizonMin
          })
          .then((data) => {
            if (data?.selected_area) {
              data.selected_area.description =
                `${state_name} Administrative Region`;
            }

            setAreaData(data);
          })
          .catch((err) =>
            console.warn('Area forecast fetch error:', err)
          );
      }
    } else if (REGION_CONFIGS[selectedRegion]) {
      const cfg = REGION_CONFIGS[selectedRegion];

      const loc =
        cfg.mainLocation || {
          name: selectedRegion,
          lat: String(cfg.center[1]),
          lon: String(cfg.center[0])
        };

      const bounds = cfg.bounds;

      const location = {
        ...loc,
        bounds: bounds
          ? [
              bounds.minLat,
              bounds.minLon,
              bounds.maxLat,
              bounds.maxLon
            ]
          : null
      };

      setSelectedLocation(location);

      // Fetch area intelligence for radar composite
      if (bounds) {
        api
          .getAreaNowcast({
            minLat: bounds.minLat,
            maxLat: bounds.maxLat,
            minLon: bounds.minLon,
            maxLon: bounds.maxLon,
            horizonMin
          })
          .then((data) => {
            if (data?.selected_area) {
              data.selected_area.description =
                `${selectedRegion} Radar Composite`;
            }

            setAreaData(data);
          })
          .catch((err) =>
            console.warn('Area forecast fetch error:', err)
          );
      } else {
        setAreaData(null);
      }
    }
  }, [selectedRegion, horizonMin]);

  // ---------------------------------------------------------
  // Synchronize Area Intelligence when location/horizon changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (!selectedLocation?.lat || !selectedLocation?.lon) {
      return;
    }

    const loadAreaIntelligence = async () => {
      try {
        let data;

        if (
          selectedLocation.bounds &&
          Array.isArray(selectedLocation.bounds) &&
          selectedLocation.bounds.length === 4
        ) {
          const bounds = selectedLocation.bounds;

          data = await api.getAreaNowcast({
            minLat: bounds[0],
            minLon: bounds[1],
            maxLat: bounds[2],
            maxLon: bounds[3],
            horizonMin
          });
        } else {
          data = await api.getAreaNowcast({
            lat: Number(selectedLocation.lat),
            lon: Number(selectedLocation.lon),
            horizonMin
          });
        }

        if (data?.selected_area) {
          data.selected_area.description =
            selectedLocation.name || 'Selected Target';
        }

        setAreaData(data);
      } catch (err) {
        console.warn('Area forecast fetch error:', err);
      }
    };

    loadAreaIntelligence();
  }, [selectedLocation, horizonMin]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1929] flex flex-col items-center justify-center font-mono text-white p-4">
        <div className="w-10 h-10 border-4 border-[#0284C7]/30 border-t-[#38BDF8] rounded-full animate-spin mb-4" />
        <div className="text-sm font-bold tracking-wider">INITIALIZING VAJRA-AI PLATFORM...</div>
        <div className="text-xs text-[#64748B] mt-1 font-sans">Verifying Accredited Operational Credentials</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'register' ? (
      <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
    ) : (
      <LoginPage onNavigateToRegister={() => setAuthView('register')} />
    );
  }

  return (
    <div className="min-h-screen bg-atmospheric flex flex-col text-[#12324E] font-sans selection:bg-[#38BDF8] selection:text-[#12324E]">

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        systemStatus={systemStatus}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        selectedLocation={selectedLocation}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onToggleSidebar={handleToggleSidebar}
        isCollapsed={isCollapsed}
      />

      {/* Historical Replay Bar */}
      {activeTab === 'replay' && (
        <HistoricalReplayBar
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          historicalEvents={historicalEvents}
        />
      )}

      {/* Main Workstation Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Navigation Sidebar */}
        <LeftSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 overflow-y-auto max-w-[1600px] mx-auto w-full">

          {/* 0. ADMIN SECURITY & USER MANAGEMENT (ADMIN ROLE ONLY) */}
          {activeTab === 'admin' && user?.role === 'ADMIN' && (
            <AdminDashboard />
          )}

          {/* 1. DASHBOARD PAGE */}
          {activeTab === 'live' && (
            <div className="space-y-4">

              <div className="flex items-center justify-between bg-[#F8FCFE] border border-[#D0E3F0] px-4 py-3 rounded-xl shadow-xs">

                <div className="flex items-center space-x-2.5">

                  <div className="p-2 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>

                  <div>
                    <h1 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight uppercase flex items-center gap-2">
                      Main Operational Overview

                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#0284C7] text-white font-sans font-semibold">
                        LIVE GIS NOWCAST
                      </span>
                    </h1>

                    <p className="text-xs text-[#47637E] font-sans">
                      Unified Meteorological GIS Map & Real-Time
                      Intelligence Workstation
                    </p>
                  </div>

                </div>

                <div className="hidden sm:flex items-center space-x-3 text-xs font-mono">
                  <span className="text-[#47637E]">
                    Target Region:
                  </span>

                  <span className="px-2.5 py-1 rounded-md bg-[#EEF6FB] text-[#0284C7] font-bold border border-[#D0E3F0]">
                    {selectedLocation?.name || selectedRegion}
                  </span>
                </div>

              </div>

              {/* GIS Map + Decision Support Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-h-[520px]">
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

              {/* Current Atmospheric Conditions */}
              <NowcastSummaryBar
                forecastData={forecastData}
                selectedLocation={selectedLocation}
              />

              {/* Forecast Evolution */}
              <ForecastEvolutionSection
                forecastData={forecastData}
                areaData={areaData}
                horizonMin={horizonMin}
                setHorizonMin={setHorizonMin}
                selectedLocation={selectedLocation}
                selectedRegion={selectedRegion}
              />

              {/* Multi-Source Consistency */}
              <MultiSourceConsistencyPanel
                consistencyData={
                  forecastData?.multi_source_consistency
                }
                selectedLocation={selectedLocation}
                selectedCell={selectedCell}
                onFocusTarget={() => {
                  if (selectedCell) {
                    setSelectedCell({ ...selectedCell });
                  } else if (
                    forecastData?.storm_cells &&
                    forecastData.storm_cells.length > 0
                  ) {
                    setSelectedCell(
                      forecastData.storm_cells[0]
                    );
                  }
                }}
              />

              {/* Active Threats */}
              <ActiveThreatsPanel
                forecastData={forecastData}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
                onNavigateTab={setActiveTab}
              />

              {/* Forecast Lead Time */}
              <ForecastTimelineBar
                horizonMin={horizonMin}
                setHorizonMin={setHorizonMin}
              />

              {/* Status Footer */}
              <DashboardStatusFooter
                systemStatus={systemStatus}
                forecastData={forecastData}
                onOpenProvenance={() =>
                  setIsProvenanceOpen(true)
                }
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

          {/* 3b. STORM TRACKING PAGE — feature/storm-tracking */}
          {activeTab === 'storm-tracking' && (
            <StormTrackingPage />
          )}

          {/* 4. CAP ALERTS PAGE */}
          {activeTab === 'alerts' && (
            <AlertsView
              alerts={forecastData?.cap_alerts}
              selectedLocation={selectedLocation}
              selectedRegion={selectedRegion}
            />
          )}

          {/* 5. HISTORICAL REPLAY PAGE */}
          {activeTab === 'replay' && (
            <ReplayView
              historicalEvents={historicalEvents}
              selectedEventId={selectedEventId}
              setSelectedEventId={setSelectedEventId}
            />
          )}

          {/* 6. FORECAST MATRIX PAGE */}
          {activeTab === 'forecast' && (
            <ForecastView
              forecastData={forecastData}
              horizonMin={horizonMin}
              setHorizonMin={setHorizonMin}
              selectedRegion={selectedRegion}
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

          {/* 9. REPORTS & VALIDATION PAGE */}
          {activeTab === 'reports' && (
            <ReportsValidationPage />
          )}

          {/* 10. DATA SOURCES PAGE */}
          {activeTab === 'datasources' && (
            <DataSourcesView
              systemStatus={systemStatus}
              onRefreshStatus={fetchSystemTelemetry}
            />
          )}

          {/* 10. WHAT-IF SCENARIO PAGE */}
          {activeTab === 'whatif' && (
            <WhatIfView />
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