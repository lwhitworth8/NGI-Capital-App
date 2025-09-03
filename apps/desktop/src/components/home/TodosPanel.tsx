"use client";
import { Card } from "@/components/ui/Card";

export function TodosPanel(){
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">My To-Dos</h3>
      <p className="text-sm text-muted-foreground">No tasks to display.</p>
    </Card>
  );
}
