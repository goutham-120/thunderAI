import React from 'react';
import { HelpCircle, Radio, Zap, Satellite, Layers, Wind, Droplets } from 'lucide-react';

export default function ExplainabilityView({ xaiData }) {
  const drivers = xaiData?.drivers || [
    { feature: "RADAR REFLECTIVITY", value: "56.2 dBZ", impact_percent: 92, status: "CRITICAL", icon: Radio, color: "text-[#DC2626]" },
    { feature: "LIGHTNING FLASH ACCELERATION", value: "+28.4 /min", impact_percent: 84, status: "CRITICAL", icon: Zap, color: "text-[#D97706]" },
    { feature: "ISRO SATELLITE CLOUD-TOP TEMP", value: "-68.4 °C", impact_percent: 91, status: "CRITICAL", icon: Satellite, color: "text-[#4F46E5]" },
    { feature: "NWP CAPE INSTABILITY", value: "2450 J/kg", impact_percent: 78, status: "HIGH", icon: Layers, color: "text-[#0D9488]" },
    { feature: "0-6 KM WIND SHEAR", value: "24.0 kts", impact_percent: 68, status: "FAVORABLE", icon: Wind, color: "text-[#047857]" },
    { feature: "INTEGRATED WATER VAPOUR", value: "54.2 mm", impact_percent: 62, status: "HIGH", icon: Droplets, color: "text-[#0284C7]" }
  ];

  return (
    <div className="space-y-4 font-sans text-[#12324E]">
      {/* Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
            <HelpCircle className="w-4 h-4 text-[#0284C7]" />
            FEATURE ATTRIBUTION & PHYSICAL DRIVERS
          </h2>
          <p className="text-xs text-[#5E82A6] font-sans">
            Feature Attribution Breakdown for Convective Initiation & Intensity
          </p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg space-y-3 font-sans shadow-2xs">
        <h3 className="text-xs font-bold text-[#12324E] uppercase tracking-wider mb-2 font-sora">
          Feature Impact Weight
        </h3>

        <div className="space-y-3">
          {drivers.map((d, i) => {
            const Icon = d.icon || Radio;
            return (
              <div key={i} className="bg-[#EEF6FB] border border-[#D0E3F0] p-3 rounded-md space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <div className="flex items-center space-x-2">
                    <Icon className={`w-4 h-4 ${d.color || 'text-[#0284C7]'}`} />
                    <span className="font-bold text-[#12324E]">{d.feature}</span>
                    <span className="text-[#5E82A6] font-mono">({d.value})</span>
                  </div>
                  <span className="text-[#0284C7] font-bold font-mono">{d.impact_percent}% Weight</span>
                </div>

                <div className="w-full bg-[#E2EAF0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0284C7] h-2 rounded-full"
                    style={{ width: `${d.impact_percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
