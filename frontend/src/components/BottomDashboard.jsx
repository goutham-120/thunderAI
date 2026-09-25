import React, { useState } from 'react';
import { 
  CloudRain, 
  Wind, 
  Thermometer, 
  Gauge, 
  Droplets, 
  TrendingUp, 
  ArrowUp, 
  ArrowRight, 
  ArrowDown, 
  AlertTriangle, 
  Info,
  Clock
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export default function BottomDashboard({
  forecastData,
  horizonMin,
  setHorizonMin,
  onOpenAlerts,
  onOpenBenchmark
}) {
  const [probTab, setProbTab] = useState('thunderstorm'); // 'thunderstorm', 'lightning', 'rainfall'

  // Dynamic Probability Curve from backend or fallback to computed series
  const curves = forecastData?.probability_curves || {
    thunderstorm: [
      { time: '0m', val: 70 }, { time: '15m', val: 82 }, { time: '30m', val: 87 },
      { time: '45m', val: 85 }, { time: '60m', val: 74 }, { time: '90m', val: 62 },
      { time: '120m', val: 48 }, { time: '180m', val: 32 }
    ],
    lightning: [
      { time: '0m', val: 65 }, { time: '15m', val: 88 }, { time: '30m', val: 92 },
      { time: '45m', val: 89 }, { time: '60m', val: 78 }, { time: '90m', val: 55 },
      { time: '120m', val: 35 }, { time: '180m', val: 20 }
    ],
    rainfall: [
      { time: '0m', val: 25 }, { time: '15m', val: 55 }, { time: '30m', val: 75 },
      { time: '45m', val: 70 }, { time: '60m', val: 45 }, { time: '90m', val: 25 },
      { time: '120m', val: 12 }, { time: '180m', val: 5 }
    ]
  };

  const chartData = curves[probTab] || curves.thunderstorm;
  const chartStroke = probTab === 'thunderstorm' ? '#f43f5e' : probTab === 'lightning' ? '#f59e0b' : '#38bdf8';

  const filmstripSteps = [
    { label: 'Now', time: '15:40', h: 0 },
    { label: '+ 15 min', time: '15:55', h: 15 },
    { label: '+ 30 min', time: '16:10', h: 30 },
    { label: '+ 45 min', time: '16:25', h: 45 },
    { label: '+ 60 min', time: '16:40', h: 60 },
    { label: '+ 90 min', time: '17:10', h: 90 },
    { label: '+ 120 min', time: '17:40', h: 120 },
    { label: '+ 180 min', time: '18:40', h: 180 }
  ];

  // Dynamic Atmospheric conditions from backend tensor
  const atmos = forecastData?.atmospheric_conditions || {
    temperature_c: 29.0,
    relative_humidity_percent: 78.0,
    cape_jkg: 1840,
    wind_speed_direction: "SE 18 km/h",
    pressure_hpa: 1004,
    precipitable_water_mm: 52
  };

  // Dynamic Storm Cells from backend
  const backendCells = forecastData?.storm_cells?.map((c, i) => ({
    id: c.cell_id || `SC-0${i+1}`,
    lat: `${c.center.lat.toFixed(2)} N`,
    lon: `${c.center.lon.toFixed(2)} E`,
    dbz: c.max_dbz,
    area: c.area_km2,
    lightning: Math.round(c.lightning_flash_rate_min * 4.5),
    dir: c.movement.direction_compass,
    speed: `${c.movement.speed_kmh} km/h`,
    trend: c.max_dbz > 50 ? 'up' : c.max_dbz > 40 ? 'right' : 'down',
    status: c.lifecycle_state,
    statusCol: c.severity === 'EXTREME' 
      ? 'bg-red-500/20 text-red-400 border-red-500/30'
      : c.severity === 'SEVERE'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  })) || [
    { id: 'SC-01', lat: '17.42 N', lon: '78.38 E', dbz: 62, area: 340, lightning: 128, dir: 'SE', speed: '24 km/h', trend: 'up', status: 'Intensifying', statusCol: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { id: 'SC-02', lat: '17.10 N', lon: '79.00 E', dbz: 58, area: 290, lightning: 76, dir: 'E', speed: '21 km/h', trend: 'right', status: 'Stable', statusCol: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { id: 'SC-03', lat: '16.85 N', lon: '79.32 E', dbz: 46, area: 180, lightning: 12, dir: 'SE', speed: '18 km/h', trend: 'down', status: 'Weakening', statusCol: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
  ];

  return (
    <div className="space-y-4">
      {/* 1. MIDDLE ROW: Timeline Filmstrip + Probability Chart + Atmospheric Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Forecast Timeline Filmstrip (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              FORECAST TIMELINE <span className="text-slate-500 font-normal font-sans">(Lead-time Progression)</span>
            </span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
            {filmstripSteps.map((step, idx) => {
              const isSelected = horizonMin === step.h;
              return (
                <div 
                  key={idx}
                  onClick={() => setHorizonMin(step.h === 0 ? 15 : step.h)}
                  className={`flex flex-col items-center p-1 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-950/80 border-cyan-400 ring-1 ring-cyan-400/40 shadow-xs' 
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-300 font-mono">{step.label}</span>
                  <span className="text-[8px] font-mono text-slate-500 mb-1">{step.time}</span>
                  <div className="w-full h-12 rounded-lg bg-slate-950 overflow-hidden relative border border-slate-800 flex items-center justify-center">
                    <div 
                      className="w-7 h-7 rounded-full filter blur-[2px]"
                      style={{
                        background: idx < 4 
                          ? 'radial-gradient(circle, #f43f5e 20%, #f97316 50%, #22c55e 80%)'
                          : 'radial-gradient(circle, #f97316 20%, #eab308 50%, #06b6d4 80%)',
                        opacity: Math.max(0.3, 1.0 - (idx * 0.08))
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Probability Chart (4 cols) */}
        <div className="lg:col-span-4 bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              PROBABILITY EVOLUTION <span className="text-slate-500 font-normal font-sans">(0 - 180 min)</span>
            </span>
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button 
                onClick={() => setProbTab('thunderstorm')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  probTab === 'thunderstorm' ? 'bg-rose-600 text-white' : 'text-slate-400'
                }`}
              >
                Thunderstorm
              </button>
              <button 
                onClick={() => setProbTab('lightning')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  probTab === 'lightning' ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Lightning
              </button>
              <button 
                onClick={() => setProbTab('rainfall')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  probTab === 'rainfall' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Rainfall
              </button>
            </div>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#475569" fontSize={9} />
                <YAxis stroke="#475569" fontSize={9} domain={[0, probTab === 'rainfall' ? 80 : 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px' }} />
                <Line type="monotone" dataKey="val" stroke={chartStroke} strokeWidth={2.5} dot={{ r: 3, fill: chartStroke }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atmospheric Conditions (3 cols) */}
        <div className="lg:col-span-3 bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              ATMOSPHERIC CONDITIONS <span className="text-slate-500 font-normal font-sans">(Live Tensor)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <Thermometer className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">Temperature</span>
                <span className="font-bold text-slate-200 font-mono">{atmos.temperature_c}°C</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <Wind className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">Wind (10 m)</span>
                <span className="font-bold text-slate-200 font-mono">{atmos.wind_speed_direction}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">Relative Humidity</span>
                <span className="font-bold text-slate-200 font-mono">{atmos.relative_humidity_percent}%</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">Pressure</span>
                <span className="font-bold text-slate-200 font-mono">{atmos.pressure_hpa} hPa</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">CAPE</span>
                <span className="font-bold text-amber-400 font-mono">{atmos.cape_jkg} J/kg</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800/80">
              <CloudRain className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[9px] text-slate-400 block">Precipitable Water</span>
                <span className="font-bold text-emerald-400 font-mono">{atmos.precipitable_water_mm} mm</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. BOTTOM ROW: Detected Storm Cells Table + Alerts & Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Detected Storm Cells Table (8 cols) */}
        <div className="lg:col-span-8 bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              DETECTED STORM CELLS <span className="text-cyan-400 font-mono">({backendCells.length})</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Location (Lat, Lon)</th>
                  <th className="p-2">Max dBZ</th>
                  <th className="p-2">Area (km²)</th>
                  <th className="p-2">Lightning (30m)</th>
                  <th className="p-2">Movement</th>
                  <th className="p-2">Speed</th>
                  <th className="p-2">Trend</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                {backendCells.map((cell, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2 font-bold text-white">{cell.id}</td>
                    <td className="p-2 text-slate-400">{cell.lat}, {cell.lon}</td>
                    <td className="p-2 font-bold text-red-400">{cell.dbz}</td>
                    <td className="p-2">{cell.area}</td>
                    <td className="p-2 text-amber-400 font-bold">{cell.lightning}</td>
                    <td className="p-2">{cell.dir}</td>
                    <td className="p-2">{cell.speed}</td>
                    <td className="p-2">
                      {cell.trend === 'up' && <ArrowUp className="w-3.5 h-3.5 text-red-400" />}
                      {cell.trend === 'right' && <ArrowRight className="w-3.5 h-3.5 text-amber-400" />}
                      {cell.trend === 'down' && <ArrowDown className="w-3.5 h-3.5 text-blue-400" />}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cell.statusCol}`}>
                        {cell.status}
                      </span>
                    </td>
                    <td className="p-2 text-cyan-400">●──●──●</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts & Warnings Panel (4 cols) */}
        <div className="lg:col-span-4 bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              ALERTS & WARNINGS
            </span>
            <button 
              onClick={onOpenAlerts}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">High lightning risk over region</span>
                  <span className="text-[9px] text-slate-400 font-mono">15:40 IST</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold bg-red-500 text-white px-2 py-0.5 rounded-md">
                High
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">Thunderstorm likely in 15–30 minutes</span>
                  <span className="text-[9px] text-slate-400 font-mono">15:35 IST</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md">
                Moderate
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold text-slate-200 block">Heavy rainfall possible (30–60 mm/hr)</span>
                  <span className="text-[9px] text-slate-400 font-mono">15:30 IST</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                Advisory
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
