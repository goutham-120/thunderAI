/**
 * VAJRA-AI — What-If Weather Scenario Page
 *
 * PURPOSE: Let the user enter hypothetical atmospheric conditions and see
 * how the existing VAJRA-AI nowcasting system would respond.
 *
 * DATA INTEGRITY RULES (enforced throughout this file):
 *  - All outputs are labelled WHAT-IF / SIMULATION.
 *  - No result is ever presented as a real observation or live forecast.
 *  - No real CAP alert is generated or displayed.
 *  - The live forecast state in App.jsx is never read or mutated here.
 */

import React, { useState } from 'react';
import {
  FlaskConical, Play, RotateCcw, AlertTriangle, CheckCircle2,
  Thermometer, Droplets, Wind, Zap, BarChart2, Activity,
  Info, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import api from '../services/api';

// Supported forecast horizons (must match backend config.HORIZONS_MINUTES)
const HORIZONS = [15, 30, 45, 60, 90, 120, 180];

const DEFAULT_INPUTS = {
  temperature_c: 28.5,
  relative_humidity_percent: 75,
  cape_jkg: 1800,
  cin_jkg: 25,
  wind_speed_kmh: 20,
  wind_direction: 'SE',
  wind_shear_ms: 15,
  precipitable_water_mm: 50,
  radar_dbz: 45,
  cloud_top_temp_c: -55,
  lightning_flash_rate_min: 10,
  horizon_min: 30,
};

const FIELDS = [
  { key: 'temperature_c',             label: 'Temperature',         unit: 'C',            min: -20,  max: 55,   step: 0.5,  icon: Thermometer, tip: 'Surface air temperature' },
  { key: 'relative_humidity_percent', label: 'Relative Humidity',   unit: '%',            min: 0,    max: 100,  step: 1,    icon: Droplets,    tip: 'Near-surface relative humidity' },
  { key: 'cape_jkg',                  label: 'CAPE',                unit: 'J/kg',         min: 0,    max: 6000, step: 50,   icon: Activity,    tip: 'Convective Available Potential Energy' },
  { key: 'cin_jkg',                   label: 'CIN',                 unit: 'J/kg',         min: 0,    max: 500,  step: 5,    icon: Activity,    tip: 'Convective INhibition' },
  { key: 'wind_speed_kmh',            label: 'Wind Speed (10 m)',   unit: 'km/h',         min: 0,    max: 200,  step: 1,    icon: Wind,        tip: '10-metre wind speed' },
  { key: 'wind_shear_ms',             label: 'Wind Shear (0-6 km)', unit: 'm/s',          min: 0,    max: 60,   step: 0.5,  icon: Wind,        tip: 'Deep-layer wind shear magnitude' },
  { key: 'precipitable_water_mm',     label: 'Precipitable Water',  unit: 'mm',           min: 0,    max: 100,  step: 1,    icon: Droplets,    tip: 'Total column precipitable water' },
  { key: 'radar_dbz',                 label: 'Radar Reflectivity',  unit: 'dBZ',          min: 0,    max: 75,   step: 0.5,  icon: BarChart2,   tip: 'Peak Doppler radar reflectivity' },
  { key: 'cloud_top_temp_c',          label: 'Cloud-Top Temp',      unit: 'C',            min: -100, max: 30,   step: 1,    icon: Thermometer, tip: 'Satellite IR cloud-top brightness temperature' },
  { key: 'lightning_flash_rate_min',  label: 'Lightning Flash Rate','unit': 'fl/min',     min: 0,    max: 100,  step: 0.5,  icon: Zap,         tip: 'Lightning flash rate from detection network' },
];

const THREAT_COLOURS = {
  CRITICAL: { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', text: 'text-[#991B1B]', badge: 'bg-[#DC2626] text-white' },
  HIGH:     { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', text: 'text-[#92400E]', badge: 'bg-[#D97706] text-white' },
  MODERATE: { bg: 'bg-[#F5F3FF]', border: 'border-[#DDD6FE]', text: 'text-[#5B21B6]', badge: 'bg-[#7C3AED] text-white' },
  LOW:      { bg: 'bg-[#ECFDF5]', border: 'border-[#A7F3D0]', text: 'text-[#047857]', badge: 'bg-[#047857] text-white' },
};

function validateInputs(inputs) {
  const errors = {};
  FIELDS.forEach(({ key, label, min, max }) => {
    const v = parseFloat(inputs[key]);
    if (isNaN(v)) { errors[key] = `${label} must be a number.`; }
    else if (v < min || v > max) { errors[key] = `${label}: ${min} to ${max}.`; }
  });
  if (!HORIZONS.includes(Number(inputs.horizon_min))) {
    errors.horizon_min = `Select one of: ${HORIZONS.join(', ')} min.`;
  }
  return errors;
}

function MetricCard({ label, value, unit, colour }) {
  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[10px] text-[#5E82A6] uppercase tracking-wider font-mono">{label}</span>
      <span className={`text-2xl font-bold font-mono ${colour || 'text-[#0284C7]'}`}>{value}</span>
      <span className="text-[11px] text-[#5E82A6] font-sans">{unit}</span>
    </div>
  );
}

function XAIDriverBar({ driver }) {
  const pct = Math.round(driver.impact_percent);
  const colour =
    driver.status === 'CRITICAL'  ? '#DC2626' :
    driver.status === 'HIGH'      ? '#D97706' :
    driver.status === 'FAVORABLE' ? '#0284C7' : '#047857';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-sans">
        <span className="font-medium text-[#12324E]">{driver.feature}</span>
        <span className="font-mono text-[#0284C7]">{driver.value}</span>
      </div>
      <div className="h-2 rounded-full bg-[#E0EEF7] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: colour }} />
      </div>
      <div className="flex justify-between text-[10px] text-[#5E82A6] font-mono">
        <span>{driver.trend}</span>
        <span>{pct}% impact</span>
      </div>
    </div>
  );
}

export default function WhatIfView() {
  const [inputs, setInputs]     = useState({ ...DEFAULT_INPUTS });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [apiError, setApiError] = useState(null);
  const [showXAI, setShowXAI]   = useState(false);

  function handleChange(key, value) {
    setInputs(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  }

  function handleReset() {
    setInputs({ ...DEFAULT_INPUTS });
    setErrors({});
    setResult(null);
    setApiError(null);
  }

  async function handleRun() {
    const ve = validateInputs(inputs);
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    setLoading(true);
    setResult(null);
    setApiError(null);
    try {
      const body = {
        temperature_c:             parseFloat(inputs.temperature_c),
        relative_humidity_percent: parseFloat(inputs.relative_humidity_percent),
        cape_jkg:                  parseFloat(inputs.cape_jkg),
        cin_jkg:                   parseFloat(inputs.cin_jkg),
        wind_speed_kmh:            parseFloat(inputs.wind_speed_kmh),
        wind_direction:            inputs.wind_direction,
        wind_shear_ms:             parseFloat(inputs.wind_shear_ms),
        precipitable_water_mm:     parseFloat(inputs.precipitable_water_mm),
        radar_dbz:                 parseFloat(inputs.radar_dbz),
        cloud_top_temp_c:          parseFloat(inputs.cloud_top_temp_c),
        lightning_flash_rate_min:  parseFloat(inputs.lightning_flash_rate_min),
        horizon_min:               parseInt(inputs.horizon_min),
      };
      const data = await api.postWhatIf(body);
      if (data?.mode !== 'WHAT_IF') throw new Error('Unexpected response mode from server.');
      setResult(data);
    } catch (err) {
      setApiError(err.message || 'Backend request failed. Ensure the server is running.');
    } finally {
      setLoading(false);
    }
  }

  const tc = result ? (THREAT_COLOURS[result.simulated_response?.threat_level] || THREAT_COLOURS.LOW) : null;

  return (
    <div className="space-y-5 font-sans max-w-[1400px] mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between bg-[#F8FCFE] border border-[#D0E3F0] px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F2942] font-mono tracking-tight uppercase flex items-center gap-2">
              What-If Weather Scenario
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#7C3AED] text-white font-sans font-semibold">
                SIMULATION ONLY
              </span>
            </h1>
            <p className="text-xs text-[#47637E] font-sans">
              Enter hypothetical atmospheric conditions and see how the VAJRA-AI nowcasting system responds.
            </p>
          </div>
        </div>
      </div>

      {/* Simulation disclaimer */}
      <div className="flex items-start gap-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl px-4 py-3 text-xs text-[#92400E] font-sans">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#D97706]" />
        <span>
          <strong>SIMULATION MODE — NOT A REAL FORECAST.</strong> All results are hypothetical and completely isolated from the live operational nowcast.
          Must not be used for emergency decision-making. No actual CAP warning is generated.
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* LEFT: Input panel */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4 space-y-4">
            <h2 className="text-xs font-bold text-[#0F2942] font-mono uppercase tracking-wide">Hypothetical Conditions</h2>

            <div className="space-y-3">
              {FIELDS.map(({ key, label, unit, min, max, step, icon: Icon, tip }) => (
                <div key={key}>
                  <label className="flex items-center justify-between text-[11px] font-medium text-[#47637E] mb-1">
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3 h-3 text-[#5E82A6]" />
                      {label}
                    </span>
                    <span className="font-mono text-[#0284C7] font-bold">{inputs[key]} {unit}</span>
                  </label>
                  <input
                    id={`whatif-${key}`}
                    type="range" min={min} max={max} step={step} value={inputs[key]}
                    onChange={e => handleChange(key, e.target.value)}
                    className="w-full h-1.5 accent-[#0284C7] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#A0B5C8] font-mono mt-0.5">
                    <span>{min}</span>
                    <span className="text-center truncate mx-2">{tip}</span>
                    <span>{max}</span>
                  </div>
                  {errors[key] && <p className="text-[10px] text-[#DC2626] mt-0.5">{errors[key]}</p>}
                </div>
              ))}
            </div>

            {/* Wind direction */}
            <div>
              <label htmlFor="whatif-wind-dir" className="text-[11px] font-medium text-[#47637E] block mb-1">Wind Direction</label>
              <select
                id="whatif-wind-dir"
                value={inputs.wind_direction}
                onChange={e => handleChange('wind_direction', e.target.value)}
                className="w-full bg-white border border-[#D0E3F0] text-[#0F2942] text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                {['N','NE','E','SE','S','SW','W','NW'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Horizon */}
            <div>
              <label htmlFor="whatif-horizon" className="text-[11px] font-medium text-[#47637E] block mb-1">Forecast Horizon</label>
              <select
                id="whatif-horizon"
                value={inputs.horizon_min}
                onChange={e => handleChange('horizon_min', Number(e.target.value))}
                className="w-full bg-white border border-[#D0E3F0] text-[#0F2942] text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
              >
                {HORIZONS.map(h => <option key={h} value={h}>T+{h} minutes</option>)}
              </select>
              {errors.horizon_min && <p className="text-[10px] text-[#DC2626] mt-0.5">{errors.horizon_min}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                id="whatif-run-btn"
                onClick={handleRun}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold rounded-lg py-2.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...</>
                  : <><Play className="w-3.5 h-3.5" /> RUN WHAT-IF</>
                }
              </button>
              <button
                id="whatif-reset-btn"
                onClick={handleReset}
                className="flex items-center gap-1.5 bg-[#EEF6FB] hover:bg-[#D0E3F0] text-[#0F2942] text-xs font-medium rounded-lg px-4 py-2.5 transition-colors border border-[#D0E3F0]"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Results panel */}
        <div className="xl:col-span-7 space-y-4">

          {/* Empty state */}
          {!loading && !result && !apiError && (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-[#F8FCFE] border border-dashed border-[#D0E3F0] rounded-xl text-center p-8 space-y-3">
              <FlaskConical className="w-10 h-10 text-[#A0B5C8]" />
              <p className="text-sm font-semibold text-[#5E82A6]">No scenario run yet</p>
              <p className="text-xs text-[#A0B5C8] max-w-xs">Adjust the inputs on the left and click RUN WHAT-IF to see the simulated response.</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl space-y-3">
              <Loader2 className="w-8 h-8 text-[#0284C7] animate-spin" />
              <p className="text-sm font-medium text-[#5E82A6]">Running scenario through VAJRA-AI model...</p>
            </div>
          )}

          {/* API error */}
          {!loading && apiError && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#991B1B]">Scenario Failed</p>
                <p className="text-xs text-[#7F1D1D] mt-1">{apiError}</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && result && (
            <div className="space-y-4">

              {/* Threat banner */}
              <div className={`${tc.bg} ${tc.border} border rounded-xl px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tc.badge}`}>
                    WHAT-IF SCENARIO
                  </span>
                  <span className={`text-xs font-mono font-bold ${tc.text}`}>
                    THREAT LEVEL: {result.simulated_response.threat_level}
                  </span>
                </div>
                <span className="text-[10px] text-[#5E82A6] font-mono">Horizon: T+{result.horizon_min}m</span>
              </div>

              {/* Simulation notice */}
              <div className="flex items-center gap-2 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl px-4 py-2">
                <Info className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <span className="text-[10px] text-[#6D28D9] font-mono">
                  SIMULATION / DEMO — NOT A REAL OBSERVATION OR LIVE FORECAST
                </span>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Thunderstorm Prob" value={result.simulated_response.thunderstorm_prob_pct} unit="% probability"
                  colour={result.simulated_response.thunderstorm_prob_pct > 60 ? 'text-[#DC2626]' : 'text-[#0284C7]'} />
                <MetricCard label="Lightning Prob" value={result.simulated_response.lightning_prob_pct} unit="% probability"
                  colour={result.simulated_response.lightning_prob_pct > 60 ? 'text-[#D97706]' : 'text-[#0284C7]'} />
                <MetricCard label="Peak Rainfall" value={result.simulated_response.rainfall_max_mmh} unit="mm/h" />
                <MetricCard label="Pred. Reflectivity" value={result.simulated_response.pred_dbz_max} unit="dBZ" />
              </div>

              {/* Horizon curve */}
              <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-[#0F2942] font-mono uppercase tracking-wide">Simulated Thunderstorm Probability Curve</h3>
                <div className="flex items-end gap-1.5 h-20">
                  {result.horizon_curve.map(pt => {
                    const pct = pt.thunderstorm_prob_pct;
                    const barH = Math.max(4, Math.round((pct / 100) * 72));
                    return (
                      <div key={pt.horizon_min} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                        <span className="text-[8px] font-mono text-[#5E82A6]">{pct}%</span>
                        <div className="w-full rounded-t transition-all duration-500" style={{
                          height: `${barH}px`,
                          backgroundColor: pct > 70 ? '#DC2626' : pct > 40 ? '#D97706' : '#0284C7'
                        }} />
                        <span className="text-[8px] font-mono text-[#A0B5C8] truncate w-full text-center">{pt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hypothetical conditions summary */}
              <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4 space-y-2">
                <h3 className="text-[11px] font-bold text-[#0F2942] font-mono uppercase tracking-wide">Hypothetical Input Conditions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5">
                  {Object.entries(result.hypothetical_conditions).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px] border-b border-[#EEF6FB] py-1">
                      <span className="text-[#5E82A6] font-mono">{k.replace(/_/g, ' ')}</span>
                      <span className="font-bold text-[#0F2942] font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* XAI accordion */}
              <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl overflow-hidden">
                <button
                  id="whatif-xai-toggle"
                  onClick={() => setShowXAI(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#EEF6FB] transition-colors"
                >
                  <span className="text-[11px] font-bold text-[#0F2942] font-mono uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-[#0284C7]" />
                    Simulated Feature Attributions (XAI)
                  </span>
                  {showXAI ? <ChevronUp className="w-4 h-4 text-[#5E82A6]" /> : <ChevronDown className="w-4 h-4 text-[#5E82A6]" />}
                </button>
                {showXAI && (
                  <div className="px-4 pb-4 space-y-3 border-t border-[#D0E3F0] pt-3">
                    {result.xai_explanation?.drivers?.map((d, i) => <XAIDriverBar key={i} driver={d} />)}
                    {result.xai_explanation?.meteorological_rationale && (
                      <p className="text-[10px] text-[#47637E] bg-[#EEF6FB] rounded-lg p-3 border border-[#D0E3F0] leading-relaxed">
                        {result.xai_explanation.meteorological_rationale}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Provenance footer */}
              <div className="flex items-start gap-2 bg-[#EEF6FB] border border-[#D0E3F0] rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
                <div className="text-[10px] text-[#47637E] font-mono space-y-0.5">
                  <p>
                    <strong>Engine:</strong> {result.simulated_response.inference_engine} |{' '}
                    <strong>Model:</strong> {result.simulated_response.model_status} |{' '}
                    <strong>Mode:</strong> {result.simulated_response.inference_mode}
                  </p>
                  <p>
                    <strong>Source:</strong> {result.provenance.source} |{' '}
                    <strong>Real data:</strong> {result.provenance.real_data_used ? 'YES' : 'NO (synthetic only)'}
                  </p>
                  <p className="text-[#DC2626] font-bold uppercase">
                    WHAT-IF / SIMULATION — NOT A REAL OR LIVE FORECAST
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
