/**
 * ProvenanceBadge — displays DATA PROVENANCE label for a storm cell or response.
 * Maps backend data_mode / data_quality strings to a colour-coded pill.
 */
import React from 'react';

const PROVENANCE_MAP = {
  real:               { label: 'REAL',              bg: 'bg-emerald-900/60',  border: 'border-emerald-500', text: 'text-emerald-300' },
  archive:            { label: 'ARCHIVE',           bg: 'bg-sky-900/60',      border: 'border-sky-400',    text: 'text-sky-300' },
  synthetic:          { label: 'SYNTHETIC',         bg: 'bg-violet-900/60',   border: 'border-violet-400', text: 'text-violet-300' },
  synthetic_fallback: { label: 'SYNTHETIC FALLBACK',bg: 'bg-amber-900/60',   border: 'border-amber-400',  text: 'text-amber-300' },
  unavailable:        { label: 'UNAVAILABLE',       bg: 'bg-zinc-800/60',     border: 'border-zinc-500',   text: 'text-zinc-400' },
  mock:               { label: 'MOCK / DEMO',       bg: 'bg-pink-900/60',     border: 'border-pink-400',   text: 'text-pink-300' },
};

export default function ProvenanceBadge({ mode }) {
  const key = (mode || 'unavailable').toLowerCase().replace(/ /g, '_');
  const cfg = PROVENANCE_MAP[key] || PROVENANCE_MAP['unavailable'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${cfg.bg} ${cfg.border} ${cfg.text} font-mono uppercase`}
      title={`Data provenance: ${cfg.label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}
