import React from 'react';
import { Database, X, CheckCircle2 } from 'lucide-react';

export default function DataProvenanceModal({ isOpen, onClose, systemStatus }) {
  if (!isOpen) return null;

  const dataSources = systemStatus?.data_sources || {
    ecmwf_nwp: "REAL",
    isro_satellite: "UNAVAILABLE",
    isro_radar: "UNAVAILABLE",
    lightning: "UNAVAILABLE"
  };

  const channelProv = systemStatus?.channel_provenance || {};
  const aiModel = systemStatus?.ai_model || {
    model_status: "TRAINED",
    inference_mode: "CONVLSTM",
    backbone: "2-Layer ConvLSTM Encoder-Decoder"
  };
  const timestamps = systemStatus?.timestamps || {};

  const provenanceItems = [
    {
      source: "Open-Meteo ECMWF IFS HRES",
      modality: "NWP Thermodynamics",
      variables: "CAPE, CIN, 0-6km Wind Shear, TPW, Temp, RH",
      resolution: "9 km spatial / Hourly temporal",
      status: dataSources.ecmwf_nwp === "REAL" ? "REAL" : "UNAVAILABLE",
      provenanceStr: channelProv.nwp_cape || "REAL (Open-Meteo ECMWF IFS HRES 9km)",
      badgeColor: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
    },
    {
      source: "ISRO Satellite (INSAT-3D/3DR)",
      modality: "Geostationary Satellite IR",
      variables: "TIR1 (10.8µm Cloud Top), Water Vapor (6.8µm)",
      resolution: "4 km spatial / 15-min temporal",
      status: dataSources.isro_satellite || "UNAVAILABLE",
      provenanceStr: channelProv.sat_tir1_k || "SYNTHETIC_FALLBACK (ISRO_SATELLITE_ACCESS_NOT_CONFIGURED)",
      badgeColor: (dataSources.isro_satellite === "REAL" || dataSources.isro_satellite === "ARCHIVE")
        ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
        : "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]"
    },
    {
      source: "ISRO Doppler Weather Radar (DWR)",
      modality: "S-Band Dual-Pol Radar",
      variables: "Reflectivity (dBZ), Radial Velocity (m/s)",
      resolution: "1 km spatial / 10-min temporal",
      status: dataSources.isro_radar || "UNAVAILABLE",
      provenanceStr: channelProv.radar_dbz || "SYNTHETIC_FALLBACK (ISRO_DWR_ACCESS_NOT_CONFIGURED)",
      badgeColor: (dataSources.isro_radar === "REAL" || dataSources.isro_radar === "ARCHIVE")
        ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
        : "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]"
    },
    {
      source: "IITM / IMD Damini Network",
      modality: "Lightning Location Network (LLN)",
      variables: "Cloud-to-Ground & Intra-Cloud Flash Density",
      resolution: "1 km spatial / Real-time stroke feed",
      status: dataSources.lightning || "UNAVAILABLE",
      provenanceStr: channelProv.lightning_density || "SYNTHETIC_FALLBACK (LIGHTNING_ACCESS_NOT_CONFIGURED)",
      badgeColor: (dataSources.lightning === "REAL" || dataSources.lightning === "ARCHIVE")
        ? "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]"
        : "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#12324E]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden font-sans text-[#12324E]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#D0E3F0] flex items-center justify-between bg-[#EEF6FB]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-md bg-[#F8FCFE] border border-[#D0E3F0] flex items-center justify-center text-[#0284C7]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
                Data Provenance & System Status Log
              </h2>
              <p className="text-xs text-[#5E82A6] font-sans">
                Multimodal Source Traceability & Inference Pipeline Metadata
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#5E82A6] hover:text-[#12324E] hover:bg-[#EEF6FB] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-sans">
          
          {/* AI Model Summary Card */}
          <div className="bg-[#EEF6FB] p-4 rounded-md border border-[#D0E3F0] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div>
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block mb-1 font-sans">
                MODEL BACKBONE
              </span>
              <span className="text-xs font-bold text-[#0284C7] font-mono">
                {aiModel.backbone}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block mb-1 font-sans">
                CHECKPOINT STATUS
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[#047857] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                {aiModel.model_status}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block mb-1 font-sans">
                INFERENCE MODE
              </span>
              <span className="text-xs font-bold text-[#12324E] font-mono">
                {aiModel.inference_mode}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block mb-1 font-sans">
                DATA QUALITY
              </span>
              <span className="text-xs font-bold text-[#12324E] font-mono">
                {systemStatus?.data_quality || "PARTIAL"}
              </span>
            </div>
          </div>

          {/* Data Sources Provenance Table */}
          <div>
            <h3 className="text-xs font-bold text-[#12324E] uppercase tracking-wider mb-2 font-sora">
              Multimodal Ingestion Provenance Trace
            </h3>

            <div className="overflow-x-auto rounded-md border border-[#D0E3F0]">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#EEF6FB] text-[#5E82A6] border-b border-[#D0E3F0] uppercase text-[10px] font-sans">
                  <tr>
                    <th className="p-3">Data Source / Provider</th>
                    <th className="p-3">Variables</th>
                    <th className="p-3">Resolution</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Provenance Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0E3F0] bg-[#F8FCFE] text-[#12324E]">
                  {provenanceItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#EEF6FB]">
                      <td className="p-3 font-bold text-[#12324E] font-sans">{item.source}</td>
                      <td className="p-3 text-[#5E82A6]">{item.variables}</td>
                      <td className="p-3 text-[#5E82A6]">{item.resolution}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${item.badgeColor}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#5E82A6] text-[10px] truncate max-w-xs font-mono" title={item.provenanceStr}>
                        {item.provenanceStr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timestamps Card */}
          <div className="bg-[#EEF6FB] p-3 rounded-md border border-[#D0E3F0] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#5E82A6]">
            <div>Observation: <strong className="text-[#12324E]">{timestamps.observation_time || "N/A"}</strong></div>
            <div>Ingestion: <strong className="text-[#12324E]">{timestamps.ingestion_time || "N/A"}</strong></div>
            <div>Forecast: <strong className="text-[#12324E]">{timestamps.forecast_generation_time || "N/A"}</strong></div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#D0E3F0] bg-[#EEF6FB] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#12324E] hover:bg-[#1C3A57] text-white font-semibold text-xs font-sans transition-all"
          >
            Close Provenance Log
          </button>
        </div>
      </div>
    </div>
  );
}
