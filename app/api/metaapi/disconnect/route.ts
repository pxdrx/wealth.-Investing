import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { removeAccount } from "@/lib/metaapi/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // 1. Auth
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseClientForUser(token);
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  // 2. Parse body
  const body = await req.json().catch(() => ({}));
  const accountId = body.accountId as string | undefined;

  if (!accountId) {
    return NextResponse.json({ ok: false, error: "accountId obrigatório" }, { status: 400 });
  }

  // 3. Find connection
  const { data: conn, error: connErr } = await supabase
    .from("metaapi_connections")
    .select("id, metaapi_account_id")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (connErr || !conn) {
    return NextResponse.json({ ok: false, error: "Conexão não encontrada" }, { status: 404 });
  }

  // 4. Remove MetaAPI cloud account
  try {
    await removeAccount(conn.metaapi_account_id);
  } catch (err) {
    console.error("[metaapi/disconnect] MetaAPI removal error:", (err as Error).message);
    // Continue anyway — clean up our DB even if MetaAPI fails
  }

  // 5. Delete connection + alert configs (snapshots cascade via FK)
  await supabase
    .from("live_alert_configs")
    .delete()
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  await supabase
    .from("metaapi_connections")
    .delete()
    .eq("id", conn.id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
