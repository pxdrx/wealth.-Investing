"use client";

import {
  ArrowRight,
  Link,
  FileText,
  Landmark,
  BarChart3,
  Flame,
  TrendingUp,
  Pencil,
  Tag,
  ClipboardList,
  Shield,
  Target,
  BarChart2,
  Circle,
} from "lucide-react";
import { AnimatedSection } from "./AnimatedSection";
import type { FeatureData } from "@/lib/landing-data";

interface FeatureSectionProps {
  data: FeatureData;
  reversed?: boolean;
  visual: React.ReactNode;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  link: Link,
  "file-text": FileText,
  landmark: Landmark,
  "bar-chart-3": BarChart3,
  flame: Flame,
  "trending-up": TrendingUp,
  pencil: Pencil,
  tag: Tag,
  "clipboard-list": ClipboardList,
  shield: Shield,
  target: Target,
  "bar-chart-2": BarChart2,
};

function getIcon(name: string) {
  return iconMap[name] || Circle;
}

export function FeatureSection({ data, reversed, visual }: FeatureSectionProps) {
  const textOrder = reversed ? "lg:order-2" : "lg:order-1";
  const visualOrder = reversed ? "lg:order-1" : "lg:order-2";

  return (
    <section className="landing-section" aria-label={data.tag} id={data.tag.toLowerCase()}>
      <div className="landing-container">
        <div className="grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-16 items-center">
          <AnimatedSection className={textOrder}>
            <span className="inline-block font-mono text-xs tracking-[0.15em] uppercase text-l-text-muted mb-4">
              [{data.number}] {data.tag}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter-apple text-l-text mb-4">{data.headline}</h2>
            <p className="text-base leading-relaxed text-l-text-secondary mb-8">{data.description}</p>
            <span className="inline-block font-mono text-[11px] tracking-[0.12em] uppercase text-l-text-muted mb-4">{data.subLabel}</span>

            <div className="space-y-4">
              {data.features.map((feat) => {
                const Icon = getIcon(feat.icon);
                return (
                  <div key={feat.title} className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "hsl(var(--landing-bg-tertiary))" }}>
                      <Icon className="h-4 w-4 text-l-text-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-l-text">{feat.title}</h3>
                      <p className="mt-0.5 text-sm leading-relaxed text-l-text-secondary">{feat.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <a href={data.link.href} className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-l-text-secondary hover:text-l-text transition-colors">
              {data.link.text} <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </AnimatedSection>

          <AnimatedSection className={visualOrder} delay={0.15}>
            {visual}
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
