"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, Loader2, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { safeGetSession } from "@/lib/supabase/safe-session";

const easeApple = [0.16, 1, 0.3, 1] as const;

interface MentorFeedback {
  id: string;
  mentor_id: string;
  mentor_name: string;
  trade_id: string | null;
  note_date: string | null;
  content: string;
  rating: number | null;
  created_at: string;
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={
            s <= value
              ? "fill-amber-500 text-amber-500"
              : "fill-transparent text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function StudentFeedbackFeed() {
  const [notes, setNotes] = useState<MentorFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const {
          data: { session },
        } = await safeGetSession();
        if (!session) {
          if (mounted) setLoading(false);
          return;
        }
        const res = await fetch("/api/mentor/my-feedback", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro desconhecido");
        if (mounted) setNotes(json.notes ?? []);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Erro ao carregar feedback");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card
        className="rounded-[22px] p-6"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </Card>
    );
  }

  if (notes.length === 0) {
    return (
      <Card
        className="rounded-[22px] p-10 text-center"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Seu mentor ainda não enviou nenhum feedback.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Quando ele adicionar uma nota, ela aparece aqui.
        </p>
      </Card>
    );
  }

  // Group by effective date (note_date when present, else created_at day)
  const grouped = notes.reduce<Record<string, MentorFeedback[]>>((acc, n) => {
    const key = n.note_date ?? n.created_at.slice(0, 10);
    (acc[key] ??= []).push(n);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {dates.map((date, gi) => (
        <motion.div
          key={date}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: gi * 0.04, ease: easeApple }}
        >
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            {formatDateHeader(date)}
          </h3>
          <div className="space-y-3">
            {grouped[date].map((n) => (
              <Card
                key={n.id}
                className="rounded-[22px] p-5"
                style={{ backgroundColor: "hsl(var(--card))" }}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {(n.mentor_name ?? "M").slice(0, 1).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {n.mentor_name ?? "Mentor"}
                        </p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          <GraduationCap className="h-3 w-3" />
                          Mentor
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatTime(n.created_at)}</span>
                        {n.trade_id && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                            trade específico
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {n.rating ? <Stars value={n.rating} /> : null}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {n.content}
                </p>
              </Card>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
