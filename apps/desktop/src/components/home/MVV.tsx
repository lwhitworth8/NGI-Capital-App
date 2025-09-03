"use client";
import { Card } from "@/components/ui/Card";
import React from "react";

export function MVV(){
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2">Mission · Vision · Values</h3>
      <textarea placeholder="Mission…&#10;Vision…&#10;Values…" className="min-h-32 w-full px-3 py-2 rounded-md border border-input bg-background text-foreground" />
    </Card>
  );
}

