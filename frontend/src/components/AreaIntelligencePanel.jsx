import React from 'react';
import { 
  MapPin, 
  ShieldAlert, 
  Clock, 
  CloudLightning, 
  Zap, 
  CloudRain, 
  Radio, 
  Compass, 
  Info, 
  X,
  Database
} from 'lucide-react';

export default function AreaIntelligencePanel({ 
  areaData, 
  onClose,
  horizonMin,
  setHorizonMin
}) {
  if (!areaData) return null;

  const area = areaData.selected_area || {};
  const threat = areaData.threat_assessment || {};
  const cell = areaData.closest_cell;
  const timeline = areaData.area_nowcast_timeline || [];
  const xai = areaData.xai_explanation || {};
  const atmos = areaData.atmospheric_conditions || {};
  const provenance = areaData.data_provenance || {};

  const statusColorMap = {
    red: { bg: 'bg-[#FEF2F2]', border: 'border-[#FEE2E2]', text: 'text-[#991B1B]', badge: 'bg-[#DC2626] text-white' },
    orange: { bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', text: 'text-[#C2410C]', badge: 'bg-[#EA580C] text-white' },
    yellow: { bg: 'bg-[#FEFCE8]', border: 'border-[#FEF08A]', text: 'text-[#854D0E]', badge: 'bg-[#CA8A04] text-white' },
    green: { bg: 'bg-[#F0FDF4]', border: 'border-[#DCFCE7]', text: 'text-[#166534]', badge: 'bg-[#16A34A] text-white' }
  };

  const style = statusColorMap[threat.badge_color] || statusColorMap.green;

  return (
    <div className="bg-[#F8FCFE] p-4 rounded-xl border border-[#D0E3F0] shadow-xs flex flex-col space-y-3.5 text-[#0F2942] text-xs font-sans">
      
      {/* Panel Header & Clear Action */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#EEF6FB] text-[#0284C7] border border-[#D0E3F0]">
            <MapPin className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#0F2942] uppercase tracking-wider font-mono flex items-center gap-1.5">
              Area Intelligence
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#0284C7] text-white font-mono">
                {area.type === 'box' ? 'BOUNDING AREA' : 'POINT TARGET'}
              </span>
            </h3>
            <p className="text-[10px] text-[#47637E] font-medium truncate max-w-[220px]">
              {area.description}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-[#EEF6FB] hover:bg-[#E5F0F7] text-[#47637E] hover:text-[#0F2942] transition-colors border border-[#D0E3F0]"
          title="Clear Area Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Threat Assessment Banner */}
      <div className={`p-3 rounded-lg border ${style.bg} ${style.border} ${style.text} space-y-1.5`}>
        <div className="flex items-center justify-between">
          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${style.badge}`}>
            {threat.status_badge || 'GREEN (CLEAR)'}
          </span>
          {threat.min_distance_km !== null && (
            <span className="text-[10px] font-mono font-bold">
              Dist: {threat.min_distance_km} km
            </span>
          )}
        </div>
        <p className="text-xs font-semibold leading-snug">
          {threat.headline}
        </p>
      </div>

      {/* Closest Storm Cell Info if Present */}
      {cell && (
        <div className="bg-[#EEF6FB] p-3 rounded-lg border border-[#D0E3F0] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#47637E] uppercase tracking-wider block">
              Tracked Convective Cell Details
            </span>
            {cell.is_lightning_jump && (
              <span className="text-[9px] font-mono font-bold text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FEF3C7] flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" />
                LIGHTNING JUMP
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span className="text-[9px] text-[#47637E] block font-sans">Cell ID & Lifecycle</span>
              <span className="font-bold text-[#0F2942]">{cell.cell_id} ({cell.lifecycle_state})</span>
            </div>
            <div>
              <span className="text-[9px] text-[#47637E] block font-sans">Movement</span>
              <span className="font-bold text-[#0F2942] flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#0284C7]" />
                {cell.movement?.direction_compass} @ {cell.movement?.speed_kmh} km/h
              </span>
            </div>
            <div>
              <span className="text-[9px] text-[#47637E] block font-sans">Max dBZ Core</span>
              <span className="font-bold text-[#DC2626]">{cell.max_dbz} dBZ</span>
            </div>
            <div>
              <span className="text-[9px] text-[#47637E] block font-sans">Lightning Rate</span>
              <span className="font-bold text-[#D97706]">{cell.lightning_flash_rate_min} flashes/min</span>
            </div>
          </div>
        </div>
      )}

      {/* Critical Infrastructure Threat Proximity Card */}
      {areaData.infrastructure_threats && areaData.infrastructure_threats.length > 0 && (
        <div className="bg-[#FFF7ED] p-3 rounded-lg border border-[#FFEDD5] space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#C2410C] uppercase tracking-wider font-sans flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#EA580C]" />
              Critical Infrastructure Proximity ETA
            </span>
            <span className="text-[9px] bg-[#EA580C] text-white px-1.5 py-0.2 rounded font-bold">
              {areaData.infrastructure_threats.length} ASSETS AT RISK
            </span>
          </div>
          <div className="space-y-1.5">
            {areaData.infrastructure_threats.map((infra) => (
              <div key={infra.id} className="bg-white/80 p-2 rounded border border-[#FED7AA] flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-bold text-[#0F2942] font-sans block">{infra.name}</span>
                  <span className="text-[9px] text-[#64829E] font-sans">{infra.type} • Dist: {infra.distance_km} km</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-[#C2410C] block">
                    ETA: T+{infra.eta_minutes}m
                  </span>
                  <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-[#FEF2F2] text-[#991B1B]">
                    {infra.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area 15-180 Min Prediction Timeline */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-[#47637E] uppercase tracking-wider block flex items-center justify-between">
          <span>Area Horizon Predictions (0–180 min)</span>
          <span className="font-mono text-[#0284C7] font-semibold text-[9px]">ConvLSTM Rollout</span>
        </span>

        <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
          {timeline.map((item) => {
            const isSelected = horizonMin === item.horizon_min;
            return (
              <button
                key={item.horizon_min}
                onClick={() => setHorizonMin && setHorizonMin(item.horizon_min)}
                className={`p-1.5 rounded border transition-all ${
                  isSelected 
                    ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-xs' 
                    : item.p_thunderstorm > 70 
                    ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]' 
                    : item.p_thunderstorm > 40
                    ? 'bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]'
                    : 'bg-[#EEF6FB] text-[#0F2942] border-[#D0E3F0] hover:bg-[#E5F0F7]'
                }`}
              >
                <span className="font-bold block">{item.label}</span>
                <span className="text-[9px]">{item.p_thunderstorm}% P(Thu)</span>
                <span className="text-[9px] block text-slate-500">{item.rainfall_mmh} mm/h</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meteorological Explanation Rationale */}
      <div className="bg-[#EEF6FB] p-2.5 rounded-lg border border-[#D0E3F0] space-y-1 text-[11px] text-[#47637E]">
        <div className="flex items-center space-x-1 text-[#0284C7] font-bold text-[10px] uppercase font-mono">
          <Info className="w-3.5 h-3.5" />
          <span>Area Atmospheric Explanation</span>
        </div>
        <p className="italic leading-relaxed">
          "{xai.meteorological_rationale || 'Multimodal sensor fusion indicates atmospheric column state evaluated over selected coordinates.'}"
        </p>
      </div>

      {/* Provenance Footer */}
      <div className="text-[9px] font-mono text-[#64829E] flex items-center justify-between pt-1 border-t border-[#D0E3F0]">
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-[#0284C7]" />
          Source: {provenance.source || 'Multimodal DWR + ConvLSTM'}
        </span>
        <span>Mode: {provenance.data_mode || 'SYNTHETIC'}</span>
      </div>

    </div>
  );
}
