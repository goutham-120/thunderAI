import React from 'react';
import { History, MapPin, ShieldCheck } from 'lucide-react';

export default function HistoricalReplayBar({
  selectedEventId,
  setSelectedEventId,
  historicalEvents
}) {
  const currentEvent = historicalEvents?.find(e => e.event_id === selectedEventId) || historicalEvents?.[0];

  return (
    <div className="bg-[#FFFBEB] text-[#92400E] px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#FEF3C7] text-xs font-sans">
      {/* Event Selector */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-[#F8FCFE] px-2.5 py-1 rounded-md border border-[#FDE68A] shadow-2xs">
          <History className="w-3.5 h-3.5 text-[#B45309]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#92400E] font-mono">
            Historical Event:
          </span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-transparent text-[#0F2942] text-xs font-semibold focus:outline-hidden"
          >
            {historicalEvents?.map(ev => (
              <option key={ev.event_id} value={ev.event_id}>
                {ev.title || ev.name} ({ev.date})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-[#92400E]">
          <MapPin className="w-3.5 h-3.5 text-[#B45309]" />
          <span>{currentEvent?.region || currentEvent?.name}</span>
          <span>•</span>
          <span className="font-mono text-[#DC2626] font-bold">Peak: {currentEvent?.peak_dbz} dBZ</span>
        </div>
      </div>

      {/* Ground Truth Mode */}
      <div className="flex items-center space-x-2 bg-[#F8FCFE] px-2.5 py-1 rounded-md border border-[#FDE68A] text-xs">
        <ShieldCheck className="w-3.5 h-3.5 text-[#047857]" />
        <span className="text-[#0F2942]">Replay Ground Truth Mode:</span>
        <span className="font-mono font-bold text-[#047857]">Synchronized Verification</span>
      </div>
    </div>
  );
}
