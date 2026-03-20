"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/journal");
  }, [router]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Redirecionando para o Journal...</p>
      </div>
    </div>
  );
}
