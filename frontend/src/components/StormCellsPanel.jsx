import React from 'react';
import { 
  Radio, 
  Zap, 
  Wind, 
  ChevronRight,
  CloudLightning
} from 'lucide-react';

export default function StormCellsPanel({ 
  stormCells, 
  selectedCell, 
  onSelectCell 
}) {
  if (!stormCells || stormCells.length === 0) {
    return (
      <div className="meteo-card p-4 rounded-2xl border border-[#D0E3F0] text-center text-[#5E82A6] text-xs font-sans">
        No severe convective storm cells currently tracked in radar footprint.
      </div>
    );
  }

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'EXTREME':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'SEVERE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-sky-100 text-[#12324E] border-sky-200';
    }
  };

  return (
    <div className="meteo-card p-4 rounded-2xl border border-[#D0E3F0] shadow-sm flex flex-col h-full bg-[#F8FCFE] font-sans">
      {/* Panel Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#D0E3F0] mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-red-100 text-red-600 border border-red-200">
            <CloudLightning className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-sora font-semibold text-[#12324E] uppercase tracking-wider">
              Active Storm Cells
            </h3>
            <p className="text-[10px] text-[#5E82A6] font-medium font-sans">
              TITAN/SCIT-Segmented Convective Clusters
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold bg-[#EEF6FB] text-[#12324E] px-2.5 py-0.5 rounded-full border border-[#D0E3F0]">
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
                  ? 'bg-sky-50 border-[#0284C7] shadow-xs'
                  : 'bg-white hover:bg-[#EEF6FB] border-[#D0E3F0]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-[#12324E] font-mono">
                    {cell.cell_id}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border font-mono ${getSeverityBadge(cell.severity)}`}>
                    {cell.lifecycle_state}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#0284C7] translate-x-0.5' : 'text-[#5E82A6]'}`} />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-[#EEF6FB] p-2 rounded-lg border border-[#D0E3F0]">
                <div>
                  <span className="text-[9px] text-[#5E82A6] block font-sans">Max dBZ</span>
                  <span className="font-bold text-red-600 flex items-center gap-0.5">
                    <Radio className="w-3 h-3 text-red-600" />
                    {cell.max_dbz}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#5E82A6] block font-sans">Motion</span>
                  <span className="font-bold text-[#12324E] flex items-center gap-0.5">
                    <Wind className="w-3 h-3 text-[#0284C7]" />
                    {cell.movement.speed_kmh}k {cell.movement.direction_compass}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] text-[#5E82A6] block font-sans">Lightning</span>
                  <span className="font-bold text-amber-600 flex items-center gap-0.5">
                    <Zap className="w-3 h-3 text-amber-600" />
                    {cell.lightning_flash_rate_min}/m
                  </span>
                </div>
              </div>

              {/* Coordinates & Cloud-top footer */}
              <div className="flex items-center justify-between text-[10px] text-[#5E82A6] mt-2 font-mono">
                <span>{cell.center.lat}°N, {cell.center.lon}°E</span>
                <span className="text-[#0284C7] font-semibold">T_top: {cell.min_cloud_top_c}°C</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
