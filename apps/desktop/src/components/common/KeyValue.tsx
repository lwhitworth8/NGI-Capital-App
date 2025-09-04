"use client";
import React from "react";

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }){
  return (
    <div className="space-y-1">
      {items.map((it, idx)=> (
        <div key={idx} className="flex justify-between gap-4 text-sm">
          <div className="text-muted-foreground">{it.label}</div>
          <div className="tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

