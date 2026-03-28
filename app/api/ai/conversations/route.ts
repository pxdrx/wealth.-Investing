import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseClientForUser(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  const { data, error } = await supabase
    .from("ai_coach_conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[ai/conversations] GET error:", error.message);
    return NextResponse.json({ ok: false, error: "Failed to fetch conversations" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseClientForUser(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("ai_coach_conversations")
    .insert({
      user_id: user.id,
      title: body.title || "Nova conversa",
      account_id: body.account_id || null,
    })
    .select("id, title, created_at")
    .maybeSingle();

  if (error) {
    console.error("[ai/conversations] POST error:", error.message);
    return NextResponse.json({ ok: false, error: "Failed to create conversation" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "Failed to create conversation" }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseClientForUser(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  // FIX TECH-011: Guard req.json() against malformed request bodies
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const { id, title } = body as { id?: string; title?: string };
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await supabase
    .from("ai_coach_conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseClientForUser(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await supabase
    .from("ai_coach_conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
