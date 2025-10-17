"use client";
import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";

export type KanbanProject = {
  id: number;
  name: string;
  description?: string;
  status: "Exploring" | "Building" | "Launched" | string;
};

export function KanbanCard({ project, onClick }: { project: KanbanProject; onClick?: (p: KanbanProject) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: "grab",
  } as any;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 hover:bg-muted/40 border-border cursor-grab active:cursor-grabbing"
      onClick={() => onClick?.(project)}
      {...attributes}
      {...listeners}
    >
      <div className="text-sm font-medium text-foreground truncate">{project.name}</div>
      {project.description ? (
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</div>
      ) : null}
    </Card>
  );
}

export default memo(KanbanCard);

