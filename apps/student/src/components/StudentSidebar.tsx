
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import NGICapitalSidebar, { NGINavItem } from "@ngi/ui/components/layout/NGICapitalSidebar";
import { postEvent } from "@/lib/telemetry";

type Membership = { id: number; project_id: number; role?: string; hours_planned?: number; active: boolean };

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [hasActiveProject, setHasActiveProject] = useState(false);

  // Student-specific: detect active project membership to show "My Projects"
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return;
        const res = await fetch('/api/public/memberships/mine', {
          headers: { 'X-Student-Email': email }
        });
        if (!res.ok) return;
        const data = (await res.json()) as Membership[];
        if (!ignore) setHasActiveProject(Array.isArray(data) && data.some(m => !!m.active));
      } catch {}
    };
    load();
    return () => { ignore = true };
  }, [user?.primaryEmailAddress?.emailAddress]);

  const items: NGINavItem[] = useMemo(() => {
    const base: NGINavItem[] = [
      { name: 'Projects', href: '/projects' },
    ];
    if (hasActiveProject) base.push({ name: 'My Projects', href: '/my-projects' });
    base.push({ name: 'Learning Center', href: '/learning' });
    return base;
  }, [hasActiveProject]);

  // Compute display name and initials (first + last only)
  const rawFirst = user?.firstName || "";
  const rawLast = user?.lastName || "";
  const firstParts = rawFirst.trim().split(/\s+/);
  let first = "";
  let last = "";
  if (firstParts.length > 1 && !rawLast) {
    first = firstParts[0];
    last = firstParts[firstParts.length - 1];
  } else if (rawFirst && rawLast) {
    first = firstParts[0];
    last = rawLast.trim().split(/\s+/)[0];
  } else if (user?.fullName) {
    const parts = user.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      first = parts[0];
      last = parts[parts.length - 1];
    } else if (parts.length === 1) {
      first = parts[0];
    }
  } else {
    first = firstParts[0] || "";
    last = rawLast;
  }
  const displayName = (first && last)
    ? `${first} ${last}`
    : first || user?.primaryEmailAddress?.emailAddress || "Student";
  const initials = (first && last) ? `${first[0]}${last[0]}`.toUpperCase() : (first ? first[0].toUpperCase() : "S");

  return (
    <NGICapitalSidebar
      brand="NGI Capital"
      items={items}
      activePath={pathname || "/"}
      LinkComponent={Link as any}
      onNavClick={(href: string) => {
        try { postEvent("nav_click", { route: href, position: "sidebar" }); } catch {}
      }}
      user={{ initials, displayName }}
      onSettings={() => router.push("/settings")}
      onSignOut={() => signOut({ redirectUrl: "/" })}
    />
  );
}
