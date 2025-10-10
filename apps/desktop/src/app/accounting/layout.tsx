"use client";

import { AppLayout } from "@/components/layout/AppLayout";

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout>{children}</AppLayout>
  );
}
