import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, error: "Invalid profile id" }, { status: 400 });
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing bearer token" }, { status: 401 });
  }

  let body: { validated_by_user?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = createSupabaseClientForUser(token);

  const patch: Record<string, unknown> = {};
  if (typeof body.validated_by_user === "boolean") {
    patch.validated_by_user = body.validated_by_user;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No updatable fields in body" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("import_profiles")
    .update(patch)
    .eq("id", id)
    .select("id, validated_by_user, suggested_by")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code ?? null },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
