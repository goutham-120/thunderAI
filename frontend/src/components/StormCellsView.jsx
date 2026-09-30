import React from 'react';
import { CloudLightning, Navigation } from 'lucide-react';

export default function StormCellsView({ forecastData, selectedCell, onSelectCell }) {
  const cells = forecastData?.storm_cells || [];

  return (
    <div className="space-y-4 font-sans text-[#12324E]">
      {/* View Header */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-lg flex items-center justify-between shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-[#12324E] flex items-center gap-2 font-sora">
            <CloudLightning className="w-4 h-4 text-[#DC2626]" />
            TRACKED CONVECTIVE STORM CELLS
          </h2>
          <p className="text-xs text-[#5E82A6] font-sans">
            TITAN / SCIT Segmented Convective Clusters & Velocity Vectors
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-[#EEF6FB] text-[#0284C7] px-3 py-1 rounded-md border border-[#D0E3F0]">
          {cells.length} Active Clusters
        </span>
      </div>

      {/* Cells Technical Table */}
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#EEF6FB] text-[#5E82A6] border-b border-[#D0E3F0] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 font-sans">CELL ID</th>
                <th className="p-3.5 font-sans">INTENSITY (dBZ)</th>
                <th className="p-3.5 font-sans">MOVEMENT VECTOR</th>
                <th className="p-3.5 font-sans">SPEED (km/h)</th>
                <th className="p-3.5 font-sans">THUNDERSTORM PROB</th>
                <th className="p-3.5 font-sans">LIGHTNING PROB</th>
                <th className="p-3.5 font-sans">LIFECYCLE STAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0E3F0] bg-[#F8FCFE] text-[#12324E]">
              {cells.length > 0 ? (
                cells.map((cell) => {
                  const isSelected = selectedCell?.cell_id === cell.cell_id;
                  return (
                    <tr
                      key={cell.cell_id}
                      onClick={() => onSelectCell && onSelectCell(cell)}
                      className={`cursor-pointer transition-all hover:bg-[#EEF6FB] ${
                        isSelected ? 'bg-[#E0F2FE] text-[#12324E] font-bold border-l-4 border-[#0284C7]' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-[#0284C7] font-sans">{cell.cell_id}</td>
                      <td className="p-3.5 font-bold text-[#DC2626]">{cell.max_dbz || 48} dBZ</td>
                      <td className="p-3.5 text-[#12324E] flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#0284C7] transform" style={{ transform: `rotate(${cell.heading_deg || 135}deg)` }} />
                        {cell.heading_deg || 135}° ({cell.direction || 'SE'})
                      </td>
                      <td className="p-3.5 font-mono text-[#5E82A6]">{cell.speed_kmh || 24} km/h</td>
                      <td className="p-3.5 text-[#047857] font-bold">{cell.p_thunderstorm || 78}%</td>
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
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] inline-block max-w-fit font-sans">
                            {cell.lifecycle_stage || 'MATURE CONVECTIVE'}
                          </span>
                          {cell.is_lightning_jump && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] inline-block max-w-fit font-mono">
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
                  <td colSpan={7} className="p-6 text-center text-[#5E82A6] font-sans">
                    <div className="space-y-1 font-mono text-xs">
                      <span className="font-bold uppercase text-[#0F2942] block">
                        {forecastData?.radar_status === 'OUT_OF_COVERAGE' 
                          ? 'RADAR DATA SOURCE OUTSIDE REQUESTED REGION'
                          : forecastData?.radar_status === 'UNAVAILABLE'
                          ? 'REGIONAL RADAR TELEMETRY UNAVAILABLE'
                          : 'NO CONVECTIVE STORM CELLS DETECTED'}
                      </span>
                      <p className="text-[11px] font-sans italic text-[#5E82A6]">
                        {forecastData?.radar_coverage_message || 'No active convective storm cells tracked in current footprint (Threshold: dBZ ≥ 35.0).'}
                      </p>
                    </div>
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
