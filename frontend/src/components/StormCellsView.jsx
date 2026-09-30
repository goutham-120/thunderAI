import React, { useState } from 'react';
import { 
  CloudLightning, 
  Navigation, 
  MapPin, 
  Activity, 
  Compass, 
  ShieldAlert, 
  Layers, 
  Radio, 
  Satellite, 
  Zap, 
  Clock, 
  ArrowUpRight, 
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import StormTrackingMap from './StormTrackingMap';

export default function StormCellsView({ 
  forecastData, 
  selectedCell, 
  onSelectCell,
  activeLayers: parentActiveLayers,
  toggleLayer: parentToggleLayer,
  horizonMin = 30,
  setHorizonMin,
  selectedLocation,
  onLocationSelect,
  selectedRegion = 'Telangana',
  setSelectedRegion
}) {
  const cells = forecastData?.storm_cells || [];
  const dataMode = (forecastData?.data_mode || 'SYNTHETIC').toUpperCase();
  const timestamp = forecastData?.timestamp || new Date().toISOString();

  // Local active layers state fallback
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

  // Active cell selection
  const activeCell = selectedCell || (cells.length > 0 ? cells[0] : null);

  const getSeverityBadgeClass = (severity) => {
    switch (String(severity).toUpperCase()) {
      case 'EXTREME':
        return 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]';
      case 'SEVERE':
        return 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]';
      case 'MODERATE':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      default:
        return 'bg-[#EEF6FB] text-[#0284C7] border-[#D0E3F0]';
    }
  };

  const getDataModeBadge = () => {
    if (dataMode === 'REAL') {
      return { label: 'REAL SENSOR TELEMETRY', classes: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]' };
    } else if (dataMode === 'ARCHIVE') {
      return { label: 'HISTORICAL REPLAY DATASET', classes: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' };
    } else if (dataMode === 'SYNTHETIC_FALLBACK' || dataMode === 'SYNTHETIC') {
      return { label: 'SYNTHETIC FALLBACK MODE', classes: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]' };
    } else {
      return { label: 'FEED DISCONNECTED / UNAVAILABLE', classes: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]' };
    }
  };

  const radarStatus = forecastData?.radar_status || (dataMode === 'REAL' ? 'OUT_OF_COVERAGE' : 'SYNTHETIC');
  const peakDbz = forecastData?.summary_metrics?.peak_radar_dbz ?? 0.0;
  const radarProv = forecastData?.channel_provenance?.radar_dbz || '';

  const getEmptyStateDetails = () => {
    if (dataMode === 'SYNTHETIC' || radarStatus === 'SYNTHETIC') {
      return {
        title: 'SYNTHETIC DEMO MODE ACTIVE',
        message: 'Displaying simulated convective cell patterns for system evaluation and testing.',
        badgeBg: 'bg-[#FFFBEB]/95 border-[#FDE68A] text-[#B45309]'
      };
    } else if (radarStatus === 'OUT_OF_COVERAGE' || radarProv.includes('OUT_OF_COVERAGE') || radarProv.includes('outside')) {
      return {
        title: 'RADAR DATA SOURCE OUTSIDE REQUESTED REGION',
        message: 'The available Doppler radar source (Cherrapunji DWR at 25.27°N, 91.73°E) is outside the selected regional sector (Telangana/AP at 17.5°N, 80.5°E). Convective storm detections cannot be determined from this radar dataset.',
        badgeBg: 'bg-[#FEF2F2]/95 border-[#FEE2E2] text-[#991B1B]'
      };
    } else if (radarStatus === 'UNAVAILABLE' || radarProv.includes('UNAVAILABLE')) {
      return {
        title: 'REGIONAL RADAR TELEMETRY UNAVAILABLE',
        message: 'Live regional Doppler Weather Radar feed is currently unconfigured or unavailable. Convective storm cells cannot be detected without valid regional radar telemetry.',
        badgeBg: 'bg-[#FEF2F2]/95 border-[#FEE2E2] text-[#991B1B]'
      };
    } else {
      return {
        title: 'NO CONVECTIVE STORM CELLS DETECTED',
        message: `Valid regional radar observations show peak reflectivity of ${peakDbz.toFixed(1)} dBZ. No convective cores exceed the 35.0 dBZ detection threshold.`,
        badgeBg: 'bg-[#EEF6FB]/95 border-[#D0E3F0] text-[#0284C7]'
      };
    }
  };

  const modeBadge = getDataModeBadge();

  return (
    <div className="space-y-4 font-sans text-[#12324E]">
      
      {/* 1. Header & Telemetry Bar */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex flex-wrap items-center justify-between shadow-xs gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] text-[#DC2626] shrink-0">
            <CloudLightning className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight uppercase">
                METEOROLOGICAL CONVECTIVE STORM CELL TRACKING WORKSTATION
              </h1>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${modeBadge.classes}`}>
                {modeBadge.label}
              </span>
            </div>
            <p className="text-xs text-[#47637E] font-sans mt-0.5">
              Regional Framing [80.5°E, 17.5°N] • TITAN/SCIT Segmented Clusters, Velocity Vectors, and Trajectory Cones
            </p>
          </div>
        </div>

        {/* Telemetry Quick Badges */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="bg-[#EEF6FB] border border-[#D0E3F0] px-3 py-1.5 rounded-lg text-center">
            <span className="text-[10px] text-[#47637E] block uppercase font-sans font-bold">Tracked Clusters</span>
            <span className="text-sm font-bold text-[#0284C7]">{cells.length} Active</span>
          </div>

          <div className="bg-[#EEF6FB] border border-[#D0E3F0] px-3 py-1.5 rounded-lg text-center">
            <span className="text-[10px] text-[#47637E] block uppercase font-sans font-bold">Observation Time</span>
            <span className="text-sm font-bold text-[#0F2942]">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Split Workstation (Map + Inspection Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Geographic Tracking Map Container (8 Cols on LG) */}
        <div className="lg:col-span-8 flex flex-col space-y-2">
          
          <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl overflow-hidden shadow-xs relative flex flex-col h-[540px]">
            
            {/* Map Component */}
            <div className="flex-1 relative">
              <StormTrackingMap
                forecastData={forecastData}
                selectedCell={activeCell}
                onSelectCell={onSelectCell}
                activeLayers={activeLayers}
                toggleLayer={toggleLayer}
                horizonMin={horizonMin}
              />

              {/* Empty state notice overlay if 0 cells detected */}
              {cells.length === 0 && (() => {
                const details = getEmptyStateDetails();
                return (
                  <div className={`absolute inset-x-4 top-16 z-10 border p-3 rounded-lg text-center space-y-1 shadow-md ${details.badgeBg}`}>
                    <div className="flex items-center justify-center space-x-1.5 font-mono font-bold text-xs uppercase">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{details.title}</span>
                    </div>
                    <p className="text-[11px] font-sans">
                      {details.message}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Radar Reflectivity Intensity Legend Bar */}
            <div className="bg-[#0F172A] border-t border-[#334155] p-2.5 px-4 flex flex-wrap items-center justify-between text-xs font-mono gap-2 shrink-0 text-[#F8FAFC]">
              <span className="font-bold text-[#94A3B8] font-sans text-[11px] uppercase">
                Radar Reflectivity dBZ Intensity Scale:
              </span>

              <div className="flex items-center space-x-1 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#06B6D4] text-white font-bold">&lt;20 Light</span>
                <span className="px-2 py-0.5 rounded bg-[#22C55E] text-white font-bold">20-35 Moderate</span>
                <span className="px-2 py-0.5 rounded bg-[#EAB308] text-[#0F2942] font-bold">35-45 Heavy</span>
                <span className="px-2 py-0.5 rounded bg-[#EF4444] text-white font-bold">45-55 Severe</span>
                <span className="px-2 py-0.5 rounded bg-[#D946EF] text-white font-bold">&gt;55 Extreme Core</span>
              </div>
            </div>

          </div>
        </div>

        {/* Storm Cell Inspection Panel (4 Cols on LG) */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          
          <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3.5 font-sans h-full flex flex-col justify-between">
            
            {activeCell ? (
              <div className="space-y-3.5">
                
                {/* Inspection Header */}
                <div className="border-b border-[#D0E3F0] pb-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#0284C7] text-white uppercase">
                        {activeCell.cell_id}
                      </span>
                      <h2 className="text-xs font-bold text-[#0F2942] font-mono uppercase">
                        {activeCell.name || `Storm Cluster ${activeCell.cell_id}`}
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#47637E] font-sans mt-0.5">
                      Centroid: {activeCell.center?.lat?.toFixed(4)}° N, {activeCell.center?.lon?.toFixed(4)}° E
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getSeverityBadgeClass(activeCell.severity)}`}>
                    {activeCell.severity || 'SEVERE'}
                  </span>
                </div>

                {/* Core Reflectivity & Structure Card */}
                <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 text-xs shadow-2xs">
                  <div className="text-[10px] font-bold text-[#47637E] uppercase font-mono flex items-center justify-between">
                    <span>CONVECTIVE CORE INTENSITY</span>
                    <span className="text-[#0284C7]">Area: {activeCell.area_km2 || 48} km²</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                    <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-2 rounded-md">
                      <span className="text-[9px] text-[#991B1B] font-sans block font-semibold uppercase">MAX REFLECTIVITY</span>
                      <span className="text-lg font-bold text-[#DC2626]">
                        {activeCell.max_dbz ? activeCell.max_dbz.toFixed(1) : '54.0'} dBZ
                      </span>
                    </div>

                    <div className="bg-[#EEF6FB] border border-[#D0E3F0] p-2 rounded-md">
                      <span className="text-[9px] text-[#47637E] font-sans block font-semibold uppercase">MEAN CORE DBZ</span>
                      <span className="text-lg font-bold text-[#0284C7]">
                        {activeCell.avg_dbz ? activeCell.avg_dbz.toFixed(1) : '42.5'} dBZ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Kinematics & Velocity Vector Card */}
                <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 text-xs shadow-2xs font-mono">
                  <div className="text-[10px] font-bold text-[#47637E] uppercase font-sans flex items-center justify-between border-b border-[#D0E3F0] pb-1">
                    <span>CELL MOTION & KINEMATICS</span>
                    <span className="text-[#047857]">TITAN Vector</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <Navigation 
                        className="w-4 h-4 text-[#0284C7] shrink-0 transform" 
                        style={{ transform: `rotate(${activeCell.movement?.heading_deg || 135}deg)` }} 
                      />
                      <div>
                        <span className="text-[10px] text-[#47637E] font-sans block">HEADING</span>
                        <span className="font-bold text-[#0F2942]">
                          {activeCell.movement?.heading_deg || 135}° ({activeCell.movement?.direction_compass || 'SE'})
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[#47637E] font-sans block">SPEED</span>
                      <span className="font-bold text-[#0F2942]">
                        {activeCell.movement?.speed_kmh || 28} km/h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Convective Activity & Lightning Telemetry */}
                <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-2 text-xs shadow-2xs">
                  <div className="text-[10px] font-bold text-[#47637E] uppercase font-mono flex items-center justify-between">
                    <span>LIGHTNING & CLOUD-TOP CANOPY</span>
                    {activeCell.is_lightning_jump && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] font-mono animate-pulse">
                        ⚡ LIGHTNING JUMP
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="bg-[#EEF6FB] p-2 rounded border border-[#D0E3F0]">
                      <span className="text-[9px] text-[#47637E] font-sans block uppercase font-bold">Observed Flash Rate</span>
                      <span className="text-sm font-bold text-[#D97706]">
                        {activeCell.lightning_flash_rate_min || 38.0} /min
                      </span>
                    </div>

                    <div className="bg-[#EEF6FB] p-2 rounded border border-[#D0E3F0]">
                      <span className="text-[9px] text-[#47637E] font-sans block uppercase font-bold">Cloud Top Temp</span>
                      <span className="text-sm font-bold text-[#0284C7]">
                        {activeCell.min_cloud_top_c ? `${activeCell.min_cloud_top_c}°C` : '-58.2°C'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lifecycle State Classification */}
                <div className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] font-bold text-[#47637E] uppercase font-mono block">LIFECYCLE CLASSIFICATION</span>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F2942] font-mono">
                      {activeCell.lifecycle_state || 'RAPIDLY INTENSIFYING'}
                    </span>
                    <span className="text-[10px] text-[#47637E]">
                      CAPE: {activeCell.mean_cape_jkg || 2450} J/kg
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 text-center space-y-2 text-[#47637E]">
                <Info className="w-8 h-8 text-[#0284C7] mx-auto" />
                <div className="text-xs font-bold font-mono text-[#0F2942]">NO CELL SELECTED</div>
                <p className="text-[11px] font-sans">
                  Select a storm cluster on the map or row from the inventory table below to inspect cell telemetry.
                </p>
              </div>
            )}

            {/* Panel Footer Provenance Disclaimer */}
            <div className="pt-2 border-t border-[#D0E3F0] text-[10px] font-mono text-[#47637E] flex items-center justify-between">
              <span>TITAN / SCIT Algorithm</span>
              <span>Data Mode: {dataMode}</span>
            </div>

          </div>

        </div>

      </div>

      {/* 3. Cell Inventory Table */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl overflow-hidden shadow-xs space-y-2">
        <div className="p-3 bg-[#EEF6FB] border-b border-[#D0E3F0] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#0284C7]" />
            <h3 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-tight">
              DETECTED STORM CELL INVENTORY ({cells.length} CLUSTERS)
            </h3>
          </div>
          <span className="text-[10px] text-[#47637E] font-sans">
            Click any row to target map camera and load inspection telemetry
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#EEF6FB] text-[#47637E] border-b border-[#D0E3F0] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3 font-sans">CELL ID</th>
                <th className="p-3 font-sans">MAX INTENSITY (dBZ)</th>
                <th className="p-3 font-sans">MOTION VECTOR</th>
                <th className="p-3 font-sans">SPEED</th>
                <th className="p-3 font-sans">OBSERVED FLASH RATE</th>
                <th className="p-3 font-sans">LIFECYCLE STAGE</th>
                <th className="p-3 font-sans">SEVERITY STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0E3F0] bg-white text-[#0F2942]">
              {cells.length > 0 ? (
                cells.map((cell) => {
                  const isSelected = activeCell?.cell_id === cell.cell_id;
                  return (
                    <tr
                      key={cell.cell_id}
                      onClick={() => onSelectCell && onSelectCell(cell)}
                      className={`cursor-pointer transition-all hover:bg-[#EEF6FB] ${
                        isSelected ? 'bg-[#E0F2FE] text-[#0F2942] font-bold border-l-4 border-[#0284C7]' : ''
                      }`}
                    >
                      <td className="p-3 font-bold text-[#0284C7] font-sans flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse"></span>
                        <span>{cell.cell_id}</span>
                      </td>

                      <td className="p-3 font-bold text-[#DC2626]">
                        {cell.max_dbz ? cell.max_dbz.toFixed(1) : 48} dBZ
                      </td>

                      <td className="p-3 text-[#0F2942] flex items-center gap-1.5">
                        <Navigation 
                          className="w-3.5 h-3.5 text-[#0284C7] transform" 
                          style={{ transform: `rotate(${cell.movement?.heading_deg || 135}deg)` }} 
                        />
                        <span>{cell.movement?.heading_deg || 135}° ({cell.movement?.direction_compass || 'SE'})</span>
                      </td>

                      <td className="p-3 font-mono text-[#47637E]">
                        {cell.movement?.speed_kmh || 24} km/h
                      </td>

                      <td className="p-3 text-[#D97706] font-bold">
                        <div>
                          <span>{cell.lightning_flash_rate_min || 38.0} /min</span>
                          {cell.is_lightning_jump && (
                            <span className="text-[9px] text-[#D97706] block font-mono">
                              ⚡ Lightning Jump
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] inline-block font-sans">
                          {cell.lifecycle_state || 'MATURE CONVECTIVE'}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans border uppercase ${getSeverityBadgeClass(cell.severity)}`}>
                          {cell.severity || 'SEVERE'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#5E82A6] font-sans">
                    <div className="space-y-1 font-mono text-xs">
                      <span className="font-bold uppercase text-[#0F2942] block">
                        {getEmptyStateDetails().title}
                      </span>
                      <p className="text-[11px] font-sans italic text-[#5E82A6]">
                        {getEmptyStateDetails().message}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
