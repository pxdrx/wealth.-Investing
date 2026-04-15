"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

/**
 * CTA link that routes to /app when the user is authenticated, otherwise to /login.
 * Defaults to /login on first render to avoid a flash of /app for anonymous users;
 * once session is resolved the href is upgraded to /app if applicable.
 */
export function SmartCTALink({
  children,
  className,
  appHref = "/app",
  loggedOutHref = "/login",
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  appHref?: string;
  loggedOutHref?: string;
  "aria-label"?: string;
}) {
  const [href, setHref] = useState<string>(loggedOutHref);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        setHref(data.session ? appHref : loggedOutHref);
      } catch {
        // fall back to loggedOutHref
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appHref, loggedOutHref]);

  return (
    <Link href={href} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
