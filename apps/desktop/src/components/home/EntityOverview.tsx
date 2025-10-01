"use client";
import { Card } from "@/components/ui/Card";
import { useApp } from "@/lib/context/AppContext";

export function EntityOverview(){
  const { state, setCurrentEntity } = useApp()
  const ent = state.currentEntity
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Entity Overview</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Entity</label>
          <select
            className="px-2 py-1 rounded-md border border-input bg-background text-foreground text-sm"
            value={ent?.id || ''}
            onChange={e => {
              const next = state.entities.find(x => (x.id as any) === e.target.value)
              setCurrentEntity(next || null)
            }}
          >
            {state.entities.map(e => (
              <option key={e.id} value={e.id}>{e.legal_name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div><div className="text-muted-foreground">Legal Name</div><div>{ent?.legal_name ?? "-"}</div></div>
        <div><div className="text-muted-foreground">State</div><div>{(ent as any)?.state ?? "-"}</div></div>
        <div><div className="text-muted-foreground">EIN</div><div>{(ent as any)?.ein ?? "-"}</div></div>
        <div><div className="text-muted-foreground">Formation Date</div><div>{(ent as any)?.formation_date ?? "-"}</div></div>
      </div>
    </Card>
  );
}
