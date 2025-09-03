"use client";
import React from "react";
import { TodosPanel } from "./TodosPanel";
import { CalendarsPanel } from "./CalendarsPanel";

export function RightRail() {
  return (
    <aside className="space-y-6 lg:sticky lg:top-20">
      <TodosPanel />
      <CalendarsPanel />
    </aside>
  );
}

