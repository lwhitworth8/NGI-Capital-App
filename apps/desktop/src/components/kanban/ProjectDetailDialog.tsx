"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

type Status = "Exploring" | "Building" | "Launched";

export function ProjectDetailDialog({
  projectId,
  open,
  onClose,
  onSaved,
}: {
  projectId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("Exploring");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!open || !projectId) return;
      setLoading(true);
      try {
        const data = await apiClient.request<any>("GET", `/projects/${projectId}`);
        if (!active) return;
        setName(data?.name || "");
        setDescription(data?.description || "");
        const st = (data?.status || "Exploring") as Status;
        setStatus(["Exploring", "Building", "Launched"].includes(st) ? st : "Exploring");
      } catch {
        // fall back to minimal fields;
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [open, projectId]);

  const save = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      await apiClient.request("PATCH", `/projects/${projectId}`, {
        name,
        description,
        status,
      });
      toast.success("Project updated");
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project Details</DialogTitle>
          <DialogDescription>View and edit the project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
          </div>
          <div>
            <Label>Status</Label>
            <div className="flex gap-2 mt-2">
              {["Exploring", "Building", "Launched"].map((s) => (
                <Button key={s} type="button" variant={status === s ? "default" : "secondary"} onClick={() => setStatus(s as Status)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={loading || !name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

