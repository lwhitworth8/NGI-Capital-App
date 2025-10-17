"use client";
// Backwards-compatible wrapper: replace legacy product columns with the new Kanban board
import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export function ProductsBoard() {
  return <KanbanBoard />;
}
