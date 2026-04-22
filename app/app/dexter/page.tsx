import { redirect } from "next/navigation";

export default function DexterIndexPage(): never {
  // The `/chat` tab is a placeholder stub (C-07 pending). The real chat UI
  // lives under `/coach` — redirect there so `/app/dexter` is never empty.
  redirect("/app/dexter/coach");
}
