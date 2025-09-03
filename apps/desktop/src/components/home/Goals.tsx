"use client";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
const fetcher=(u:string)=>fetch(u).then(r=>r.json());

export function Goals(){
  const { data } = useSWR("/api/goals", fetcher);
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Goals / OKRs</h3>
      <ul className="space-y-3">
        {(data?.items??[]).map((g:any)=>(
          <li key={g.id}>
            <div className="flex items-center justify-between">
              <div className="font-medium">{g.title}</div>
              <span className="text-xs rounded px-2 py-0.5 border">{g.status}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded mt-2" aria-label="progress" aria-valuenow={g.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 bg-primary rounded" style={{ width: `${g.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

