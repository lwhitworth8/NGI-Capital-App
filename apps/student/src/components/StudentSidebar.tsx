
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import NGICapitalSidebar, { NGINavItem } from "@ngi/ui/components/layout/NGICapitalSidebar";
import { postEvent } from "@/lib/telemetry";

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [avatarColor, setAvatarColor] = useState<string | undefined>(undefined);
  const [avatarPhoto, setAvatarPhoto] = useState<string | undefined>(undefined);

  // Load profile color/photo for avatar
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return;
        const res = await fetch('/api/public/profile', { headers: { 'X-Student-Email': email } });
        if (!res.ok) return;
        const p = await res.json();
        if (!ignore) {
          setAvatarColor(p?.profile_color || '#0066FF');
          if (p?.profile_photo_url) setAvatarPhoto(p.profile_photo_url as string);
        }
      } catch {}
    };
    load();
    return () => { ignore = true };
  }, [user?.primaryEmailAddress?.emailAddress]);

  // Listen for avatar updates from settings page
  useEffect(() => {
    const handleAvatarUpdate = () => {
      // Reload profile data when avatar is updated
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;
      fetch('/api/public/profile', { headers: { 'X-Student-Email': email } })
        .then(res => res.ok ? res.json() : null)
        .then(p => {
          if (p) {
            setAvatarColor(p?.profile_color || '#0066FF');
            if (p?.profile_photo_url) setAvatarPhoto(p.profile_photo_url as string);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('avatar-updated', handleAvatarUpdate);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdate);
  }, [user?.primaryEmailAddress?.emailAddress]);

  const items: NGINavItem[] = useMemo(() => {
    const base: NGINavItem[] = [
      { name: 'Projects', href: '/projects' },
      { name: 'My Projects', href: '/my-projects' },
      { name: 'Learning Center', href: '/learning' },
    ];
    return base;
  }, []);

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
      user={{ initials, displayName, color: avatarColor, photoUrl: avatarPhoto }}
      onSettings={() => router.push("/settings")}
      onSignOut={() => signOut({ redirectUrl: "/" })}
    />
  );
}

