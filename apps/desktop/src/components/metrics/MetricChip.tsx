"use client";
import React from "react";

type Props = {
  label: string;
  value?: string | number;
  delta?: number;
  unit?: string;
  onClick?: () => void;
  className?: string;
};

export function MetricChip({ label, value, delta, unit, onClick, className }: Props) {
  const sign = typeof delta === 'number' ? (delta === 0 ? '' : delta > 0 ? '+' : '') : ''
  const deltaClass = typeof delta === 'number' ? (delta > 0 ? 'ngi-up' : delta < 0 ? 'ngi-down' : '') : ''
  return (
    <button aria-label={label} onClick={onClick} className={`inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm bg-background hover:bg-muted/50 focus:outline-none focus:ring ${className||''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}{unit ? ` ${unit}` : ''}</span>
      {typeof delta === 'number' && (
        <span className={`text-xs ${deltaClass}`}>{sign}{delta?.toFixed?.(2)}%</span>
      )}
    </button>
  );
}

export default MetricChip;

