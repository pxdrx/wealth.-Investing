"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  EMOTION_TAGS,
  DISCIPLINE_TAGS,
  SETUP_QUALITY,
  SETUP_TAGS,
  MISTAKE_TAGS,
  SUB_RATING_OPTIONS,
  validateCustomTags,
} from "@/lib/psychology-tags";
import type { EmotionTag, DisciplineTag } from "@/lib/psychology-tags";

interface PsychologySectionProps {
  emotion: string | null;
  onEmotionChange: (v: string | null) => void;
  discipline: string | null;
  onDisciplineChange: (v: string | null) => void;
  setupQuality: string | null;
  onSetupQualityChange: (v: string | null) => void;
  entryRating: number | null;
  onEntryRatingChange: (v: number | null) => void;
  exitRating: number | null;
  onExitRatingChange: (v: number | null) => void;
  managementRating: number | null;
  onManagementRatingChange: (v: number | null) => void;
  customTags: string[];
  onCustomTagsChange: (v: string[]) => void;
}

export function PsychologySection({
  emotion,
  onEmotionChange,
  discipline,
  onDisciplineChange,
  setupQuality,
  onSetupQualityChange,
  entryRating,
  onEntryRatingChange,
  exitRating,
  onExitRatingChange,
  managementRating,
  onManagementRatingChange,
  customTags,
  onCustomTagsChange,
}: PsychologySectionProps) {
  const handleAddTag = (value: string) => {
    const tag = value.trim();
    if (!tag || customTags.includes(tag)) return;
    const next = validateCustomTags([...customTags, tag]);
    onCustomTagsChange(next);
  };

  const handleRemoveTag = (index: number) => {
    onCustomTagsChange(customTags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4 border-t border-border/40 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Psicologia do Trade
      </p>

      {/* Emotion selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Emoção</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOTION_TAGS.map((tag: EmotionTag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => onEmotionChange(emotion === tag.key ? null : tag.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                emotion === tag.key
                  ? tag.sentiment === 1
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : tag.sentiment === -1
                    ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300"
                    : "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
              )}
            >
              <span>{tag.icon}</span>
              <span>{tag.labelPtBr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discipline selector */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Disciplina</Label>
        <div className="flex flex-wrap gap-1.5">
          {DISCIPLINE_TAGS.map((tag: DisciplineTag) => (
            <button
              key={tag.key}
              type="button"
              onClick={() => onDisciplineChange(discipline === tag.key ? null : tag.key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                discipline === tag.key
                  ? tag.sentiment === 1
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-300"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
              )}
            >
              <span>{tag.icon}</span>
              <span>{tag.labelPtBr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Setup Quality radio */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Qualidade do Setup</Label>
        <div className="flex gap-2">
          {SETUP_QUALITY.map((sq) => (
            <button
              key={sq.key}
              type="button"
              onClick={() => onSetupQualityChange(setupQuality === sq.key ? null : sq.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
                setupQuality === sq.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:bg-muted/30"
              )}
            >
              {sq.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-ratings */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Avaliacao</Label>
        <div className="grid grid-cols-3 gap-3">
          <SubRating label="Entrada" value={entryRating} onChange={onEntryRatingChange} />
          <SubRating label="Saida" value={exitRating} onChange={onExitRatingChange} />
          <SubRating label="Gestao" value={managementRating} onChange={onManagementRatingChange} />
        </div>
      </div>

      {/* Setup Tags (preset chips) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Setup</Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(SETUP_TAGS).map(([key, { label, emoji }]) => {
            const isSelected = customTags.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? customTags.filter((t) => t !== key)
                    : validateCustomTags([...customTags, key]);
                  onCustomTagsChange(next);
                }}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                  isSelected
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400"
                    : "border-border/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {emoji} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mistake Tags (preset chips) */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Erros</Label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(MISTAKE_TAGS).map(([key, { label, emoji }]) => {
            const isSelected = customTags.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const next = isSelected
                    ? customTags.filter((t) => t !== key)
                    : validateCustomTags([...customTags, key]);
                  onCustomTagsChange(next);
                }}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                  isSelected
                    ? "bg-red-500/10 border-red-500/50 text-red-600 dark:text-red-400"
                    : "border-border/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {emoji} {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom tags */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Tags Personalizadas ({customTags.length}/10)</Label>
        <div className="flex flex-wrap gap-1.5">
          {customTags.map((tag, i) => (
            <Badge
              key={i}
              variant="outline"
              className="gap-1 pr-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(i)}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label="Remover tag"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        {customTags.length < 10 && (
          <Input
            placeholder="Adicionar tag (Enter)..."
            maxLength={50}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag(e.currentTarget.value);
                e.currentTarget.value = "";
              }
            }}
            className="mt-1"
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-Rating Toggle ──────────────────────────────────────────
function SubRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {SUB_RATING_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-colors",
              value === opt.value
                ? "border-primary bg-primary/10"
                : "border-border/60 hover:border-border hover:bg-muted/30"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
