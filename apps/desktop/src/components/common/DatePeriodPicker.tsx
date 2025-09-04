"use client";
import React from "react";

export function DatePeriodPicker({ value, onChange, mode="monthly" }: { value: { year: number; month: number }; onChange: (v:{year:number;month:number})=>void; mode?: "monthly"|"quarterly"|"annual" }){
  const { year, month } = value;
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="block text-xs text-muted-foreground">Year</label>
        <input className="border px-2 py-1 rounded w-24" type="number" value={year} onChange={e=>onChange({year: parseInt(e.target.value||"0"), month})} />
      </div>
      {mode!=="annual" && (
        <div>
          <label className="block text-xs text-muted-foreground">Month</label>
          <input className="border px-2 py-1 rounded w-20" type="number" min={1} max={12} value={month} onChange={e=>onChange({year, month: parseInt(e.target.value||"1")})} />
        </div>)
      }
    </div>
  );
}

