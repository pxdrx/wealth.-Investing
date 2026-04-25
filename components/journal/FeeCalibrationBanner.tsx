"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";

interface Props {
  accountId: string;
  accessToken: string;
  /** Called after a successful calibration so the parent can reload trades. */
  onCalibrated: (info: {
    feePerContractRoundTurn: number | null;
    tradesUpdated: number;
    estimatedFeesTotal: number;
    mode: "per_contract" | "per_trade";
  }) => void;
}

interface Preflight {
  starting_balance_usd: number;
  gross_pnl_usd: number;
  total_contracts: number;
  fee_less_trades: number;
  current_balance_estimate_usd: number;
  fee_per_contract_round_turn: number | null;
}

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

/**
 * Surface for back-solving per-contract fees from a fee-less broker export
 * (Tradovate Position History etc.). Asks the user for the broker statement
 * balance, calls /api/account/[id]/calibrate-fees, and reports back.
 *
 * Shows a pre-flight summary (starting balance, gross PnL, total contracts)
 * so the user can spot data issues — duplicate trades, wrong account
 * selected, etc — before calibrating. Lets them undo the calibration if the
 * solved fee looks wrong.
 */
export function FeeCalibrationBanner({
  accountId,
  accessToken,
  onCalibrated,
}: Props) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<
    "loading" | "idle" | "saving" | "done" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [result, setResult] = useState<{
    feePerContractRoundTurn: number | null;
    tradesUpdated: number;
    estimatedFeesTotal: number;
    mode: "per_contract" | "per_trade";
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/account/${accountId}/calibrate-fees`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.ok !== false) {
          setPreflight({
            starting_balance_usd: Number(data.starting_balance_usd ?? 0),
            gross_pnl_usd: Number(data.gross_pnl_usd ?? 0),
            total_contracts: Number(data.total_contracts ?? 0),
            fee_less_trades: Number(data.fee_less_trades ?? 0),
            current_balance_estimate_usd: Number(
              data.current_balance_estimate_usd ?? 0
            ),
            fee_per_contract_round_turn:
              typeof data.fee_per_contract_round_turn === "number"
                ? data.fee_per_contract_round_turn
                : null,
          });
        }
      } catch {
        /* preflight is informational — silent failure is OK */
      } finally {
        if (!cancelled) setPhase("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, accessToken]);

  async function submit() {
    const num = parseFloat(value.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) {
      setErrorMsg("Informe o saldo total da sua conta no broker (ex: 100682,25).");
      setPhase("error");
      return;
    }
    setPhase("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/account/${accountId}/calibrate-fees`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ actual_balance_usd: num }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        setErrorMsg(data?.error || `Erro ${res.status}`);
        setPhase("error");
        return;
      }
      const info = {
        feePerContractRoundTurn:
          typeof data.fee_per_contract_round_turn === "number"
            ? data.fee_per_contract_round_turn
            : null,
        tradesUpdated: Number(data.trades_updated ?? 0),
        estimatedFeesTotal: Number(data.estimated_fees_total ?? 0),
        mode: (data.mode === "per_trade"
          ? "per_trade"
          : "per_contract") as "per_contract" | "per_trade",
      };
      setResult(info);
      setPhase("done");
      onCalibrated(info);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Falha de rede");
      setPhase("error");
    }
  }

  async function undo() {
    setPhase("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/account/${accountId}/calibrate-fees`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error || `Erro ${res.status}`);
        setPhase("error");
        return;
      }
      setResult(null);
      setValue("");
      onCalibrated({
        feePerContractRoundTurn: null,
        tradesUpdated: 0,
        estimatedFeesTotal: 0,
        mode: "per_contract",
      });
      setPhase("idle");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Falha de rede");
      setPhase("error");
    }
  }

  if (phase === "done" && result) {
    return (
      <div
        className="mt-4 rounded-lg border border-[hsl(var(--pnl-positive)/0.4)] p-3 text-left"
        style={{ backgroundColor: "hsl(var(--pnl-positive)/0.08)" }}
      >
        <div className="flex items-start gap-2">
          <CheckCircle2
            size={16}
            className="mt-0.5 text-[hsl(var(--pnl-positive))]"
          />
          <div className="flex-1 text-xs leading-relaxed">
            <p className="font-medium text-foreground">
              Calibração aplicada — saldo agora bate com o broker.
            </p>
            {result.mode === "per_contract" &&
            result.feePerContractRoundTurn !== null ? (
              <>
                <p className="text-muted-foreground mt-1">
                  Taxa por contrato (round-turn):{" "}
                  <strong>
                    ${fmtUsd(result.feePerContractRoundTurn)}
                  </strong>{" "}
                  · {result.tradesUpdated} trades ajustadas · taxa total
                  estimada: ${fmtUsd(Math.abs(result.estimatedFeesTotal))}
                </p>
                <p className="text-muted-foreground mt-1">
                  Próximas importações desta conta vão aplicar essa taxa
                  automaticamente.
                </p>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-1">
                  {result.tradesUpdated} trades ajustadas · taxa total
                  estimada: ${fmtUsd(Math.abs(result.estimatedFeesTotal))}
                </p>
                <p className="text-muted-foreground mt-1">
                  Como as trades importadas anteriormente não têm volume
                  registrado, a taxa foi distribuída uniformemente entre as
                  trades. Para que próximas importações apliquem a taxa
                  automaticamente por contrato, apague essas trades e
                  re-importe o relatório.
                </p>
              </>
            )}
            <button
              onClick={undo}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={11} />
              Desfazer calibração
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-lg border border-amber-400/40 p-3 text-left"
      style={{ backgroundColor: "hsl(40 95% 55% / 0.06)" }}
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          size={16}
          className="mt-0.5 text-amber-500 dark:text-amber-400"
        />
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground leading-relaxed">
            O Position History do seu broker (Tradovate / similar) não exporta
            taxas. Para o saldo bater, informe o saldo total da sua conta no
            broker e o sistema calibra a taxa por contrato sozinho.
          </p>

          {preflight && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border/60 bg-background/50 p-2 text-[11px] text-muted-foreground">
              <span>Saldo inicial da conta</span>
              <span className="text-right tabular-nums text-foreground">
                ${fmtUsd(preflight.starting_balance_usd)}
              </span>
              <span>PnL bruto importado</span>
              <span className="text-right tabular-nums text-foreground">
                ${fmtUsd(preflight.gross_pnl_usd)}
              </span>
              <span>Saldo atual no app (sem taxas)</span>
              <span className="text-right tabular-nums text-foreground">
                ${fmtUsd(preflight.current_balance_estimate_usd)}
              </span>
              <span>
                Trades / contratos round-turn
              </span>
              <span className="text-right tabular-nums text-foreground">
                {preflight.fee_less_trades} / {preflight.total_contracts}
              </span>
              {preflight.fee_per_contract_round_turn !== null && (
                <>
                  <span className="text-amber-600 dark:text-amber-400">
                    Taxa atual já calibrada
                  </span>
                  <span className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                    ${fmtUsd(preflight.fee_per_contract_round_turn)}
                  </span>
                </>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="100.682,25"
              className="flex-1 max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              disabled={phase === "saving" || phase === "loading"}
            />
            <button
              onClick={submit}
              disabled={
                phase === "saving" || phase === "loading" || !value
              }
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {phase === "saving" ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Calibrando…
                </>
              ) : (
                "Calibrar"
              )}
            </button>
            {preflight?.fee_per_contract_round_turn !== null &&
              preflight?.fee_per_contract_round_turn !== undefined && (
                <button
                  onClick={undo}
                  disabled={phase === "saving"}
                  title="Reseta os fees salvos para tentar de novo"
                  className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RotateCcw size={11} />
                  Resetar
                </button>
              )}
          </div>
          {errorMsg && (
            <p className="mt-2 text-[11px] text-[hsl(var(--pnl-negative))]">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
