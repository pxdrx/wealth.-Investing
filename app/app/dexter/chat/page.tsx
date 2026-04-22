"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DexterChatPage() {
  const t = useTranslations("dexter");
  return (
    <div
      className="mx-auto flex max-w-xl flex-col items-center rounded-[22px] border border-border/60 p-10 text-center"
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
        <MessageCircle className="h-6 w-6 text-blue-500" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">Chat</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("placeholder")}</p>
      <p className="mt-4 text-xs text-muted-foreground/70">
        A versão completa do chat vive em{" "}
        <a href="/app/dexter/coach" className="underline hover:text-foreground">
          /app/dexter/coach
        </a>
        .
      </p>
    </div>
  );
}
