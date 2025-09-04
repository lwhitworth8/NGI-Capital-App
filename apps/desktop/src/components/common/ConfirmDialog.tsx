"use client";
import React from "react";

export function ConfirmDialog({ open, title, message, onCancel, onConfirm }: { open: boolean; title?: string; message?: string; onCancel: ()=>void; onConfirm: ()=>void }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background rounded-xl border w-full max-w-md p-4">
          <div className="font-semibold mb-2">{title || 'Are you sure?'}</div>
          <div className="text-sm text-muted-foreground mb-3">{message}</div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 rounded border" onClick={onCancel}>Cancel</button>
            <button className="px-3 py-1 rounded bg-destructive text-destructive-foreground" onClick={onConfirm}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

