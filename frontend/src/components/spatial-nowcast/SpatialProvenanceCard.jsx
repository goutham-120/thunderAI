import React from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Database, 
  Radio, 
  Satellite, 
  Zap, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  FileText
} from 'lucide-react';

export default function SpatialProvenanceCard({ forecastData, onOpenProvenanceModal }) {
  const dataQuality = (forecastData?.data_quality || forecastData?.data_mode || 'SYNTHETIC').toUpperCase();
  const channelProvenance = forecastData?.channel_provenance || {};
  const channelStatus = forecastData?.channel_status || {};
  const realChannels = forecastData?.real_channels || [];
  const fallbackChannels = forecastData?.fallback_channels || [];
  const missingChannels = forecastData?.missing_channels || [];

  const getStatusPill = (statusStr) => {
    const s = String(statusStr || '').toUpperCase();

    if (s.includes('REAL') || s.includes('IMD') || s.includes('MOSDAC') || s.includes('ECMWF')) {
      return {
        label: 'REAL SENSOR',
        icon: CheckCircle2,
        classes: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
      };
    } else if (s.includes('ARCHIVE')) {
      return {
        label: 'ARCHIVE',
        icon: Database,
        classes: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
      };
    } else if (s.includes('FALLBACK') || s.includes('SYNTHETIC_FALLBACK')) {
      return {
        label: 'SYNTHETIC FALLBACK',
        icon: AlertTriangle,
        classes: 'bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]'
      };
    } else if (s.includes('UNAVAILABLE') || s.includes('MISSING')) {
      return {
        label: 'UNAVAILABLE',
        icon: XCircle,
        classes: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
      };
    } else if (s.includes('MOCK') || s.includes('DEMO')) {
      return {
        label: 'MOCK/DEMO',
        icon: HelpCircle,
        classes: 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]'
      };
    } else {
      return {
        label: 'SYNTHETIC',
        icon: Activity,
        classes: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
      };
    }
  };

  const channelMap = [
    { key: 'radar_dbz', name: 'Doppler Weather Radar (dBZ)', icon: Radio },
    { key: 'sat_tir1_k', name: 'INSAT-3D Satellite IR (K)', icon: Satellite },
    { key: 'lightning_density', name: 'Lightning Flash Density (LLN)', icon: Zap },
    { key: 'pred_thunderstorm_prob', name: 'SpatioTemporal Net AI Engine', icon: Activity },
    { key: 'nwp_cape', name: 'Open-Meteo ECMWF NWP Grid', icon: Database },
  ];

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3 font-sans text-[#12324E]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-[#0F2942] uppercase tracking-tight">
              DATA PROVENANCE & SENSOR AUDIT
            </h3>
            <p className="text-[11px] text-[#47637E] font-sans">
              Explicit channel-by-channel sensor origin & telemetry verification
            </p>
          </div>
        </div>

        {onOpenProvenanceModal && (
          <button
            onClick={onOpenProvenanceModal}
            className="text-[11px] font-mono text-[#0284C7] hover:underline font-bold flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> Inspect Spec
          </button>
        )}
      </div>

      {/* Mode Warning Banner */}
      {dataQuality.includes('SYNTHETIC') && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-2.5 rounded-lg text-xs flex items-start space-x-2 text-[#92400E]">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono uppercase">NOTICE: SYNTHETIC DATA MODE ACTIVE</span>
            <p className="text-[11px] text-[#B45309] font-sans mt-0.5 leading-snug">
              Backend is supplying synthesized 4D atmospheric tensors due to simulated live stream or offline real IMD sensors. All values reflect model physics & synthetic generator output.
            </p>
          </div>
        </div>
      )}

      {/* Channel Provenance Table */}
      <div className="space-y-1.5 pt-1">
        {channelMap.map((ch) => {
          const Icon = ch.icon;
          const statusVal = channelProvenance[ch.key] || channelStatus[ch.key] || (dataQuality.includes('REAL') ? 'REAL' : 'SYNTHETIC');
          const pill = getStatusPill(statusVal);
          const IconComp = pill.icon;

          return (
            <div 
              key={ch.key}
              className="bg-white border border-[#D0E3F0] p-2 rounded-lg flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2">
                <Icon className="w-3.5 h-3.5 text-[#0284C7]" />
                <span className="font-sans font-medium text-[#0F2942]">{ch.name}</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 uppercase ${pill.classes}`}>
                  <IconComp className="w-3 h-3" />
                  {pill.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Provenance Footer Summary */}
      <div className="flex items-center justify-between text-[11px] font-mono text-[#47637E] pt-1 border-t border-[#D0E3F0]">
        <div>
          <span className="text-[#0F2942]">Real Channels:</span> {realChannels.length} / 8
        </div>
        <div>
          <span className="text-[#0F2942]">Fallbacks:</span> {fallbackChannels.length}
        </div>
        <div>
          <span className="text-[#0F2942]">Missing:</span> {missingChannels.length}
        </div>
      </div>

    </div>
  );
}
