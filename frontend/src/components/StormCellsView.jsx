import React from 'react';
import { Flame, Navigation } from 'lucide-react';

export default function StormCellsView({ forecastData, selectedCell, onSelectCell }) {
  const cells = forecastData?.storm_cells || [];

  return (
    <div className="space-y-4 font-sans text-[#0F2942]">
      {/* View Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-[#0F2942] flex items-center gap-2 font-mono">
            <Flame className="w-4 h-4 text-[#DC2626]" />
            TRACKED CONVECTIVE STORM CELLS
          </h2>
          <p className="text-xs text-[#47637E] font-mono">
            TITAN / SCIT Segmented Convective Clusters & Velocity Vectors
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-[#EEF6FB] text-[#0284C7] px-3 py-1 rounded-md border border-[#D0E3F0]">
          {cells.length} Active Clusters
        </span>
      </div>

      {/* Cells Technical Table */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#EEF6FB] text-[#47637E] border-b border-[#D0E3F0] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">CELL ID</th>
                <th className="p-3.5">INTENSITY (dBZ)</th>
                <th className="p-3.5">MOVEMENT VECTOR</th>
                <th className="p-3.5">SPEED (km/h)</th>
                <th className="p-3.5">THUNDERSTORM PROB</th>
                <th className="p-3.5">LIGHTNING PROB</th>
                <th className="p-3.5">LIFECYCLE STAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAF0] bg-[#F8FCFE] text-[#0F2942]">
              {cells.length > 0 ? (
                cells.map((cell) => {
                  const isSelected = selectedCell?.cell_id === cell.cell_id;
                  return (
                    <tr
                      key={cell.cell_id}
                      onClick={() => onSelectCell && onSelectCell(cell)}
                      className={`cursor-pointer transition-all hover:bg-[#EEF6FB] ${
                        isSelected ? 'bg-[#D4E6F5] text-[#0F2942] font-bold border-l-4 border-[#0284C7]' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-[#0284C7]">{cell.cell_id}</td>
                      <td className="p-3.5 font-bold text-[#DC2626]">{cell.max_dbz || 48} dBZ</td>
                      <td className="p-3.5 text-[#0F2942] flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#0284C7] transform" style={{ transform: `rotate(${cell.heading_deg || 135}deg)` }} />
                        {cell.heading_deg || 135}° ({cell.direction || 'SE'})
                      </td>
                      <td className="p-3.5 font-mono text-[#47637E]">{cell.speed_kmh || 24} km/h</td>
                      <td className="p-3.5 text-[#059669] font-bold">{cell.p_thunderstorm || 78}%</td>
                      <td className="p-3.5 text-[#D97706] font-bold">
                        <div>
                          <span>{cell.p_lightning || 64}%</span>
                          {cell.flash_rate_accel_min2 && (
                            <span className="text-[9px] text-[#D97706] block font-mono">
                              +{cell.flash_rate_accel_min2}/min
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] inline-block max-w-fit">
                            {cell.lifecycle_stage || 'MATURE CONVECTIVE'}
                          </span>
                          {cell.is_lightning_jump && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] inline-block max-w-fit">
                              ⚡ LIGHTNING JUMP
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#7B96B0] italic">
                    No active convective storm cells tracked in current footprint.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
