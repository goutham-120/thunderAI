import React from 'react';
import { RotateCcw } from 'lucide-react';

export default function ReplayView({ historicalEvents, selectedEventId, setSelectedEventId }) {
  const events = historicalEvents || [
    {
      event_id: "HYD-PREMONSOON-2024",
      name: "Hyderabad Pre-Monsoon Severe Thunderstorm",
      date: "2024-05-10",
      data_type: "REAL_HISTORICAL",
      description: "Severe multicell thunderstorm over Hyderabad with 58 dBZ core and 34 flashes/min.",
      peak_dbz: 58,
      strikes_count: 1420
    },
    {
      event_id: "VSKP-CYCLONIC-2023",
      name: "Visakhapatnam Coastal Convective Squall",
      date: "2023-10-18",
      data_type: "REAL_HISTORICAL",
      description: "Coastal AP convective squall line with intense radar reflectivity and wind shear.",
      peak_dbz: 62,
      strikes_count: 2180
    },
    {
      event_id: "SYNTHETIC-BENCHMARK-01",
      name: "Synthetic Benchmark Convective Sequence",
      date: "SIMULATED",
      data_type: "DEMO_SYNTHETIC",
      description: "Physically consistent synthetic benchmark storm for model testing.",
      peak_dbz: 55,
      strikes_count: 850
    }
  ];

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* View Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <RotateCcw className="w-4 h-4 text-[#0284C7]" />
            HISTORICAL SEVERE WEATHER REPLAY
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            High-Resolution Radar & Satellite Replay Archive
          </p>
        </div>
      </div>

      {/* Events Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono">
        {events.map((evt) => {
          const isSelected = selectedEventId === evt.event_id;
          const isReal = evt.data_type === 'REAL_HISTORICAL';

          return (
            <div
              key={evt.event_id}
              onClick={() => setSelectedEventId(evt.event_id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                isSelected
                  ? 'bg-[#D4E6F5]/70 border-[#0284C7] shadow-xs'
                  : 'bg-[#F8FCFE] border-[#D0E3F0] hover:border-[#B8D6EB]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                  isReal
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                    : 'bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]'
                }`}>
                  {isReal ? 'REAL HISTORICAL EVENT' : 'DEMO / SYNTHETIC EVENT'}
                </span>
                <span className="text-[10px] text-[#64829E]">{evt.date}</span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0F2942] font-sans">{evt.name}</h3>
                <p className="text-[11px] text-[#47637E] mt-1 line-clamp-2">{evt.description}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#47637E] pt-2 border-t border-[#E2EAF0]">
                <span>Peak Reflectivity: <strong className="text-[#DC2626]">{evt.peak_dbz} dBZ</strong></span>
                <span>Strikes: <strong className="text-[#D97706]">{evt.strikes_count}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
