import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Award, 
  ArrowUpRight,
  Info
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

export default function BenchmarkModal({ 
  isOpen, 
  onClose, 
  benchmarkData 
}) {
  if (!isOpen) return null;

  const chartData = [
    { horizon: '15m', vajra: 0.74, optical: 0.58, xgboost: 0.49, persist: 0.42 },
    { horizon: '30m', vajra: 0.68, optical: 0.46, xgboost: 0.45, persist: 0.29 },
    { horizon: '45m', vajra: 0.62, optical: 0.38, xgboost: 0.42, persist: 0.19 },
    { horizon: '60m', vajra: 0.57, optical: 0.31, xgboost: 0.39, persist: 0.12 },
    { horizon: '90m', vajra: 0.49, optical: 0.21, xgboost: 0.34, persist: 0.05 },
    { horizon: '120m', vajra: 0.43, optical: 0.14, xgboost: 0.29, persist: 0.02 },
    { horizon: '180m', vajra: 0.36, optical: 0.08, xgboost: 0.23, persist: 0.01 }
  ];

  const summary = benchmarkData?.summary_table || [
    { model: "Persistence Baseline", csi_30m: 0.29, pod_30m: 0.39, far_30m: 0.52, csi_60m: 0.12, pod_60m: 0.18, far_60m: 0.77, brier: 0.310 },
    { model: "Optical Flow (TITAN Radar)", csi_30m: 0.46, pod_30m: 0.60, far_30m: 0.35, csi_60m: 0.31, pod_60m: 0.42, far_60m: 0.49, brier: 0.235 },
    { model: "XGBoost (Tabular NWP)", csi_30m: 0.45, pod_30m: 0.59, far_30m: 0.36, csi_60m: 0.39, pod_60m: 0.52, far_60m: 0.43, brier: 0.198 },
    { model: "VAJRA ConvLSTM (Multimodal)", csi_30m: 0.68, pod_30m: 0.82, far_30m: 0.20, csi_60m: 0.57, pod_60m: 0.73, far_60m: 0.26, brier: 0.112, is_ours: true }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#12324E]/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="bg-[#F8FCFE] w-full max-w-4xl rounded-2xl border border-[#D0E3F0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#12324E] text-white flex items-center justify-between border-b border-[#12324E]/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-cyan-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-sora font-semibold flex items-center gap-2">
                Scientific Verification & Target Benchmark Matrix
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono font-bold border border-cyan-400/30">
                  Target Specs
                </span>
              </h2>
              <p className="text-xs text-blue-100 font-sans">
                Architectural performance targets comparison against operational baselines
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Pending Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center space-x-3 text-amber-900 text-xs font-sans">
          <Info className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Validation Status:</strong> Validation pending real historical labelled dataset. Metrics below represent reference architectural targets pending offline evaluation against real multi-year historical archives.
          </span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Takeaways */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#EEF6FB] border border-[#D0E3F0]">
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block font-sans">
                Target CSI (@ 30m)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#12324E]">0.68</span>
                <span className="text-xs text-emerald-600 font-bold flex items-center font-sans">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +47% Target Gain
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EEF6FB] border border-[#D0E3F0]">
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block font-sans">
                Target POD (@ 60m)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#12324E]">0.73</span>
                <span className="text-xs text-[#5E82A6] font-mono">Target 73% Hits</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EEF6FB] border border-[#D0E3F0]">
              <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block font-sans">
                Target FAR (@ 60m)
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono text-[#12324E]">0.26</span>
                <span className="text-xs text-emerald-600 font-bold font-sans">Target 26% FAR</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="p-4 rounded-xl border border-[#D0E3F0] bg-white">
            <h3 className="text-xs font-semibold text-[#12324E] font-sora uppercase tracking-wider mb-3">
              CSI (Critical Success Index) Target Curves vs. Forecast Lead Time (0 - 180 Minutes)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="horizon" stroke="#5E82A6" fontSize={11} />
                  <YAxis stroke="#5E82A6" fontSize={11} domain={[0, 0.8]} />
                  <Tooltip contentStyle={{ backgroundColor: '#12324E', borderRadius: '8px', border: '1px solid #5E82A6', fontSize: '11px', color: '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="vajra" stroke="#0284C7" strokeWidth={3} name="VAJRA ConvLSTM (Multimodal)" activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="optical" stroke="#EA580C" strokeWidth={2} name="Optical Flow (TITAN)" />
                  <Line type="monotone" dataKey="xgboost" stroke="#9333EA" strokeWidth={2} name="XGBoost (NWP)" />
                  <Line type="monotone" dataKey="persist" stroke="#64748B" strokeWidth={2} strokeDasharray="4 4" name="Persistence" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metric Table */}
          <div>
            <h3 className="text-xs font-semibold text-[#12324E] font-sora uppercase tracking-wider mb-2">
              Target Meteorological Verification Matrix
            </h3>
            <div className="overflow-x-auto rounded-xl border border-[#D0E3F0]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EEF6FB] text-[#12324E] font-sora font-semibold border-b border-[#D0E3F0]">
                  <tr>
                    <th className="p-3">Model Architecture</th>
                    <th className="p-3">CSI (30m) ↑</th>
                    <th className="p-3">POD (30m) ↑</th>
                    <th className="p-3">FAR (30m) ↓</th>
                    <th className="p-3">CSI (60m) ↑</th>
                    <th className="p-3">FAR (60m) ↓</th>
                    <th className="p-3">Brier Score ↓</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0E3F0] font-mono">
                  {summary.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className={row.is_ours ? 'bg-sky-50 font-bold text-[#12324E]' : 'bg-white text-[#12324E] hover:bg-[#EEF6FB]'}
                    >
                      <td className="p-3 font-sans flex items-center gap-1.5">
                        {row.is_ours && <CheckCircle2 className="w-3.5 h-3.5 text-[#0284C7]" />}
                        {row.model}
                      </td>
                      <td className="p-3">{row.csi_30m.toFixed(2)}</td>
                      <td className="p-3">{row.pod_30m.toFixed(2)}</td>
                      <td className="p-3">{row.far_30m.toFixed(2)}</td>
                      <td className="p-3">{row.csi_60m.toFixed(2)}</td>
                      <td className="p-3">{row.far_60m.toFixed(2)}</td>
                      <td className="p-3">{row.brier.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#EEF6FB] border-t border-[#D0E3F0] flex items-center justify-between text-xs text-[#5E82A6] font-sans">
          <span>Reference Targets Matrix (Offline Historical Benchmark Pending Data Availability)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#12324E] hover:bg-[#12324E]/90 text-white font-semibold font-sans transition-all border border-[#12324E]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
