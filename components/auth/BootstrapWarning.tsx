"use client";

import { useEffect, useState } from "react";
import { BOOTSTRAP_FAILED_KEY } from "@/lib/bootstrap";

export function BootstrapWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(BOOTSTRAP_FAILED_KEY) === "1") {
      setShow(true);
    }
  }, []);

  function dismiss() {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(BOOTSTRAP_FAILED_KEY);
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="alert"
      className="mx-auto max-w-7xl px-6 py-2 text-center text-sm text-muted-foreground"
    >
      <span>
        Não foi possível criar algumas contas padrão. Você pode tentar novamente mais tarde ou criar manualmente.
      </span>{" "}
      <button
        type="button"
        onClick={dismiss}
        className="font-medium text-foreground underline hover:no-underline"
      >
        Dispensar
      </button>
    </div>
  );
}
