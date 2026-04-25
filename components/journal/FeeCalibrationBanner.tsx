"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

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

/**
 * Surface for back-solving per-contract fees from a fee-less broker export
 * (Tradovate Position History etc.). Asks the user for the broker statement
 * balance, calls /api/account/[id]/calibrate-fees, and reports back.
 *
 * The user never has to compute fees themselves — they just paste what their
 * broker shows. The API back-solves fee/contract from the imported gross PnL
 * and saves it on the account so subsequent imports reuse it automatically.
 */
export function FeeCalibrationBanner({
  accountId,
  accessToken,
  onCalibrated,
}: Props) {
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving" | "done" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{
    feePerContractRoundTurn: number | null;
    tradesUpdated: number;
    estimatedFeesTotal: number;
    mode: "per_contract" | "per_trade";
  } | null>(null);

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
                    ${result.feePerContractRoundTurn.toFixed(4)}
                  </strong>{" "}
                  · {result.tradesUpdated} trades ajustadas · taxa total
                  estimada: ${Math.abs(result.estimatedFeesTotal).toFixed(2)}
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
                  estimada: ${Math.abs(result.estimatedFeesTotal).toFixed(2)}
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
            O Position History do seu broker (Tradovate / similar) não
            exporta taxas. Para o saldo bater, informe o saldo total da sua
            conta no broker e o sistema calibra a taxa por contrato sozinho.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">USD</span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="100.682,25"
              className="flex-1 max-w-[180px] rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              disabled={phase === "saving"}
            />
            <button
              onClick={submit}
              disabled={phase === "saving" || !value}
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
