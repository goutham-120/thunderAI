/**
 * ThresholdDocumentation — Documents the existing CAP alert engine thresholds.
 *
 * The thresholds in the backend are HARDCODED in:
 *   backend/app/services/cap_alert_engine.py
 *   backend/app/services/storm_tracker.py
 *
 * This component exposes and documents them clearly for operators.
 * No backend redesign is performed. Thresholds cannot be changed from the UI.
 */
import React, { useState } from 'react';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';

const THRESHOLDS = [
  {
    group: 'CAP Alert Engine (cap_alert_engine.py)',
    source: 'Rule-based, hardcoded',
    configurable: false,
    items: [
      {
        label: 'Severity filter',
        value: '["EXTREME", "SEVERE", "MODERATE"]',
        description: 'Only cells with these severities generate CAP alerts. MINOR cells are suppressed.',
      },
      {
        label: 'Certainty = Observed',
        value: 'max_dbz > 50',
        description: 'If peak radar reflectivity exceeds 50 dBZ, certainty is "Observed"; otherwise "Likely".',
      },
      {
        label: 'Urgency = Immediate',
        value: 'severity == EXTREME',
        description: 'EXTREME severity → Urgency=Immediate. All others → Expected.',
      },
      {
        label: 'Validity window',
        value: '+120 minutes from issue time',
        description: 'All CAP alerts expire 120 minutes after issuance. Not configurable via API.',
      },
      {
        label: 'Impact radius',
        value: '35 km circle',
        description: 'Fixed 35 km impact radius around storm cell center in CAP area polygon.',
      },
    ],
  },
  {
    group: 'Storm Cell Tracker (storm_tracker.py)',
    source: 'Rule-based, hardcoded',
    configurable: false,
    items: [
      {
        label: 'Convective core threshold',
        value: 'dBZ ≥ 38.0',
        description: 'Grid pixels above 38 dBZ are labeled as active convective core.',
      },
      {
        label: 'Minimum cell size',
        value: '≥ 8 pixels',
        description: 'Segments smaller than 8 pixels are ignored as noise.',
      },
      {
        label: 'EXTREME severity',
        value: 'cloud_top < −60°C AND lightning_rate > 30 AND max_dBZ ≥ 52',
        description: 'All three conditions must be met. Lifecycle: RAPIDLY INTENSIFYING.',
      },
      {
        label: 'SEVERE severity',
        value: 'max_dBZ ≥ 48 AND lightning_rate > 15',
        description: 'Lifecycle: MATURE CONVECTIVE.',
      },
      {
        label: 'MODERATE severity',
        value: 'max_dBZ ≥ 40 AND cloud_top < −40°C',
        description: 'Lifecycle: DEVELOPING.',
      },
      {
        label: 'MINOR severity (suppressed in CAP)',
        value: 'below MODERATE thresholds',
        description: 'Lifecycle: WEAKENING / DISSIPATING. Does not generate CAP alerts.',
      },
      {
        label: 'Lightning Jump trigger',
        value: 'lightning_rate ≥ 20 AND cloud_top < −50°C AND max_dBZ ≥ 48',
        description: 'is_lightning_jump=True flag is set; used as evidence in investigation.',
      },
      {
        label: 'Trajectory uncertainty',
        value: '2 km at t=0 → 18 km at t=180 min',
        description: 'Linear expansion of positional uncertainty over forecast horizon.',
      },
    ],
  },
  {
    group: 'XAI Feature Attribution (xai_engine.py)',
    source: 'Normalized formula, hardcoded',
    configurable: false,
    items: [
      {
        label: 'Radar impact normalization',
        value: 'min(100, max_dBZ / 65.0 × 100)',
        description: 'Max 100% at 65 dBZ.',
      },
      {
        label: 'Lightning impact normalization',
        value: 'min(100, lightning_rate / 35.0 × 100)',
        description: 'Max 100% at 35 flashes/min.',
      },
      {
        label: 'Cloud-top impact normalization',
        value: 'min(100, abs(cloud_top_c) / 75.0 × 100) [only if < 0]',
        description: 'Max 100% at −75°C.',
      },
      {
        label: 'CAPE impact normalization',
        value: 'min(100, cape_jkg / 3200.0 × 100)',
        description: 'Max 100% at 3200 J/kg.',
      },
      {
        label: 'CIN penalty',
        value: 'max(0, cin_jkg / 120.0 × 50)',
        description: 'High CIN inhibits convection. Applied as negative contribution.',
      },
    ],
  },
];

export default function ThresholdDocumentation() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div id="threshold-documentation" className="space-y-3 font-sans">
      <div className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-[#0284C7]" />
          <h3 className="text-sm font-bold text-[#12324E] font-sora">
            Alert Threshold Documentation
          </h3>
        </div>
        <p className="text-xs text-[#5E82A6] leading-relaxed">
          The following thresholds are <strong>hardcoded</strong> in the backend services.
          They are documented here for operational reference. To modify them, edit the
          corresponding Python source files. No runtime threshold configuration API currently exists.
        </p>
      </div>

      {THRESHOLDS.map((group, gi) => (
        <div key={gi} className="bg-[#F8FCFE] border border-[#D0E3F0] rounded-xl overflow-hidden">
          <button
            id={`threshold-group-${gi}`}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#EEF6FB] transition-colors"
            onClick={() => setExpanded(expanded === gi ? null : gi)}
          >
            <div>
              <span className="text-xs font-bold text-[#12324E] font-sora">{group.group}</span>
              <span className="ml-2 text-[10px] font-mono text-[#5E82A6]">{group.source}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">
                NOT CONFIGURABLE
              </span>
              {expanded === gi ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#5E82A6]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#5E82A6]" />
              )}
            </div>
          </button>

          {expanded === gi && (
            <div className="border-t border-[#D0E3F0] divide-y divide-[#EAF0F6]">
              {group.items.map((item, ii) => (
                <div key={ii} className="px-4 py-2.5 space-y-0.5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[11px] font-semibold text-[#12324E]">{item.label}</span>
                    <code className="text-[10px] font-mono text-[#0284C7] bg-[#EEF6FB] px-2 py-0.5 rounded shrink-0 border border-[#D0E3F0]">
                      {item.value}
                    </code>
                  </div>
                  <p className="text-[10px] text-[#5E82A6]">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
