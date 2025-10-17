"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Calendar as CalendarIcon, ExternalLink } from "lucide-react";

type TodoItem = {
  type: 'employee_task' | 'gcal_event' | string;
  id?: string | number;
  title?: string;
  notes?: string;
  due_at?: string | null;
  start_ts?: string | null;
  end_ts?: string | null;
  status?: string;
  link?: string;
};

function formatWhen(item: TodoItem) {
  const raw = item.start_ts || item.due_at;
  if (!raw) return '';
  try {
    const hasTime = String(raw).length > 10; // date-only if <= 10
    const dt = hasTime ? new Date(String(raw)) : new Date(String(raw) + 'T00:00:00Z');
    const d = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const t = hasTime ? dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
    return t ? `${d} - ${t}` : d;
  } catch {
    return String(raw);
  }
}

export function TodosPanel(){
  const [items, setItems] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/my/todos?limit=20', { credentials: 'include' });
        const data = await res.json();
        if (!active) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!active) return;
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false };
  }, []);

  const list = useMemo(() => items.slice(0, 8), [items]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">My To-Dos</h3>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && list.length === 0 && <p className="text-sm text-muted-foreground">Nothing upcoming.</p>}
      <div className="space-y-2">
        {list.map((it, idx) => (
          <div key={`${it.type}-${it.id}-${idx}`} className="flex items-start justify-between gap-3 p-2 rounded-md border hover:bg-muted/40">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium truncate">
                {it.type === 'employee_task' ? <CheckSquare className="h-4 w-4"/> : <CalendarIcon className="h-4 w-4"/>}
                <span className="truncate">{it.title || '(Untitled)'}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{it.type === 'employee_task' ? 'Task' : 'Event'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{formatWhen(it)}</div>
              {it.notes && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{it.notes}</div>}
            </div>
            {it.link && (
              <a href={it.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 whitespace-nowrap inline-flex items-center gap-1">
                Open <ExternalLink className="h-3 w-3"/>
              </a>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

