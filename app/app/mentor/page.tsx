"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Search,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";
import { useEntitlements } from "@/hooks/use-entitlements";
import { MentorOnboardingModal } from "@/components/mentor/MentorOnboardingModal";
import { StudentFeedbackFeed } from "@/components/mentor/StudentFeedbackFeed";
import { useAppT } from "@/hooks/useAppLocale";

// ─── Constants ───────────────────────────────────────────────────────
const easeApple = [0.16, 1, 0.3, 1] as const;
const SAFETY_TIMEOUT = 6000;

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
  linkedAt: string;
  lastAccountName: string | null;
  lastAccountBalance: number;
  lastAccountPnl: number;
  lastAccountTotalTrades: number;
  lastTradeDate: string | null;
}

interface AccountKpi {
  accountId: string;
  accountName: string;
  kind: string;
  balance: number;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  pnlMonth: number;
  lastTradeDate: string | null;
}

interface AggregateKpis {
  totalTrades: number;
  netPnl: number;
  pnlMonth: number;
  balance: number;
  winRate: number;
}

interface StudentTrade {
  id: string;
  closed_at: string;
  symbol: string;
  direction: "buy" | "sell";
  pnl_usd: number;
  net_pnl_usd: number;
  account_id: string;
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
  } = await safeGetSession();
  if (!session) throw new Error("Sessão expirada");
  const res = await fetch(path, {
    ...options,
    cache: "no-store",
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

function formatUsd(value: number, withSign = false): string {
  const formatted = value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
  });
  if (withSign && value > 0) return `+${formatted}`;
  return formatted;
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
          <h2 className="text-lg font-semibold tracking-tight">Código de Convite</h2>
          <p className="text-sm text-muted-foreground">
            Compartilhe com seus alunos para vinculá-los
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
          Gerar novo código
        </Button>
      </div>

      {loadingCodes ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum código gerado ainda. Clique em &ldquo;Gerar novo código&rdquo; acima.
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
                  {c.status === "active" ? "Vinculado" : c.status === "pending" ? "Disponível" : "Revogado"}
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
  const hasActivity = student.lastAccountName !== null;
  const pnl = student.lastAccountPnl ?? 0;
  const isPositive = pnl >= 0;

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
        <div className="mb-3">
          <h3 className="font-semibold tracking-tight truncate">
            {student.displayName}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {student.lastAccountName ?? "Sem conta"}
          </p>
        </div>

        {!hasActivity ? (
          <p className="text-sm text-muted-foreground">Sem operações ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">P&L Geral</p>
              <p
                className={`text-sm font-semibold ${
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatUsd(pnl, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Saldo Atual</p>
              <p className="text-sm font-semibold">
                {formatUsd(student.lastAccountBalance ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total Trades</p>
              <p className="text-sm font-semibold">{student.lastAccountTotalTrades ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Último Trade</p>
              <p className="text-sm font-semibold text-muted-foreground">
                {student.lastTradeDate
                  ? new Date(student.lastTradeDate).toLocaleDateString("pt-BR")
                  : "—"}
              </p>
            </div>
          </div>
        )}
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
  const t = useAppT();
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
            Observação
          </Label>
          <textarea
            id="note-content"
            className="mt-1.5 w-full rounded-xl border bg-transparent px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Escreva suas observações sobre o aluno..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-sm mb-1.5 block">{t("mentor.note.ratingLabel")}</Label>
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
  const [accounts, setAccounts] = useState<AccountKpi[]>([]);
  const [aggregate, setAggregate] = useState<AggregateKpis | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [trades, setTrades] = useState<StudentTrade[]>([]);
  const [notes, setNotes] = useState<MentorNote[]>([]);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const json = await apiFetch(`/api/mentor/notes?student_id=${student.id}`);
      setNotes(json.notes ?? []);
    } catch {
      // Notes are non-critical
    } finally {
      setLoadingNotes(false);
    }
  }, [student.id]);

  useEffect(() => {
    let mounted = true;

    // Standalone safety timers — fire independently of fetch resolution.
    // Same pattern as app/app/settings/page.tsx (convergent fallback).
    const safetyKpis = setTimeout(() => {
      if (!mounted) return;
      setLoadingKpis(false);
      console.warn("[load-safety] mentor student kpis fallback");
    }, SAFETY_TIMEOUT);
    const safetyTrades = setTimeout(() => {
      if (!mounted) return;
      setLoadingTrades(false);
      console.warn("[load-safety] mentor student trades fallback");
    }, SAFETY_TIMEOUT);
    const safetyNotes = setTimeout(() => {
      if (!mounted) return;
      setLoadingNotes(false);
      console.warn("[load-safety] mentor student notes fallback");
    }, SAFETY_TIMEOUT);

    (async () => {
      const [kpisR, journalR, notesR] = await Promise.allSettled([
        apiFetch(`/api/mentor/student/${student.id}/kpis`),
        apiFetch(`/api/mentor/student/${student.id}/journal`),
        apiFetch(`/api/mentor/notes?student_id=${student.id}`),
      ]);
      if (!mounted) return;

      if (kpisR.status === "fulfilled") {
        const accs: AccountKpi[] = kpisR.value.accounts ?? [];
        setAccounts(accs);
        setAggregate(kpisR.value.aggregate ?? null);
        const lastUsed = accs
          .filter((a) => a.lastTradeDate)
          .sort((a, b) => (b.lastTradeDate! > a.lastTradeDate! ? 1 : -1))[0];
        setActiveAccountId(lastUsed?.accountId ?? accs[0]?.accountId ?? null);
      } else {
        setError("Erro ao carregar KPIs");
      }

      if (journalR.status === "fulfilled") {
        setTrades(journalR.value.trades ?? []);
      } else {
        setError((e) => e ?? "Erro ao carregar trades");
      }

      if (notesR.status === "fulfilled") {
        setNotes(notesR.value.notes ?? []);
      }

      clearTimeout(safetyKpis);
      clearTimeout(safetyTrades);
      clearTimeout(safetyNotes);
      setLoadingKpis(false);
      setLoadingTrades(false);
      setLoadingNotes(false);
    })();

    return () => {
      mounted = false;
      clearTimeout(safetyKpis);
      clearTimeout(safetyTrades);
      clearTimeout(safetyNotes);
    };
  }, [student.id]);

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

  const activeAccount = useMemo(
    () => accounts.find((a) => a.accountId === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );

  const visibleTrades = useMemo(
    () => (activeAccountId ? trades.filter((t) => t.account_id === activeAccountId) : trades),
    [trades, activeAccountId],
  );

  const aggregateHasTrades = (aggregate?.totalTrades ?? 0) > 0;

  return (
    <div>
      <Button
        variant="ghost"
        className="rounded-full mb-6 -ml-2"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para alunos
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {student.displayName}
        </h2>
      </div>

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

      {loadingKpis ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length > 0 ? (
        <>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Contas de {student.displayName ?? "do aluno"}
          </h3>
          {accounts.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {accounts.map((a) => (
                <button
                  key={a.accountId}
                  type="button"
                  onClick={() => setActiveAccountId(a.accountId)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    activeAccountId === a.accountId
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {a.accountName}
                </button>
              ))}
            </div>
          )}

          {activeAccount ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                label="Saldo Atual"
                value={formatUsd(activeAccount.balance)}
                icon={<Wallet className="h-4 w-4" />}
                index={0}
              />
              <KpiCard
                label="P&L Geral"
                value={formatUsd(activeAccount.netPnl, true)}
                icon={
                  activeAccount.netPnl >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )
                }
                color={pnlColor(activeAccount.netPnl)}
                index={1}
              />
              <KpiCard
                label="Win Rate"
                value={`${activeAccount.winRate.toFixed(1)}%`}
                icon={<Target className="h-4 w-4" />}
                index={2}
              />
              <KpiCard
                label="Total Trades"
                value={String(activeAccount.totalTrades)}
                icon={<BarChart3 className="h-4 w-4" />}
                index={3}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Esse aluno ainda não registrou trades.
            </p>
          )}
        </>
      ) : null}

      <Card
        className="rounded-[22px] p-5 mb-8"
        style={{ backgroundColor: "hsl(var(--card))" }}
      >
        <h3 className="font-semibold tracking-tight mb-4">Trades</h3>
        {loadingTrades ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : visibleTrades.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {aggregateHasTrades
              ? "Sincronizando trades — recarregue em alguns segundos."
              : "Nenhum trade encontrado."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-5 py-2 font-medium">Data</th>
                  <th className="px-5 py-2 font-medium">Símbolo</th>
                  <th className="px-5 py-2 font-medium">Direção</th>
                  <th className="px-5 py-2 font-medium text-right">P&L</th>
                  <th className="px-5 py-2 font-medium text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody>
                {visibleTrades.map((trade) => (
                  <tr
                    key={trade.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-muted-foreground">
                      {new Date(trade.closed_at).toLocaleDateString("pt-BR")}
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
                      {formatUsd(trade.pnl_usd ?? 0, true)}
                    </td>
                    <td className={`px-5 py-2.5 text-right font-medium ${pnlColor(trade.net_pnl_usd ?? 0)}`}>
                      {formatUsd(trade.net_pnl_usd ?? 0, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

// ─── Unlinked Student View ───────────────────────────────────────────

function UnlinkedStudentView({ onLinked }: { onLinked: () => void }) {
  const t = useAppT();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/mentor/link", {
        method: "POST",
        body: JSON.stringify({ code: trimmed }),
      });
      setSuccess(true);
      setTimeout(() => onLinked(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeApple }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">{t("mentor.title.mentoria")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t("mentor.empty.unlinked")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: easeApple }}
      >
        <Card
          className="rounded-[22px] p-6 sm:p-8"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight mb-1">
              Vincular com código de convite
            </h2>
            <p className="text-sm text-muted-foreground">
              Seu mentor gerou um código no painel dele. Insira aqui para receber feedback
              nos seus trades e anotações diárias.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="mentor-code">Código do mentor</Label>
              <Input
                id="mentor-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="EX: ABCD-1234"
                className="font-mono tracking-wider uppercase"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={submitting || success}
                maxLength={32}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Mentor vinculado! Carregando seu feed...
              </p>
            )}

            <Button
              type="submit"
              disabled={submitting || success || code.trim().length === 0}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Vinculando...
                </>
              ) : (
                "Vincular mentor"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/60">
            <p className="text-xs text-muted-foreground">
              Ainda não tem mentor? O programa é por convite — peça o código para o seu mentor
              responsável. Se você é mentor e quer criar convites, acesse{" "}
              <span className="font-medium text-foreground">Configurações → Planos</span>{" "}
              para ativar o painel.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function MentorPage() {
  const t = useAppT();
  const router = useRouter();
  const { isMentor, isLoading: subLoading } = useEntitlements();
  const [codes, setCodes] = useState<MentorCode[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  // Detect if the current user is a student with an active mentor relationship
  useEffect(() => {
    if (subLoading) return;
    if (isMentor) {
      setIsStudent(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const {
          data: { session },
        } = await safeGetSession();
        if (!session) {
          if (mounted) setIsStudent(false);
          return;
        }
        const { data, error } = await supabase
          .from("mentor_relationships")
          .select("id")
          .eq("student_id", session.user.id)
          .eq("status", "active")
          .limit(1);
        if (error) {
          if (mounted) setIsStudent(false);
          return;
        }
        if (mounted) setIsStudent((data ?? []).length > 0);
      } catch {
        if (mounted) setIsStudent(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [subLoading, isMentor]);

  // Non-mentor, non-student users now see an empty-state with invite-code input
  // (no more silent redirect to /app)

  useEffect(() => {
    if (subLoading || !isMentor) return;
    let mounted = true;
    (async () => {
      try {
        const {
          data: { session },
        } = await safeGetSession();
        if (!session) return;
        const { data, error } = await supabase
          .from("profiles")
          .select("mentor_onboarded_at")
          .eq("id", session.user.id)
          .maybeSingle();
        if (error) return;
        if (mounted && data && data.mentor_onboarded_at === null) {
          setShowOnboarding(true);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [subLoading, isMentor]);

  useEffect(() => {
    if (!isMentor) return;
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingCodes(false);
    }, SAFETY_TIMEOUT);

    (async () => {
      try {
        const json = await apiFetch("/api/mentor/codes");
        if (mounted) setCodes(json.codes ?? []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar códigos");
      } finally {
        if (mounted) setLoadingCodes(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, [isMentor]);

  useEffect(() => {
    if (!isMentor) return;
    let mounted = true;
    const safety = setTimeout(() => {
      if (mounted) setLoadingStudents(false);
    }, SAFETY_TIMEOUT);

    (async () => {
      try {
        const json = await apiFetch("/api/mentor/students");
        if (mounted) setStudents(json.students ?? []);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar alunos");
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(safety);
    };
  }, [isMentor]);

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
      setError(err instanceof Error ? err.message : "Erro ao gerar código");
    } finally {
      setGenerating(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [students, studentSearch]);

  if (subLoading || (!isMentor && isStudent === null)) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 overflow-x-hidden flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isMentor && isStudent) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeApple }}
          className="mb-8"
        >
          <div className="flex items-center gap-3">
            <Star className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("mentor.title.studentFeedback")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("mentor.subtitle.studentFeedback")}
          </p>
        </motion.div>
        <StudentFeedbackFeed />
      </div>
    );
  }

  if (!isMentor && isStudent === false) {
    return <UnlinkedStudentView onLinked={() => setIsStudent(true)} />;
  }

  if (!isMentor) {
    return null;
  }

  if (selectedStudent) {
    return (
      <>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 overflow-x-hidden">
          <StudentDetail
            student={selectedStudent}
            onBack={() => setSelectedStudent(null)}
          />
        </div>
        <MentorOnboardingModal
          open={showOnboarding}
          onComplete={() => setShowOnboarding(false)}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeApple }}
        className="mb-8"
      >
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("mentor.title.panel")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t("mentor.subtitle.panel")}
        </p>
      </motion.div>

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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: easeApple }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold tracking-tight">{t("mentor.section.students")}</h2>
          {!loadingStudents && (
            <span className="text-sm text-muted-foreground">
              ({students.length})
            </span>
          )}
        </div>

        {students.length > 0 && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno por nome..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9 rounded-full"
            />
          </div>
        )}

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
              Nenhum aluno vinculado ainda. Compartilhe seu código de convite!
            </p>
          </Card>
        ) : filteredStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            Nenhum aluno encontrado.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student, i) => (
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
      <MentorOnboardingModal
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
