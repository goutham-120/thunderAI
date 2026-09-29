/**
 * SeverityBadge — consistent severity chip used in lists and detail panels.
 */
import React from 'react';

const SEVERITY_STYLES = {
  EXTREME:  'bg-red-900/70   border-red-500   text-red-200',
  SEVERE:   'bg-orange-900/70 border-orange-500 text-orange-200',
  MODERATE: 'bg-yellow-900/70 border-yellow-500 text-yellow-200',
  MINOR:    'bg-sky-900/70   border-sky-500   text-sky-200',
};

export default function SeverityBadge({ severity }) {
  const cls = SEVERITY_STYLES[severity] || SEVERITY_STYLES.MINOR;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border font-mono uppercase tracking-wide ${cls}`}>
      {severity || 'UNKNOWN'}
    </span>
  );
}
