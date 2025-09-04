"use client";
import React from "react";

export function PageHeader({ title, subtitle, rightSlot }: { title: string; subtitle?: string; rightSlot?: React.ReactNode }){
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <div className="text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}

