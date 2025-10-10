"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import NGICapitalSidebar, { NGINavItem } from "@ngi/ui/components/layout/NGICapitalSidebar";
import { advisoryListApplications } from "@/lib/api";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const apps = await advisoryListApplications();
        const pending = apps.filter((a: any) => a.status === "pending").length;
        setPendingApplicationsCount(pending);
      } catch (error) {
        console.error("Failed to load pending applications:", error);
      }
    };
    loadPendingCount();
  }, []);

  const items: NGINavItem[] = useMemo(() => [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Organization Structure", href: "/entities" },
    { name: "Accounting", href: "/accounting" },
    { name: "Finance", href: "/finance" },
    { name: "Employees", href: "/employees" },
    // Investor Management merged into Finance tabs
    {
      name: "NGI Capital Advisory",
      href: "/ngi-advisory",
      badgeCount: pendingApplicationsCount,
    },
  ], [pendingApplicationsCount]);

  const initials = (user?.firstName && user?.lastName)
    ? `${user.firstName[0]}${user.lastName[0]}`
    : (user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "U");
  const displayName = user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User";

  return (
    <NGICapitalSidebar
      brand="NGI Capital"
      items={items}
      activePath={pathname || "/"}
      LinkComponent={Link as any}
      user={{ initials, displayName }}
      onSettings={() => router.push("/settings")}
      onSignOut={async () => { await signOut(); router.push("/"); }}
    />
  );
}
