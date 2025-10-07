"use client";

import { EntityProvider } from "@/hooks/useEntityContext";
import { AppLayout } from "@/components/layout/AppLayout";

export default function EmployeesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EntityProvider>
      <AppLayout>{children}</AppLayout>
    </EntityProvider>
  );
}