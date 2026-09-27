import React from 'react';
import { ShieldAlert, Clock, MapPin } from 'lucide-react';

export default function AlertsView({ alerts }) {
  const capAlerts = alerts || [
    {
      id: "CAP-HYD-2026-001",
      headline: "SEVERE THUNDERSTORM & LIGHTNING WARNING",
      severity: "EXTREME",
      urgency: "IMMEDIATE",
      area: "Hyderabad Urban & Cyberabad Footprint (Telangana)",
      probability_pct: 88,
      issued_time: "2026-09-27T18:00:00Z",
      valid_until: "2026-09-27T19:30:00Z",
      drivers: ["Radar Core > 56 dBZ", "CAPE > 2450 J/kg", "Flash Rate +28/min"]
    },
    {
      id: "CAP-VSKP-2026-002",
      headline: "HEAVY CONVECTIVE RAINFALL ALERT",
      severity: "SEVERE",
      urgency: "EXPECTED",
      area: "Visakhapatnam Coastal Sector (Andhra Pradesh)",
      probability_pct: 74,
      issued_time: "2026-09-27T18:15:00Z",
      valid_until: "2026-09-27T19:45:00Z",
      drivers: ["INSAT Cloud Top -68°C", "Coastal Convergence", "High Shear"]
    }
  ];

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* View Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-[#D97706]" />
            METEOROLOGICAL CAP WARNING INTERFACE
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            Common Alerting Protocol (CAP) Automated Convective Warnings
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-[#FFFBEB] text-[#92400E] px-3 py-1 rounded-md border border-[#FEF3C7]">
          {capAlerts.length} Active Warnings
        </span>
      </div>

      {/* Alerts Grid */}
      <div className="space-y-3 font-mono">
        {capAlerts.map((alert, idx) => (
          <div
            key={alert.id || idx}
            className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl space-y-3 shadow-xs hover:border-[#B8D6EB] transition-all"
          >
            <div className="flex flex-wrap items-center justify-between border-b border-[#E2EAF0] pb-2.5 gap-2">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  alert.severity === 'EXTREME'
                    ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]'
                    : 'bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]'
                }`}>
                  {alert.severity || 'SEVERE'}
                </span>
                <h3 className="text-xs font-bold text-[#0F2942] font-sans">{alert.headline}</h3>
              </div>
              <span className="text-[10px] text-[#64829E]">{alert.id}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center space-x-2 text-[#0F2942]">
                <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                <span>{alert.area}</span>
              </div>
              <div className="flex items-center space-x-2 text-[#0F2942]">
                <Clock className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                <span>Valid: {alert.valid_until ? alert.valid_until.substring(11, 16) + ' UTC' : 'T+90m'}</span>
              </div>
              <div className="text-right text-[#0284C7] font-bold">
                Probability: {alert.probability_pct || 80}%
              </div>
            </div>

            {alert.drivers && (
              <div className="flex flex-wrap items-center space-x-2 pt-1 border-t border-[#E2EAF0] text-[10px]">
                <span className="text-[#47637E] font-bold uppercase font-sans">Drivers:</span>
                {alert.drivers.map((d, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-[#EEF6FB] text-[#0F2942] border border-[#D0E3F0]">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
