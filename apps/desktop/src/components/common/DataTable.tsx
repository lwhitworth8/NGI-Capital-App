"use client";
import React from "react";

export type Column<T> = { key: keyof T | string; header: string; render?: (row: T)=>React.ReactNode; className?: string };

export function DataTable<T extends { id?: string|number }>({ columns, rows, toolbarSlot }: { columns: Column<T>[]; rows: T[] | unknown; toolbarSlot?: React.ReactNode }){
  const safeColumns: Column<T>[] = Array.isArray(columns) ? columns : [] as Column<T>[];
  const data: T[] = Array.isArray(rows) ? (rows as T[]) : [] as T[];
  return (
    <div className="rounded-xl border bg-card">
      {toolbarSlot ? <div className="p-2 border-b">{toolbarSlot}</div> : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/40 text-left">
              {safeColumns.map((c,i)=>(<th key={i} className={"p-2 text-sm "+(c.className||"")}>{c.header}</th>))}
            </tr>
          </thead>
          <tbody>
            {data.map((r,ri)=> (
              <tr key={(r.id??ri).toString()} className="border-t">
                {safeColumns.map((c,ci)=> (
                  <td key={ci} className={"p-2 text-sm tabular-nums "+(c.className||"")}>
                    {c.render ? c.render(r) : String((r as any)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {!data.length && (
              <tr><td className="p-4 text-sm text-muted-foreground" colSpan={safeColumns.length || 1}>No data.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
