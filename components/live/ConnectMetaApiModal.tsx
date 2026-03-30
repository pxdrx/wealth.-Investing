"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Wifi, CheckCircle2, AlertCircle } from "lucide-react";
import { useLiveMonitoringContext } from "@/components/context/LiveMonitoringContext";

interface ConnectMetaApiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
}

type Step = "intro" | "form" | "connecting" | "success" | "error";

export function ConnectMetaApiModal({ open, onOpenChange, accountName }: ConnectMetaApiModalProps) {
  const { connect } = useLiveMonitoringContext();
  const [step, setStep] = useState<Step>("intro");
  const [brokerLogin, setBrokerLogin] = useState("");
  const [brokerServer, setBrokerServer] = useState("");
  const [investorPassword, setInvestorPassword] = useState("");
  const [platform, setPlatform] = useState<"mt5" | "mt4">("mt5");
  const [errorMsg, setErrorMsg] = useState("");

  function reset() {
    setStep("intro");
    setBrokerLogin("");
    setBrokerServer("");
    setInvestorPassword("");
    setErrorMsg("");
  }

  function handleClose(val: boolean) {
    if (!val) reset();
    onOpenChange(val);
  }

  async function handleConnect() {
    setStep("connecting");
    const result = await connect(brokerLogin, brokerServer, investorPassword, platform);
    if (result.ok) {
      setStep("success");
    } else {
      setErrorMsg(result.error ?? "Erro desconhecido");
      setStep("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: "hsl(var(--card))" }}>
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-indigo-500" />
                Monitoramento ao Vivo
              </DialogTitle>
              <DialogDescription>
                Conecte sua conta MT5 para monitorar equity, drawdown e posições em tempo real.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 rounded-[16px] border border-border/40 p-4">
                <Shield className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Conexão segura e somente leitura</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usamos sua senha investor (somente leitura). Não é possível abrir, fechar ou modificar operações. Sua senha é criptografada e nunca armazenada em texto puro.
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep("form")}>
                Conectar conta: {accountName}
              </Button>
            </div>
          </>
        )}

        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>Credenciais MT5</DialogTitle>
              <DialogDescription>
                Insira as credenciais da sua conta de mesa proprietária.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="broker-login">Login (número da conta)</Label>
                <Input
                  id="broker-login"
                  placeholder="12345678"
                  value={brokerLogin}
                  onChange={(e) => setBrokerLogin(e.target.value)}
                  className="rounded-[12px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker-server">Servidor do broker</Label>
                <Input
                  id="broker-server"
                  placeholder="FTMO-Server3"
                  value={brokerServer}
                  onChange={(e) => setBrokerServer(e.target.value)}
                  className="rounded-[12px]"
                />
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
                />
              </div>
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <div className="flex gap-2">
                  {(["mt5", "mt4"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                        platform === p
                          ? "bg-foreground text-background"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("intro")} className="flex-1">
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

        {step === "connecting" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-muted-foreground">Conectando à sua conta...</p>
            <p className="text-xs text-muted-foreground">Isso pode levar até 2 minutos.</p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">Conta conectada com sucesso!</p>
            <p className="text-xs text-muted-foreground text-center">
              O monitoramento ao vivo está ativo. Você receberá alertas quando o drawdown se aproximar dos limites configurados.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">
              Fechar
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Erro ao conectar</p>
            <p className="text-xs text-muted-foreground text-center">{errorMsg}</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setStep("form")}>
                Tentar novamente
              </Button>
              <Button variant="ghost" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
