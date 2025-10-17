"use client";
import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import KanbanCard, { KanbanProject } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useEntity } from "@/lib/context/UnifiedEntityContext";
import { ProjectDetailDialog } from "./ProjectDetailDialog";

type Status = "Exploring" | "Building" | "Launched";
const STATUSES: Status[] = ["Exploring", "Building", "Launched"];

export function KanbanBoard() {
  const { selectedEntity } = useEntity();
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus] = useState<Status>("Exploring");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const entityId = useMemo(() => {
    try {
      return (selectedEntity?.id as number) || undefined;
    } catch {
      return undefined;
    }
  }, [selectedEntity?.id]);

  const load = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const data = await apiClient.request<any[]>("GET", "/projects", undefined, { params: { entity_id: entityId } });
      const mapped: KanbanProject[] = (data || []).map((p: any) => ({
        id: Number(p.id),
        name: String(p.name || "Untitled"),
        description: p.description || "",
        status: (p.status || "Exploring") as Status,
      }));
      setProjects(mapped);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const grouped = useMemo(() => {
    const by: Record<Status, KanbanProject[]> = { Exploring: [], Building: [], Launched: [] };
    for (const p of projects) {
      const s = (STATUSES.includes(p.status as Status) ? (p.status as Status) : "Exploring");
      by[s].push(p);
    }
    return by;
  }, [projects]);

  const onDragEnd = async (evt: DragEndEvent) => {
    const id = Number(evt.active.id);
    const overId = evt.over?.id;
    if (!overId) return;
    let overCol: Status | null = null;
    if (typeof overId === "string" && (STATUSES as string[]).includes(overId)) {
      overCol = overId as Status;
    } else {
      // If dropped over another card, infer column from that card's status
      const overProjId = Number(overId);
      const overProj = projects.find((p) => p.id === overProjId);
      if (overProj && STATUSES.includes(overProj.status as Status)) {
        overCol = overProj.status as Status;
      }
    }
    if (!overCol) return;
    const current = projects.find((p) => p.id === id);
    if (!current) return;
    const fromCol = (current.status as Status) && STATUSES.includes(current.status as Status)
      ? (current.status as Status)
      : ("Exploring" as Status);

    // Build mutable lists per column
    const lists: Record<Status, KanbanProject[]> = {
      Exploring: [...grouped.Exploring],
      Building: [...grouped.Building],
      Launched: [...grouped.Launched],
    };

    // Remove from source
    const fromIdx = lists[fromCol].findIndex((p) => p.id === id);
    if (fromIdx >= 0) lists[fromCol].splice(fromIdx, 1);

    // Determine insert index in destination
    let insertAt = lists[overCol].length; // default to end
    const overIsItem = typeof overId !== "string" || !(STATUSES as string[]).includes(String(overId));
    if (overIsItem) {
      const overItemId = Number(overId);
      const pos = lists[overCol].findIndex((p) => p.id === overItemId);
      if (pos >= 0) insertAt = pos; // insert before hovered item
    }

    // Insert into destination (update status)
    const moved: KanbanProject = { ...current, status: overCol };
    lists[overCol].splice(insertAt, 0, moved);

    // Flatten back to projects in column order (Exploring, Building, Launched)
    const next = [...lists.Exploring, ...lists.Building, ...lists.Launched];
    setProjects(next);

    // Persist full ordering per column
    if (!entityId) return;
    try {
      await apiClient.request("POST", "/projects/reorder", {
        entity_id: entityId,
        columns: {
          Exploring: lists.Exploring.map((p) => p.id),
          Building: lists.Building.map((p) => p.id),
          Launched: lists.Launched.map((p) => p.id),
        },
      });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to save order");
    }
  };

  const create = async () => {
    if (!entityId || !newName.trim()) return;
    try {
      const res = await apiClient.request<{ id: number }>("POST", "/projects", {
        entity_id: entityId,
        name: newName.trim(),
        description: newDescription || "",
        status: newStatus,
      });
      toast.success("Project created");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewStatus("Exploring");
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to create project");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold text-foreground">Projects</div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!entityId}>
            New Project
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-3 gap-4">
          {STATUSES.map((col) => (
            <div key={col} id={col}>
              <KanbanColumn title={col}>
                <SortableContext items={grouped[col].map((p) => p.id)} strategy={verticalListSortingStrategy}>
                  {grouped[col].map((p) => (
                    <KanbanCard
                      key={p.id}
                      project={p}
                      onClick={(proj) => {
                        setSelectedProjectId(proj.id);
                        setDetailOpen(true);
                      }}
                    />
                  ))}
                </SortableContext>
                {/* Make the column droppable target by giving it the id; DnD-kit uses over.id from container wrappers */}
              </KanbanColumn>
            </div>
          ))}
        </div>
      </DndContext>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Short description (optional)" />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={!newName.trim() || !entityId}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <ProjectDetailDialog
        projectId={selectedProjectId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

export default KanbanBoard;
