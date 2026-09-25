import React from 'react';
import { 
  Radio, 
  Zap, 
  Wind, 
  ChevronRight,
  Flame
} from 'lucide-react';

export default function StormCellsPanel({ 
  stormCells, 
  selectedCell, 
  onSelectCell 
}) {
  if (!stormCells || stormCells.length === 0) {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
        No severe convective storm cells currently tracked in radar footprint.
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'EXTREME':
        return 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_8px_rgba(239,68,68,0.2)]';
      case 'SEVERE':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-slate-800/90 shadow-xl flex flex-col h-full">
      {/* Panel Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Active Storm Cells
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">
              TITAN/SCIT-Segmented Convective Clusters
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
          {stormCells.length} Tracked
        </span>
      </div>

      {/* Cells List */}
      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[380px]">
        {stormCells.map((cell) => {
          const isSelected = selectedCell?.cell_id === cell.cell_id;
          return (
            <div
              key={cell.cell_id}
              onClick={() => onSelectCell(cell)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-950/70 border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-white font-mono">
                    {cell.cell_id}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border font-mono ${getSeverityBadge(cell.severity)}`}>
                    {cell.lifecycle_state}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-0.5' : 'text-slate-500'}`} />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                <div>
                  <span className="text-[9px] text-slate-400 block font-sans">Max dBZ</span>
                  <span className="font-bold text-red-400 flex items-center gap-0.5">
                    <Radio className="w-3 h-3 text-red-400" />
                    {cell.max_dbz}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 block font-sans">Motion</span>
                  <span className="font-bold text-slate-300 flex items-center gap-0.5">
                    <Wind className="w-3 h-3 text-cyan-400" />
                    {cell.movement.speed_kmh}k {cell.movement.direction_compass}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-slate-400 block font-sans">Lightning</span>
                  <span className="font-bold text-amber-400 flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {cell.lightning_flash_rate_min}/m
                  </span>
                </div>
              </div>

              {/* Coordinates & Cloud-top footer */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span>{cell.center.lat}°N, {cell.center.lon}°E</span>
                <span className="text-cyan-400 font-semibold">T_top: {cell.min_cloud_top_c}°C</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
