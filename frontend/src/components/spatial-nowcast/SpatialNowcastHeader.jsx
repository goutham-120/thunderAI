import React from 'react';
import { 
  Layers, 
  ChevronDown, 
  RefreshCw,
  Clock
} from 'lucide-react';

export default function SpatialNowcastHeader({
  selectedRegion,
  setSelectedRegion,
  onRefresh,
  isRefreshing,
  forecastData,
  isLoading
}) {
  const timestamps = forecastData?.timestamps || {};
  const obsTime = forecastData?.timestamp || timestamps.observation_time;
  const validTime = timestamps.forecast_valid_time;

  return (
    <header className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3 font-sans text-[#12324E]">
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Title & Subtitle */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7] shrink-0">
            <Layers className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[#0F2942] tracking-tight font-mono uppercase truncate">
              Spatial Nowcast
            </h1>

            <p className="text-xs text-[#47637E] font-sans mt-0.5 truncate">
              Geospatial thunderstorm and precipitation forecasting.
            </p>
          </div>
        </div>

        {/* Sector Selector & Refresh Button */}
        <div className="flex items-center space-x-3 shrink-0">
          
          {/* Sector Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#47637E] uppercase shrink-0">
              Sector:
            </span>
            <div className="relative font-mono">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-[#EEF6FB] border border-[#D0E3F0] text-[#0F2942] text-xs rounded-lg px-3 py-1.5 appearance-none focus:outline-hidden focus:border-[#0284C7] font-mono font-bold pr-8 max-w-[220px] shadow-2xs cursor-pointer truncate"
              >
                <optgroup label="Popular Regions">
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Odisha">Odisha</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Delhi">Delhi (NCT)</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                </optgroup>
                <optgroup label="States">
                  {['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
                <optgroup label="Union Territories">
                  {['Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'].map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
                <optgroup label="Radar Composites">
                  <option value="All India Composite">All India Composite</option>
                  <option value="Andhra Pradesh & Telangana">Andhra Pradesh & Telangana</option>
                  <option value="East Coast (Odisha & WB)">East Coast (Odisha & WB)</option>
                  <option value="South Interior Karnataka">South Interior Karnataka</option>
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#47637E] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7] hover:bg-[#0284C7] hover:text-white transition-all text-xs font-mono font-bold shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Fetch latest spatial nowcast snapshot"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

      </div>

      {/* Forecast Timestamp Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#47637E] pt-2 border-t border-[#D0E3F0]/80 gap-2">
        <div className="flex items-center space-x-4">
          <div>
            <span className="text-[#0F2942] font-semibold">Observed:</span>{' '}
            {obsTime ? new Date(obsTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
          </div>

          {validTime && (
            <div>
              <span className="text-[#0F2942] font-semibold">Valid Until:</span>{' '}
              <span className="text-[#0284C7] font-bold">
                {new Date(validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] flex items-center gap-1 text-[#47637E]">
          <Clock className="w-3 h-3 text-[#0284C7]" /> Forecast Lead Time Active
        </div>
      </div>

    </header>
  );
}
