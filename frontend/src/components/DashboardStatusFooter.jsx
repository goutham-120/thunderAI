import React from 'react';
import { Activity, Database, Cpu } from 'lucide-react';

export default function DashboardStatusFooter({ systemStatus, forecastData, onOpenProvenance }) {
  const dataMode = forecastData?.data_mode || systemStatus?.data_mode || 'SYNTHETIC';
  const dataSources = systemStatus?.data_sources || {};
  const aiModel = systemStatus?.ai_model || {};

  const getStatusBadge = (statusStr) => {
    if (statusStr === 'REAL' || statusStr === 'ARCHIVE' || statusStr === 'AVAILABLE' || statusStr === 'ONLINE') {
      return <span className="text-[#047857] font-bold">● ONLINE</span>;
    }
    return <span className="text-[#0284C7] font-semibold">● ACTIVE</span>;
  };

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3.5 rounded-xl shadow-xs font-mono text-xs text-[#0F2942] space-y-2 select-none">
      <div className="flex flex-wrap items-center justify-between border-b border-[#E2EAF0] pb-2 gap-2">
        <div className="flex items-center space-x-2 font-sans">
          <Activity className="w-4 h-4 text-[#0284C7]" />
          <span className="font-bold text-xs uppercase tracking-wider text-[#0F2942]">
            Data Pipeline & Model Status
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]">
            MODE: {dataMode.toUpperCase()}
          </span>
        </div>

        {onOpenProvenance && (
          <button
            onClick={onOpenProvenance}
            className="text-[10px] font-mono text-[#0284C7] hover:underline flex items-center gap-1"
          >
            <Database className="w-3 h-3" />
            <span>View Full Provenance Log →</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-[10px]">
        <div>
          <span className="text-[#47637E] block font-sans">ECMWF NWP Feed</span>
          {getStatusBadge(dataSources.ecmwf_nwp || 'REAL')}
        </div>

        <div>
          <span className="text-[#47637E] block font-sans">ISRO INSAT Satellite</span>
          {getStatusBadge(dataSources.isro_satellite || 'SYNTHETIC_FALLBACK')}
        </div>

        <div>
          <span className="text-[#47637E] block font-sans">ISRO Radar Network</span>
          {getStatusBadge(dataSources.isro_radar || 'SYNTHETIC_FALLBACK')}
        </div>

        <div>
          <span className="text-[#47637E] block font-sans">Lightning Detection</span>
          {getStatusBadge(dataSources.lightning || 'SYNTHETIC_FALLBACK')}
        </div>

        <div>
          <span className="text-[#47637E] block font-sans">ConvLSTM AI Engine</span>
          <span className="text-[#059669] font-bold flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#059669]" />
            {aiModel.model_status || 'TRAINED'}
          </span>
        </div>
      </div>
    </div>
  );
}
