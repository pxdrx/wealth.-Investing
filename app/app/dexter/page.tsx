import { redirect } from "next/navigation";

export default function DexterIndexPage(): never {
  // C-06: default tab = chat.
  redirect("/app/dexter/chat");
}
