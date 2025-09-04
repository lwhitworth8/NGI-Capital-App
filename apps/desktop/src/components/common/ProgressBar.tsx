"use client";
import React from "react";

export function ProgressBar({ percent }: { percent: number }){
  const pct = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <div className="w-full h-2 rounded bg-muted overflow-hidden" aria-label="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

