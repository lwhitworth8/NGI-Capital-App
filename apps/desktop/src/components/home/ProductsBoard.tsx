"use client";
import { Card } from "@/components/ui/card";
const COLUMNS = ["Backlog","Exploring","Building","Testing","Launched"] as const;

export function ProductsBoard(){
  return (
    <div className="grid md:grid-cols-5 gap-4">
      {COLUMNS.map(col=> (
        <Card key={col} className="p-3">
          <div className="font-semibold mb-2">{col}</div>
          <div className="space-y-2 min-h-24" aria-label={`${col} column`} />
        </Card>
      ))}
    </div>
  );
}


