"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Wifi, CheckCircle2, AlertCircle, ChevronRight, Monitor, Key, Server, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface ConnectMetaApiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  accountId: string | null;
  onConnected: () => void;
}

type Step = "intro" | "tutorial" | "form" | "connecting" | "success" | "error";

const TUTORIAL_STEPS = [
  {
    number: 1,
    icon: Monitor,
    title: "Abra o MetaTrader 5",
    description: "Abra o terminal MT5 onde sua conta de prop firm está logada.",
  },
  {
    number: 2,
    icon: Key,
    title: "Encontre o Login e Servidor",
    description: "Vá em Arquivo → Abrir uma Conta ou veja no canto inferior direito do MT5. O login é o número da conta e o servidor aparece ao lado.",
  },
  {
    number: 3,
    icon: Key,
    title: "Encontre a Senha Investor",
    description: "A senha investor foi enviada pelo broker junto com as credenciais da conta. Se não tiver, vá em Ferramentas → Opções → Servidor → Alterar → selecione \"Investor (somente leitura)\" e crie uma nova.",
  },
  {
    number: 4,
    icon: Server,
    title: "Preencha no formulário",
    description: "Cole o login, servidor e senha investor no próximo passo. A conexão é somente leitura — não é possível abrir ou fechar operações.",
  },
];

const PROGRESS_MESSAGES = [
  "Validando credenciais...",
  "Provisionando terminal cloud...",
  "Conectando ao broker...",
  "Sincronizando conta...",
  "Obtendo dados da conta...",
  "Quase lá...",
];

