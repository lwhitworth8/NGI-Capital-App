"use client";
import { Card } from "@/components/ui/Card";

export function CalendarsPanel(){
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Calendar</h3>
      </div>
      <p className="text-sm text-muted-foreground mt-2">No calendar connected.</p>
    </Card>
  );
}
