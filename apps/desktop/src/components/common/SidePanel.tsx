"use client";
import React from "react";

export function SidePanel({ open, onClose, title, children }: { open: boolean; onClose: ()=>void; title?: string; children: React.ReactNode }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-background border-l shadow-xl flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="font-medium">{title}</div>
          <button aria-label="Close" className="text-sm text-muted-foreground" onClick={onClose}>Esc</button>
        </div>
        <div className="p-3 overflow-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

