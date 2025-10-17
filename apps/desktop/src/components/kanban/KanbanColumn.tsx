"use client";
import { PropsWithChildren, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useDroppable } from "@dnd-kit/core";

export function KanbanColumn({ title, children }: PropsWithChildren<{ title: string }>) {
  const id = useMemo(() => title, [title]);
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <Card className="p-3 flex flex-col min-h-64">
      <div className="font-semibold mb-2 text-foreground flex items-center justify-between">
        <span>{title}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 flex-1 rounded-md ${isOver ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
        aria-label={`${title} column`}
      >
        {children}
      </div>
    </Card>
  );
}