export function ConnectMetaApiModal({ open, onOpenChange, accountName, accountId, onConnected }: ConnectMetaApiModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [brokerLogin, setBrokerLogin] = useState("");
  const [brokerServer, setBrokerServer] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [platform, setPlatform] = useState<"mt5" | "mt4">("mt5");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MESSAGES[0]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const abortRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reset() {
    setStep("intro");
    setBrokerLogin("");
    setBrokerServer("");
    setInvestorPassword("");
    setErrorMsg("");
    setShowHelp(false);
    setProgressPct(0);
    setProgressMsg(PROGRESS_MESSAGES[0]);
    setElapsedSec(0);
    abortRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleClose(val: boolean) {
    if (step === "connecting") return; // Don't close while connecting
    if (!val) {
      abortRef.current = true;
      reset();
    }
    onOpenChange(val);
  }

  async function handleConnect() {
    if (!accountId) return;
    abortRef.current = false;
    setStep("connecting");
    setProgressPct(5);
    setProgressMsg(PROGRESS_MESSAGES[0]);
    setElapsedSec(0);

    // Timer for elapsed seconds
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      // Step 1: Provision (fast)
      setProgressPct(10);
      setProgressMsg(PROGRESS_MESSAGES[1]);

      const res = await fetch("/api/metaapi/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountId,
          brokerLogin,
          brokerServer,
          investorPassword,
          platform,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Erro ao provisionar conta");
      }

      // Step 2: Poll deploy
      setProgressPct(25);
      setProgressMsg(PROGRESS_MESSAGES[2]);

      const MAX_ATTEMPTS = 18; // 18 * 10s = 3 minutes
      const POLL_DELAY = 10_000;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (abortRef.current) return;

        await new Promise((resolve) => setTimeout(resolve, POLL_DELAY));
        if (abortRef.current) return;

        // Update progress bar smoothly
        const pct = Math.min(90, 25 + (attempt / MAX_ATTEMPTS) * 65);
        setProgressPct(pct);
        const msgIdx = Math.min(
          PROGRESS_MESSAGES.length - 1,
          Math.floor((attempt / MAX_ATTEMPTS) * PROGRESS_MESSAGES.length) + 2
        );
        setProgressMsg(PROGRESS_MESSAGES[msgIdx]);

        const deployRes = await fetch("/api/metaapi/deploy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ accountId }),
        });

        const deployJson = await deployRes.json();

        // Server returned an error (ok: false) — fail immediately
        if (!deployJson.ok) {
          throw new Error(deployJson.error || "Erro ao verificar status da conexão");
        }

        const status = deployJson.data?.connectionStatus;

        if (status === "connected") {
          setProgressPct(95);
          setProgressMsg("Sincronizando histórico de trades...");

          // Trigger initial trade sync (non-blocking — don't fail connection on sync error)
          fetch("/api/metaapi/sync-trades", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ accountId }),
          }).catch(() => {}); // fire-and-forget

          setProgressPct(100);
          setProgressMsg("Conectado!");
          if (timerRef.current) clearInterval(timerRef.current);
          onConnected();
          setStep("success");
          return;
        }

        if (status === "error") {
          throw new Error(deployJson.data?.error || "Erro na conexão com o broker");
        }

        // Show real MetaAPI state in progress
        const metaState = deployJson.data?.metaApiState;
        const brokerState = deployJson.data?.brokerConnection;
        if (metaState === "DEPLOYING") setProgressMsg("Ativando terminal cloud...");
        else if (metaState === "DEPLOYED" && brokerState === "DISCONNECTED") setProgressMsg("Terminal ativo, conectando ao broker...");
        else if (metaState === "DEPLOYED") setProgressMsg("Conectando ao broker...");
        else if (metaState) setProgressMsg(`Estado: ${metaState}...`);

        // After ~90s, warn user it's taking longer
        if (attempt >= 9) setProgressMsg("Demorando mais que o normal... Verificando credenciais...");
        // Still "connecting" — continue polling
      }

      throw new Error("A conexão demorou mais de 3 minutos. Verifique se as credenciais estão corretas e tente novamente.");
    } catch (err) {
      if (abortRef.current) return;
      const msg = (err as Error).message || "Erro desconhecido";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  function handleCancel() {
    abortRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setStep("form");
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[520px]"
        style={{ backgroundColor: "hsl(var(--card))" }}
        onInteractOutside={(e) => { if (step === "connecting") e.preventDefault(); }}
      >

        {/* ── Step: Intro ── */}
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-indigo-500" />
                Monitoramento ao Vivo
              </DialogTitle>
              <DialogDescription>
                Acompanhe equity, drawdown e posições da sua conta em tempo real, direto no dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 rounded-[16px] border border-emerald-200/60 dark:border-emerald-800/40 p-4">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">100% seguro e somente leitura</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usamos a senha investor do MT5, que permite apenas visualizar dados. Nenhuma operação pode ser aberta, fechada ou modificada. Sua senha é criptografada com AES-256.
                  </p>
                </div>
              </div>
              <div className="rounded-[16px] border border-border/40 p-4 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">O que você ganha</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Equity e balance atualizados em tempo real
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Drawdown diário e geral com barras visuais
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Alertas automáticos quando DD se aproxima do limite
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                    Contagem de posições abertas
                  </li>
                </ul>
              </div>
              <Button className="w-full gap-2" onClick={() => setStep("tutorial")}>
                Como conectar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Tutorial ── */}
        {step === "tutorial" && (
          <>
            <DialogHeader>
              <DialogTitle>Como encontrar suas credenciais</DialogTitle>
              <DialogDescription>
                Siga estes 4 passos para conectar sua conta MT5.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {TUTORIAL_STEPS.map((s) => (
                <div
                  key={s.number}
                  className="flex items-start gap-3 rounded-[16px] border border-border/40 p-3.5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                    {s.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("intro")} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={() => setStep("form")} className="flex-1 gap-2">
                  Tenho os dados
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: Form ── */}
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Credenciais da Conta</DialogTitle>
              <DialogDescription>
                Cole os dados da sua conta MT5 de prop firm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="broker-login">Login (número da conta)</Label>
                <Input
                  id="broker-login"
                  placeholder="Ex: 12345678"
                  value={brokerLogin}
                  onChange={(e) => setBrokerLogin(e.target.value)}
                  className="rounded-[12px]"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground">Encontre no canto inferior direito do MT5</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker-server">Servidor do broker</Label>
                <Input
                  id="broker-server"
                  placeholder="Ex: FTMO-Server3, The5ers-Live"
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                  className="rounded-[12px]"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground">Aparece ao lado do login no MT5</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor-password">Senha Investor (somente leitura)</Label>
                <Input
                  id="investor-password"
                  type="password"
                  placeholder="••••••••"
                  value={investorPassword}
                  onChange={(e) => setInvestorPassword(e.target.value)}
                  className="rounded-[12px]"
                  autoComplete="off"
                />
                <p className="text-[10px] text-muted-foreground">Diferente da senha master. Veio no email do broker</p>
              </div>
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <div className="flex gap-2">
                  {(["mt5", "mt4"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                        platform === p
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Não sei onde encontrar esses dados
              </button>
              {showHelp && (
                <div className="rounded-[12px] bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                  <p><strong>Login:</strong> Número da conta, canto inferior direito do MT5.</p>
                  <p><strong>Servidor:</strong> Ao lado do login. Ex: FTMO-Server3.</p>
                  <p><strong>Senha Investor:</strong> Veio no email do broker. Se perdeu: Ferramentas → Opções → Servidor → Alterar → &ldquo;Investor&rdquo;.</p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setStep("tutorial")} className="flex-1">
                  Voltar
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={!brokerLogin || !brokerServer || !investorPassword}
                  className="flex-1"
                >
                  Conectar
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ── Step: Connecting (with progress bar) ── */}
        {step === "connecting" && (
          <div className="py-8 space-y-6">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
              <p className="text-sm font-medium">Conectando à sua conta...</p>
              <p className="text-xs text-muted-foreground">Não feche esta janela.</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{progressMsg}</span>
                <span>{elapsedSec}s</span>
              </div>
            </div>

            {/* Info */}
            <div className="rounded-[12px] bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p>Estamos provisionando um terminal cloud seguro para sua conta.</p>
              <p>Esse processo pode levar até 3 minutos na primeira conexão.</p>
              <p>Nas próximas vezes será instantâneo.</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="w-full text-xs text-muted-foreground"
            >
              Cancelar
            </Button>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <div className="text-center">
              <p className="text-sm font-medium">Conta conectada com sucesso!</p>
              <p className="text-xs text-muted-foreground mt-1">
                O monitoramento ao vivo está ativo.
              </p>
            </div>
            <div className="rounded-[12px] bg-muted/50 p-3 text-xs text-muted-foreground space-y-1 w-full">
              <p>Alertas padrão configurados:</p>
              <p>• DD Diário: aviso em <strong>4%</strong>, crítico em <strong>4.5%</strong></p>
              <p>• DD Geral: aviso em <strong>8%</strong>, crítico em <strong>9%</strong></p>
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }} className="mt-1">
              Ir para o Dashboard
            </Button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Erro ao conectar</p>
              <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
            </div>
            <div className="rounded-[12px] bg-muted/50 p-3 text-xs text-muted-foreground space-y-1 w-full">
              <p className="font-medium">Verifique:</p>
              <p>• O login é o número da conta (só dígitos)</p>
              <p>• O servidor está escrito exatamente como aparece no MT5</p>
              <p>• A senha é a investor (somente leitura), não a master</p>
              <p>• A conta MT5 está ativa e não expirada</p>
            </div>
            <div className="flex gap-2 mt-1">
              <Button variant="outline" onClick={() => setStep("form")}>
                Corrigir dados
              </Button>
              <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
