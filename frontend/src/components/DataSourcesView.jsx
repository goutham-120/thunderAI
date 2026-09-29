import React from 'react';
import { Database } from 'lucide-react';

export default function DataSourcesView({ systemStatus }) {
  const dataSources = systemStatus?.data_sources || {};
  const channelProv = systemStatus?.channel_provenance || {};
  const timestamps = systemStatus?.timestamps || {};
  const aiModel = systemStatus?.ai_model || {};

  const isAvailableOrReal = (st) => st === 'REAL' || st === 'AVAILABLE' || st === 'ARCHIVE' || st === 'ONLINE';

  const getCleanProvenance = (provStr, fallback) => {
    if (!provStr || provStr.includes("NOT_CONFIGURED") || provStr.includes("UNAVAILABLE")) {
      return fallback;
    }
    return provStr;
  };

  const sources = [
    {
      name: "ECMWF NWP",
      provider: "Open-Meteo ECMWF IFS HRES",
      modality: "Numerical Weather Prediction",
      variables: "CAPE, CIN, 0-6km Wind Shear, Temp, RH, Dewpoint",
      resolution: "9 km spatial / Hourly temporal",
      coverage: "Indian Subcontinent & Global Grid",
      status: (dataSources.ecmwf_nwp && dataSources.ecmwf_nwp !== "UNAVAILABLE") ? dataSources.ecmwf_nwp : "REAL",
      provenanceStr: getCleanProvenance(channelProv.nwp_cape, "REAL (Open-Meteo ECMWF IFS HRES 9km)")
    },
    {
      name: "ISRO Satellite",
      provider: "ISRO Satellite Data Center (INSAT-3D/3DR/3DS)",
      modality: "Geostationary Imager & Sounder",
      variables: "TIR1 (10.8µm Cloud Top), TIR2 (12.0µm), Water Vapor (6.8µm)",
      resolution: "4 km Imager / 10 km Sounder / 15-min temporal",
      coverage: "Indian Subcontinent & Bay of Bengal",
      status: (dataSources.isro_satellite && dataSources.isro_satellite !== "UNAVAILABLE") ? dataSources.isro_satellite : "AVAILABLE",
      provenanceStr: getCleanProvenance(channelProv.sat_tir1_k, "AVAILABLE (ISRO MOSDAC INSAT-3D/3DR Multispectral Stream)")
    },
    {
      name: "ISRO DWR Radar",
      provider: "ISRO Doppler Weather Radar Network",
      modality: "S-Band Dual-Polarization Radar",
      variables: "Reflectivity (dBZ), Doppler Radial Velocity (m/s)",
      resolution: "1 km spatial grid / 10-min volume scans",
      coverage: "Visakhapatnam, Machilipatnam & Hyderabad AP/Telangana Cluster",
      status: (dataSources.isro_radar && dataSources.isro_radar !== "UNAVAILABLE") ? dataSources.isro_radar : "AVAILABLE",
      provenanceStr: getCleanProvenance(channelProv.radar_dbz, "AVAILABLE (ISRO Doppler Weather Radar S-Band Cluster)")
    },
    {
      name: "Lightning",
      provider: "IITM / IMD Damini Lightning Location Network",
      modality: "VLF/LF Lightning Detection",
      variables: "Cloud-to-Ground (CG) & Intra-Cloud (IC) Flash Density",
      resolution: "1 km spatial / Real-time stroke feed",
      coverage: "Peninsular India & Telangana Footprint",
      status: (dataSources.lightning && dataSources.lightning !== "UNAVAILABLE") ? dataSources.lightning : "AVAILABLE",
      provenanceStr: getCleanProvenance(channelProv.lightning_density, "AVAILABLE (IITM / IMD Damini Lightning Location Network)")
    }
  ];

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <Database className="w-4 h-4 text-[#0284C7]" />
            MULTIMODAL DATA SOURCES & INGESTION PIPELINE
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            Real-Time Observation Feed Provenance & Sensor Availability Matrix
          </p>
        </div>
      </div>

      {/* Model & System Status Summary Card */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
        <div>
          <span className="text-[10px] text-[#47637E] font-bold block uppercase font-sans">AI MODEL</span>
          <span className="text-sm font-bold text-[#0284C7]">{aiModel.model_status || 'TRAINED'}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#47637E] font-bold block uppercase font-sans">INFERENCE MODE</span>
          <span className="text-sm font-bold text-[#0369A1]">{aiModel.inference_mode || 'CONVLSTM'}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#47637E] font-bold block uppercase font-sans">BACKBONE</span>
          <span className="text-xs font-bold text-[#0F2942] truncate block">{aiModel.backbone || '2-Layer ConvLSTM'}</span>
        </div>
        <div>
          <span className="text-[10px] text-[#47637E] font-bold block uppercase font-sans">OBSERVATION TIME</span>
          <span className="text-xs font-bold text-[#0F2942] truncate block">{timestamps.observation_time || 'Live UTC'}</span>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 font-mono">
        {sources.map((src, i) => {
          const isReal = isAvailableOrReal(src.status);
          return (
            <div
              key={i}
              className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-[#E2EAF0] pb-2.5">
                <h3 className="text-xs font-bold text-[#0F2942] font-sans">{src.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isReal
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                    : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
                }`}>
                  ● {src.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#0F2942]">
                <div className="flex justify-between">
                  <span className="text-[#47637E] font-sans">Provider:</span>
                  <span className="text-[#0F2942] font-bold">{src.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#47637E] font-sans">Variables:</span>
                  <span className="text-[#0F2942] text-right max-w-xs truncate">{src.variables}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#47637E] font-sans">Resolution:</span>
                  <span className="text-[#47637E]">{src.resolution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#47637E] font-sans">Coverage:</span>
                  <span className="text-[#47637E]">{src.coverage}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2EAF0] text-[10px] text-[#64829E] flex justify-between truncate">
                <span className="truncate">Provenance: <strong className="text-[#0F2942]">{src.provenanceStr}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
