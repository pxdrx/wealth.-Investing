"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Star,
  Trash2,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

// ─── Constants ───────────────────────────────────────────────────────
const easeApple = [0.16, 1, 0.3, 1] as const;
const SAFETY_TIMEOUT = 8000;

// ─── Types ───────────────────────────────────────────────────────────

interface MentorCode {
  id: string;
  code: string;
  status: string;
  studentName: string | null;
  createdAt: string;
  revokedAt: string | null;
}

interface StudentSummary {
  id: string;
  displayName: string;
  netPnl: number;
  winRate: number;
  totalTrades: number;
  lastTradeDate: string | null;
  linkedAt: string;
}

interface StudentKpis {
  total_trades: number;
  win_rate: number;
  pnl_total: number;
  pnl_month: number;
}

interface StudentTrade {
  id: string;
  close_time: string;
  symbol: string;
  direction: "buy" | "sell";
  pnl_usd: number;
  net_pnl_usd: number;
}

interface MentorNote {
  id: string;
  content: string;
  rating: number | null;
  created_at: string;
  trade_id: string | null;
}

// ─── API Helper ──────────────────────────────────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessao expirada");
  const res = await fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? "Erro desconhecido");
  return json;
}

// ─── Star Rating ─────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}

function StarRating({ value, onChange, readonly = false, size = 20 }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            size={size}
            className={
              star <= value
                ? "fill-amber-500 text-amber-500"
                : "fill-transparent text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  );
}

// ─── Invite Code Section ─────────────────────────────────────────────

interface InviteCodeSectionProps {
  codes: MentorCode[];
  loadingCodes: boolean;
  onGenerate: () => void;
  generating: boolean;
}

function InviteCodeSection({ codes, loadingCodes, onGenerate, generating }: InviteCodeSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback: noop
    }
  }, []);

  return (
    <Card
      className="rounded-[22px] p-6"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Codigo de Convite</h2>
          <p className="text-sm text-muted-foreground">
            Compartilhe com seus alunos para vincula-los
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Gerar novo codigo
        </Button>
      </div>

      {loadingCodes ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum codigo gerado ainda. Clique em &ldquo;Gerar novo codigo&rdquo; acima.
        </p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <code className="text-sm font-mono font-semibold tracking-wide">
                  {c.code}
                </code>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.status === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : c.status === "pending"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {c.status === "active" ? c.studentName ?? "Vinculado" : c.status === "pending" ? "Disponivel" : "Revogado"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => handleCopy(c.id, c.code)}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copiedId === c.id ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Student Card ────────────────────────────────────────────────────

interface StudentCardProps {
  student: StudentSummary;
  onClick: () => void;
  index: number;
}

function StudentCard({ student, onClick, index }: StudentCardProps) {
  const isPositive = (student.netPnl ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: easeApple }}
    >
      <Card
        className="rounded-[22px] p-5 cursor-pointer transition-shadow hover:shadow-md"
        style={{ backgroundColor: "hsl(var(--card))" }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold tracking-tight truncate">
            {student.displayName}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">P&L Mes</p>
            <p
              className={`text-sm font-semibold ${
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {(student.netPnl ?? 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Win Rate</p>
            <p className="text-sm font-semibold">
              {(student.winRate ?? 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Total Trades</p>
            <p className="text-sm font-semibold">{student.totalTrades ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Ultimo Trade</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {student.lastTradeDate
                ? new Date(student.lastTradeDate).toLocaleDateString("pt-BR")
                : "\u2014"}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
  index: number;
}

function KpiCard({ label, value, icon, color, index }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: easeApple }}
    >
      <Card
        className="rounded-[22px] p-5"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="text-muted-foreground">{icon}</div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
        </div>
        <p className={`text-2xl font-semibold tracking-tight ${color ?? ""}`}>
          {value}
        </p>
      </Card>
    </motion.div>
  );
}

// ─── Note Form ───────────────────────────────────────────────────────

interface NoteFormProps {
  onSubmit: (content: string, rating: number | null) => Promise<void>;
  submitting: boolean;
}

function NoteForm({ onSubmit, submitting }: NoteFormProps) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit(content.trim(), rating > 0 ? rating : null);
    setContent("");
    setRating(0);
  };

  return (
    <Card
      className="rounded-[22px] p-5"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <h3 className="font-semibold tracking-tight mb-4">Adicionar nota</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="note-content" className="text-sm">
            Observacao
          </Label>
          <textarea
            id="note-content"
            className="mt-1.5 w-full rounded-xl border bg-transparent px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Escreva suas observacoes sobre o aluno..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">Avaliacao (opcional)</Label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <Button
          className="rounded-full"
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Adicionar nota
        </Button>
      </div>
    </Card>
  );
}

// ─── Note Item ───────────────────────────────────────────────────────

interface NoteItemProps {
  note: MentorNote;
  onDelete: (id: string) => void;
  deleting: string | null;
}

function NoteItem({ note, onDelete, deleting }: NoteItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center gap-3 mt-2">
            {note.rating != null && note.rating > 0 && <StarRating value={note.rating} readonly size={14} />}
            <span className="text-xs text-muted-foreground">
              {new Date(note.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                className="rounded-full text-xs h-7"
                onClick={() => onDelete(note.id)}
                disabled={deleting === note.id}
              >
                {deleting === note.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Confirmar"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs h-7"
                onClick={() => setConfirmDelete(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Student Detail View ─────────────────────────────────────────────

interface StudentDetailProps {
  student: StudentSummary;
  onBack: () => void;
}

function StudentDetail({ student, onBack }: StudentDetailProps) {
  const [kpis, setKpis] = useState<StudentKpis | null>(null);
  const [trades, setTrades] = useState<StudentTrade[]>([]);
  const [notes, setNotes] = useState<MentorNote[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch KPIs
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingKpis(false);
    }, SAFETY_TIMEOUT);

    async function load() {
      try {
        const json = await apiFetch(`/api/mentor/student/${student.id}/kpis`);
        if (mounted) {
          const k = json.kpis;
          if (k) {
            setKpis({
              total_trades: k.month?.totalTrades ?? 0,
              win_rate: k.month?.winRate ?? 0,
              pnl_total: k.allTime?.totalPnl ?? 0,
              pnl_month: k.month?.totalPnl ?? 0,
            });
          }
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar KPIs");
      } finally {
        if (mounted) setLoadingKpis(false);
      }
    }
    load();
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, [student.id]);

  // Fetch trades
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingTrades(false);
    }, SAFETY_TIMEOUT);

    async function load() {
      try {
        const json = await apiFetch(`/api/mentor/student/${student.id}/journal`);
        if (mounted) setTrades(json.trades ?? []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar trades");
      } finally {
        if (mounted) setLoadingTrades(false);
      }
    }
    load();
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, [student.id]);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    try {
      const json = await apiFetch(`/api/mentor/notes?student_id=${student.id}`);
      setNotes(json.notes ?? []);
    } catch {
      // Notes are non-critical, fail silently
    } finally {
      setLoadingNotes(false);
    }
  }, [student.id]);

  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingNotes(false);
    }, SAFETY_TIMEOUT);

    fetchNotes();
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, [fetchNotes]);

  const handleAddNote = async (content: string, rating: number | null) => {
    setSubmittingNote(true);
    try {
      await apiFetch("/api/mentor/notes", {
        method: "POST",
        body: JSON.stringify({
          studentId: student.id,
          content,
          rating,
        }),
      });
      await fetchNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar nota");
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNote(noteId);
    try {
      await apiFetch(`/api/mentor/notes/${noteId}`, {
        method: "DELETE",
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir nota");
    } finally {
      setDeletingNote(null);
    }
  };

  const pnlColor = (val: number) =>
    val >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div>
      {/* Back button */}
      <Button
        variant="ghost"
        className="rounded-full mb-6 -ml-2"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para alunos
      </Button>

      {/* Student header */}
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {student.displayName}
        </h2>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Fechar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      {loadingKpis ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Total Trades"
            value={String(kpis.total_trades)}
            icon={<BarChart3 className="h-4 w-4" />}
            index={0}
          />
          <KpiCard
            label="Win Rate"
            value={`${kpis.win_rate.toFixed(1)}%`}
            icon={<Target className="h-4 w-4" />}
            index={1}
          />
          <KpiCard
            label="P&L Total"
            value={kpis.pnl_total.toLocaleString("pt-BR", {
              style: "currency",
              currency: "USD",
            })}
            icon={
              kpis.pnl_total >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
            color={pnlColor(kpis.pnl_total)}
            index={2}
          />
          <KpiCard
            label="P&L Mes"
            value={kpis.pnl_month.toLocaleString("pt-BR", {
              style: "currency",
              currency: "USD",
            })}
            icon={<Calendar className="h-4 w-4" />}
            color={pnlColor(kpis.pnl_month)}
            index={3}
          />
        </div>
      ) : null}

      {/* Trades Table */}
      <Card
        className="rounded-[22px] p-5 mb-8"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <h3 className="font-semibold tracking-tight mb-4">Trades</h3>
        {loadingTrades ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : trades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum trade encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-2 font-medium">Data</th>
                  <th className="px-5 py-2 font-medium">Simbolo</th>
                  <th className="px-5 py-2 font-medium">Direcao</th>
                  <th className="px-5 py-2 font-medium text-right">P&L</th>
                  <th className="px-5 py-2 font-medium text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {new Date(trade.close_time).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-2.5 font-medium">{trade.symbol}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          trade.direction === "buy"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {trade.direction === "buy" ? "Compra" : "Venda"}
                      </span>
                    </td>
                    <td className={`px-5 py-2.5 text-right font-medium ${pnlColor(trade.pnl_usd ?? 0)}`}>
                      {(trade.pnl_usd ?? 0) >= 0 ? "+" : ""}
                      {(trade.pnl_usd ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-medium ${pnlColor(trade.net_pnl_usd ?? 0)}`}>
                      {(trade.net_pnl_usd ?? 0) >= 0 ? "+" : ""}
                      {(trade.net_pnl_usd ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mentor Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold tracking-tight">Notas do Mentor</h3>

        <NoteForm onSubmit={handleAddNote} submitting={submittingNote} />

        {loadingNotes ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma nota adicionada ainda.
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div
                key={note.id}
                className="mb-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: easeApple }}
              >
                <NoteItem
                  note={note}
                  onDelete={handleDeleteNote}
                  deleting={deletingNote}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export default function MentorPage() {
  const [codes, setCodes] = useState<MentorCode[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch codes
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingCodes(false);
    }, SAFETY_TIMEOUT);

    async function load() {
      try {
        const json = await apiFetch("/api/mentor/codes");
        if (mounted) setCodes(json.codes ?? []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar codigos");
      } finally {
        if (mounted) setLoadingCodes(false);
      }
    }
    load();
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, []);

  // Fetch students
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingStudents(false);
    }, SAFETY_TIMEOUT);

    async function load() {
      try {
        const json = await apiFetch("/api/mentor/students");
        if (mounted) setStudents(json.students ?? []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar alunos");
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    }
    load();
    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, []);

  const fetchCodes = useCallback(async () => {
    try {
      const json = await apiFetch("/api/mentor/codes");
      setCodes(json.codes ?? []);
    } catch {}
  }, []);

  const handleGenerateCode = async () => {
    setGenerating(true);
    try {
      await apiFetch("/api/mentor/generate-code", { method: "POST" });
      await fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar codigo");
    } finally {
      setGenerating(false);
    }
  };

  // ─── Student Detail View ─────────────────────────────────────────
  if (selectedStudent) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <StudentDetail
          student={selectedStudent}
          onBack={() => setSelectedStudent(null)}
        />
      </div>
    );
  }

  // ─── Student List View ───────────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeApple }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          Painel do Mentor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o desempenho dos seus alunos
        </p>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeApple }}
          className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400"
        >
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Fechar
          </button>
        </motion.div>
      )}

      {/* Invite Code */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: easeApple }}
        className="mb-8"
      >
        <InviteCodeSection
          codes={codes}
          loadingCodes={loadingCodes}
          onGenerate={handleGenerateCode}
          generating={generating}
        />
      </motion.div>

      {/* Students Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: easeApple }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Alunos</h2>
          {!loadingStudents && (
            <span className="text-sm text-muted-foreground">
              ({students.length})
            </span>
          )}
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : students.length === 0 ? (
          <Card
            className="rounded-[22px] p-10 text-center"
            style={{ backgroundColor: "hsl(var(--card))" }}
          >
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum aluno vinculado ainda. Compartilhe seu codigo de convite!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                onClick={() => setSelectedStudent(student)}
                index={i}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
