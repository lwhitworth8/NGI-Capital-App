"use client";
import { Card } from "@/components/ui/card";
import Link from 'next/link';

export function ImportantModules(){
  const tiles = [
    { title:"Finance", kpis:["ARR $-","Cash $-","Open Invoices -"], href:"/finance" },
    { title:"Sales", kpis:["Pipeline -","Win rate -"], href:"/sales" },
    { title:"Product", kpis:["Incidents -","Last Release -"], href:"/product" },
    { title:"People", kpis:["Headcount -","Open roles -"], href:"/people" },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {tiles.map(t=> (
        <Link key={t.title} href={t.href}>
          <Card className="p-4 hover:border-foreground/40">
            <div className="font-semibold">{t.title}</div>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">{t.kpis.map(k=> <li key={k}>{k}</li>)}</ul>
          </Card>
        </Link>
      ))}
    </div>
  );
}

