import React from 'react';
import { 
  History, 
  MapPin, 
  ShieldCheck
} from 'lucide-react';

export default function HistoricalReplayBar({
  selectedEventId,
  setSelectedEventId,
  historicalEvents,
  replayTimestamp,
  setReplayTimestamp
}) {
  const currentEvent = historicalEvents.find(e => e.event_id === selectedEventId) || historicalEvents[0];

  return (
    <div className="bg-[#0D1527] text-white px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50 shadow-inner">
      {/* Event Selector */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-indigo-950/80 px-2.5 py-1.5 rounded-xl border border-indigo-700/60">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Historical Event:
          </span>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-indigo-900/90 text-white text-xs font-semibold px-2 py-1 rounded-lg border border-indigo-500/50 focus:outline-hidden"
          >
            {historicalEvents.map(ev => (
              <option key={ev.event_id} value={ev.event_id}>
                {ev.title} ({ev.date})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:flex items-center space-x-2 text-xs text-indigo-300">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentEvent?.region}</span>
          <span>•</span>
          <span className="font-mono text-amber-400 font-bold">Peak: {currentEvent?.peak_dbz} dBZ</span>
        </div>
      </div>

      {/* Observation vs AI Validation Indicator */}
      <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-slate-300">Replay Ground Truth Mode:</span>
        <span className="font-mono font-bold text-emerald-400">Synchronized Verification</span>
      </div>
    </div>
  );
}
