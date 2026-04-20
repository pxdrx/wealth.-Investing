"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SmartCTALink } from "./SmartCTALink";
import { track } from "@/lib/analytics/events";

export function HeroPrimaryCta({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <SmartCTALink
      className={className}
      onClick={() => track("hero_cta_click", { variant: "primary" })}
    >
      {children}
    </SmartCTALink>
  );
}

export function HeroGhostCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("hero_cta_click", { variant: "ghost" })}
    >
      {children}
    </Link>
  );
}
