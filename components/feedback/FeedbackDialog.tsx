"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import {
  MessageSquare,
  Bug,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Category = "bug" | "erro" | "sugestao" | "analise";

interface CategoryOption {
  value: Category;
  label: string;
  icon: LucideIcon;
}

const CATEGORIES: CategoryOption[] = [
  { value: "bug", label: "Bug", icon: Bug },
  { value: "erro", label: "Erro", icon: AlertTriangle },
  { value: "sugestao", label: "Sugestão", icon: Lightbulb },
  { value: "analise", label: "Análise", icon: BarChart3 },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category | "">("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const resetForm = () => {
    setCategory("");
    setMessage("");
    setStatus("idle");
    setErrorMsg("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetForm();
  };

  const handleSubmit = async () => {
    if (!category || message.trim().length < 10) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg("Sessão expirada. Faça login novamente.");
        setStatus("error");
        return;
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category, message: message.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        setErrorMsg(json.error ?? "Erro ao enviar feedback.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => handleOpenChange(false), 1500);
    } catch {
      setErrorMsg("Erro de conexão. Tente novamente.");
      setStatus("error");
    }
  };

  const isValid = category !== "" && message.trim().length >= 10;

  return (
    <section className="mt-12 text-center">
      <h2 className="text-lg font-semibold tracking-tight">Sua opinião importa</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Encontrou um problema ou tem uma sugestão? Nos conte.
      </p>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <Button
          variant="outline"
          className="mt-4 gap-2 rounded-full"
          onClick={() => setOpen(true)}
        >
          <MessageSquare className="h-4 w-4" />
          Enviar feedback
        </Button>

        <DialogContent
          className="rounded-[24px] sm:max-w-md"
          style={{ backgroundColor: "hsl(var(--card))" }}
        >
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold">Obrigado pelo seu feedback!</p>
              <p className="text-sm text-muted-foreground">
                Sua mensagem foi enviada com sucesso.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Enviar feedback</DialogTitle>
                <DialogDescription>
                  Selecione uma categoria e descreva seu feedback.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Category selection */}
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const selected = category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setCategory(cat.value)}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            selected
                              ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "border-border text-muted-foreground hover:bg-muted/40"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="feedback-message">Mensagem</Label>
                  <Textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Descreva o bug, erro, sugestão ou análise..."
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo de 10 caracteres ({message.trim().length}/10)
                  </p>
                </div>

                {/* Error message */}
                {errorMsg && (
                  <p className="text-sm text-red-500">{errorMsg}</p>
                )}

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={!isValid || status === "loading"}
                  className="w-full rounded-full"
                >
                  {status === "loading" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  {status === "loading" ? "Enviando..." : "Enviar feedback"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
