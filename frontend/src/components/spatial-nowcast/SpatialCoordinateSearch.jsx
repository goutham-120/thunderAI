import React, { useState, useEffect } from 'react';
import { Search, MapPin, AlertCircle, Crosshair } from 'lucide-react';

export default function SpatialCoordinateSearch({
  selectedLocation,
  onLocationSelect
}) {
  const [latInput, setLatInput] = useState(selectedLocation?.lat || '18.1124');
  const [lonInput, setLonInput] = useState(selectedLocation?.lon || '79.0193');
  const [validationError, setValidationError] = useState('');

  // Keep local inputs synchronized when user clicks on the map
  useEffect(() => {
    if (selectedLocation?.lat && selectedLocation?.lon) {
      setLatInput(String(selectedLocation.lat));
      setLonInput(String(selectedLocation.lon));
      setValidationError('');
    }
  }, [selectedLocation]);

  const handleCoordinateSearch = (e) => {
    e?.preventDefault();
    setValidationError('');

    const parsedLat = parseFloat(latInput);
    const parsedLon = parseFloat(lonInput);

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setValidationError('Please enter valid numeric values for both Latitude and Longitude.');
      return;
    }

    if (parsedLat < -90 || parsedLat > 90) {
      setValidationError('Latitude must be between -90.0000° and +90.0000°.');
      return;
    }

    if (parsedLon < -180 || parsedLon > 180) {
      setValidationError('Longitude must be between -180.0000° and +180.0000°.');
      return;
    }

    if (onLocationSelect) {
      onLocationSelect({
        name: `Target (${parsedLat.toFixed(4)}°N, ${parsedLon.toFixed(4)}°E)`,
        lat: parsedLat.toFixed(4),
        lon: parsedLon.toFixed(4),
        isUserSearch: true
      });
    }
  };

  const handlePresetSelect = (presetName, lat, lon) => {
    setLatInput(String(lat));
    setLonInput(String(lon));
    setValidationError('');

    if (onLocationSelect) {
      onLocationSelect({
        name: presetName,
        lat: String(lat),
        lon: String(lon),
        isUserSearch: true
      });
    }
  };

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-3 rounded-xl shadow-xs space-y-2 font-sans text-[#12324E]">
      
      <form onSubmit={handleCoordinateSearch} className="flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Title */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <Crosshair className="w-4 h-4 text-[#0284C7]" />
          <span className="text-xs font-mono font-bold text-[#0F2942] uppercase">
            Exact Point Search:
          </span>
        </div>

        {/* Inputs Group */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Latitude */}
          <div className="flex items-center space-x-1">
            <label className="text-[11px] font-mono text-[#47637E] font-semibold">Lat:</label>
            <input
              type="text"
              value={latInput}
              onChange={(e) => {
                setLatInput(e.target.value);
                setValidationError('');
              }}
              placeholder="-90 to 90"
              className="bg-white border border-[#D0E3F0] text-[#0F2942] text-xs font-mono font-bold rounded-lg px-2.5 py-1 w-24 focus:outline-hidden focus:border-[#0284C7] shadow-2xs"
            />
          </div>

          {/* Longitude */}
          <div className="flex items-center space-x-1">
            <label className="text-[11px] font-mono text-[#47637E] font-semibold">Lon:</label>
            <input
              type="text"
              value={lonInput}
              onChange={(e) => {
                setLonInput(e.target.value);
                setValidationError('');
              }}
              placeholder="-180 to 180"
              className="bg-white border border-[#D0E3F0] text-[#0F2942] text-xs font-mono font-bold rounded-lg px-2.5 py-1 w-24 focus:outline-hidden focus:border-[#0284C7] shadow-2xs"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-[#0284C7] text-white text-xs font-mono font-bold hover:bg-[#0369A1] transition-all shadow-2xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Go to Point</span>
          </button>
        </div>

        {/* Quick Location Presets */}
        <div className="flex items-center space-x-1 text-[11px] font-mono text-[#47637E] shrink-0">
          <span className="text-[10px] uppercase font-bold mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => handlePresetSelect('Hyderabad', 17.3850, 78.4867)}
            className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0] text-[#0F2942] hover:bg-[#0284C7] hover:text-white transition-all text-[10px] font-bold cursor-pointer"
          >
            Hyderabad
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('Bhubaneswar', 20.2961, 85.8245)}
            className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0] text-[#0F2942] hover:bg-[#0284C7] hover:text-white transition-all text-[10px] font-bold cursor-pointer"
          >
            Bhubaneswar
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect('Bengaluru', 12.9716, 77.5946)}
            className="px-2 py-0.5 rounded bg-[#EEF6FB] border border-[#D0E3F0] text-[#0F2942] hover:bg-[#0284C7] hover:text-white transition-all text-[10px] font-bold cursor-pointer"
          >
            Bengaluru
          </button>
        </div>

      </form>

      {/* Validation Error Message */}
      {validationError && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] px-3 py-1.5 rounded-lg text-xs font-mono text-[#991B1B] flex items-center space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

    </div>
  );
}
