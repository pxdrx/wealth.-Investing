"use client";

import { useEffect, useState } from "react";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useEntitlements } from "@/hooks/use-entitlements";

export interface AppRoles {
  isMentor: boolean;
  isLinkedStudent: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

// Consolidates the admin + mentor checks that AppSidebar and AppMobileNav
// were each running separately. Both fetches are fire-and-forget and silent
// on failure (non-admin / unlinked students are the common case).
//
// isMentor comes from the subscription plan (already cached in context);
// isLinkedStudent and isAdmin hit their respective API routes once per mount.
export function useAppRoles(): AppRoles {
  const { isMentor } = useEntitlements();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLinkedStudent, setIsLinkedStudent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: { session } } = await safeGetSession();
      if (!session || cancelled) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const adminPromise = fetch("/api/admin/me", { headers })
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json?.ok && json.isAdmin) setIsAdmin(true);
        })
        .catch(() => {
          // silent — non-admin is the default
        });

      // Mentors don't need the student-side check
      const studentPromise = isMentor
        ? Promise.resolve()
        : fetch("/api/mentor/my-mentor", { headers })
            .then((r) => r.json())
            .then((json) => {
              if (!cancelled && json?.ok && json.mentor) setIsLinkedStudent(true);
            })
            .catch(() => {
              // silent — unlinked is the default
            });

      await Promise.all([adminPromise, studentPromise]);
      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isMentor]);

  return { isMentor, isLinkedStudent, isAdmin, isLoading };
}
