import React from 'react';
import { 
  Database, 
  Radio, 
  Satellite, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  CloudRain
} from 'lucide-react';

export default function DataSourcesSection({ systemStatus }) {
  const channelProvenance = systemStatus?.channel_provenance || {};
  const channelStatus = systemStatus?.channel_status || {};
  const dataMode = (systemStatus?.data_mode || 'SYNTHETIC').toUpperCase();
  const timestamps = systemStatus?.timestamps || {};

  const getStatusBadge = (provKey, fallbackName) => {
    const provStr = String(channelProvenance[provKey] || channelStatus[provKey] || '').toUpperCase();

    if (provStr.includes('REAL') || provStr.includes('IMD') || provStr.includes('MOSDAC') || provStr.includes('ECMWF')) {
      return { label: 'REAL SENSOR', classes: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]', prov: channelProvenance[provKey] || fallbackName };
    } else if (provStr.includes('ARCHIVE')) {
      return { label: 'ARCHIVE REPLAY', classes: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]', prov: 'Historical Replay Dataset' };
    } else if (provStr.includes('UNAVAILABLE') || provStr.includes('MISSING')) {
      return { label: 'UNAVAILABLE', classes: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]', prov: 'Feed Disconnected' };
    } else {
      return { label: 'SYNTHETIC FALLBACK', classes: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]', prov: 'Convective Cube Synthesizer' };
    }
  };

  const sourcesList = [
    {
      name: 'Open-Meteo / ECMWF IFS 9km NWP',
      desc: 'CAPE, CIN, 10m Wind Shear, Precipitable Water',
      provKey: 'nwp_cape',
      icon: Database,
      fallbackName: 'Open-Meteo ECMWF IFS HRES Global Grid'
    },
    {
      name: 'ISRO MOSDAC / INSAT-3DS Satellite',
      desc: 'TIR1 (10.8 µm), WV (6.8 µm) Radiance Scans',
      provKey: 'sat_tir1_k',
      icon: Satellite,
      fallbackName: 'INSAT-3DS SGP Calibrated Observations'
    },
    {
      name: 'ISRO / IMD Doppler Weather Radar (DWR)',
      desc: 'Reflectivity (dBZ) & Radial Velocity (m/s)',
      provKey: 'radar_dbz',
      icon: Radio,
      fallbackName: 'IMD DWR Radar Composite Network'
    },
    {
      name: 'IITM / IMD Damini Lightning Network',
      desc: 'LLN Ground Flash Strike Rate & Cell Density',
      provKey: 'lightning_density',
      icon: Zap,
      fallbackName: 'IMD LLN Lightning Strike Network'
    }
  ];

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-4 font-sans text-[#12324E]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-tight">
              2. MULTIMODAL DATA SOURCE & PROVENANCE STATUS
            </h2>
            <p className="text-[11px] text-[#47637E] font-sans">
              Live observation channels, sensor connectivity audit, and active data mode classification
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0] uppercase">
          Operating Mode: {dataMode}
        </span>
      </div>

      {/* Sources Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#EEF6FB] text-[#47637E] border-b border-[#D0E3F0] uppercase tracking-wider text-[10px] font-sans">
            <tr>
              <th className="p-3">DATA SOURCE & CONNECTOR</th>
              <th className="p-3">MODALITY / CHANNELS</th>
              <th className="p-3">CLASSIFICATION</th>
              <th className="p-3">PROVENANCE DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D0E3F0] bg-white text-[#0F2942]">
            {sourcesList.map((src, i) => {
              const Icon = src.icon;
              const badge = getStatusBadge(src.provKey, src.fallbackName);

              return (
                <tr key={i} className="hover:bg-[#F8FCFE] transition-colors">
                  <td className="p-3 font-sans font-bold flex items-center space-x-2 text-[#0F2942]">
                    <Icon className="w-4 h-4 text-[#0284C7] shrink-0" />
                    <span>{src.name}</span>
                  </td>
                  <td className="p-3 text-[11px] text-[#47637E] font-sans">{src.desc}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${badge.classes}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-3 text-[11px] text-[#47637E] font-mono">{badge.prov}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Timestamp Bar */}
      <div className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-lg flex flex-wrap items-center justify-between text-xs font-mono text-[#47637E] gap-2">
        <div className="flex items-center space-x-4">
          <span className="flex items-center gap-1 font-bold text-[#0F2942]">
            <Clock className="w-3.5 h-3.5 text-[#0284C7]" /> Ingestion Telemetry:
          </span>
          <span>Observed: {timestamps.observation_time ? new Date(timestamps.observation_time).toUTCString() : 'Live'}</span>
        </div>

        <div>
          <span>Ingested: {timestamps.ingestion_time ? new Date(timestamps.ingestion_time).toLocaleTimeString() : 'Live'}</span>
        </div>
      </div>

    </div>
  );
}
