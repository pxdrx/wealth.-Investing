import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createSupabaseClientForUser(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("analyst_reports")
    .select("id, ticker, asset_type, created_at, report")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[analyst/history] GET error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch reports" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Report ID required" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseClientForUser(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("analyst_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[analyst/history] DELETE error:", error.message);
    return NextResponse.json(
      { ok: false, error: "Failed to delete report" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
