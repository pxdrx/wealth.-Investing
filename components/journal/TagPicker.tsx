"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppT } from "@/hooks/useAppLocale";
import {
  PREDEFINED_TAGS,
  PREDEFINED_TAG_SLUGS,
  TAG_CATEGORY_LABELS,
  TAG_CATEGORY_ORDER,
  type TagCategory,
} from "@/lib/journal/tag-taxonomy";

interface TagPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  allowFreeform?: boolean;
  maxTags?: number;
  className?: string;
}

const CATEGORY_STYLES: Record<TagCategory, { selected: string; idle: string }> = {
  positive: {
    selected: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50",
    idle: "border-emerald-500/25 text-emerald-700/70 dark:text-emerald-300/70 hover:border-emerald-500/50 hover:bg-emerald-500/5",
  },
  negative: {
    selected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/50",
    idle: "border-red-500/25 text-red-700/70 dark:text-red-300/70 hover:border-red-500/50 hover:bg-red-500/5",
  },
  neutral: {
    selected: "bg-muted text-foreground border-border",
    idle: "border-border/50 text-muted-foreground hover:border-border hover:bg-muted/50",
  },
};

export function TagPicker({
  value,
  onChange,
  allowFreeform = false,
  maxTags = 10,
  className,
}: TagPickerProps) {
  const t = useAppT();
  const [freeformInput, setFreeformInput] = useState("");

  const selected = useMemo(() => new Set(value), [value]);
  const atLimit = value.length >= maxTags;

  const freeformSelected = useMemo(
    () => value.filter((t) => !PREDEFINED_TAG_SLUGS.has(t)),
    [value]
  );

  const toggle = (slug: string) => {
    if (selected.has(slug)) {
      onChange(value.filter((t) => t !== slug));
      return;
    }
    if (atLimit) return;
    onChange([...value, slug]);
  };

  const addFreeform = () => {
    const raw = freeformInput.trim().toLowerCase();
    if (!raw || atLimit) return;
    if (selected.has(raw)) {
      setFreeformInput("");
      return;
    }
    onChange([...value, raw]);
    setFreeformInput("");
  };

  const removeFreeform = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div className={cn("space-y-3", className)}>
      {TAG_CATEGORY_ORDER.map((cat) => {
        const tags = PREDEFINED_TAGS.filter((t) => t.category === cat);
        const styles = CATEGORY_STYLES[cat];
        return (
          <div key={cat} className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
              {TAG_CATEGORY_LABELS[cat]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const isSel = selected.has(tag.slug);
                const disabled = !isSel && atLimit;
                return (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => toggle(tag.slug)}
                    disabled={disabled}
                    title={tag.description}
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      isSel ? styles.selected : styles.idle,
                      disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {allowFreeform && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
            {t("tagPicker.customCategory")}
          </div>
          {freeformSelected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {freeformSelected.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeFreeform(tag)}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={`${t("tagPicker.removeTag")} ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={freeformInput}
              onChange={(e) => setFreeformInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addFreeform();
                }
              }}
              placeholder={atLimit ? t("tagPicker.limitReached") : t("tagPicker.customPlaceholder")}
              disabled={atLimit}
              maxLength={50}
              className="flex-1 rounded-xl border border-border/60 bg-transparent px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addFreeform}
              disabled={atLimit || !freeformInput.trim()}
              className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("common.add")}
            </button>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        {value.length}/{maxTags} {t("tagPicker.tagsSelected")}
      </div>
    </div>
  );
}
