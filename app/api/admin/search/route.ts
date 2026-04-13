import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";

/**
 * GET /api/admin/search?email=xxx
 * Search for a user by email. Requires admin privileges.
 * Uses service_role to query auth.users by email.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Auth
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClientForUser(token);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Token inválido" },
        { status: 401 }
      );
    }

    // 2. Admin check
    const admin = await isAdmin(supabase, user.id);
    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Acesso negado — apenas administradores" },
        { status: 403 }
      );
    }

    // 3. Validate email param
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
    if (!email || email.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Parâmetro 'email' é obrigatório (mínimo 3 caracteres)" },
        { status: 400 }
      );
    }

    // 4. Search auth.users via service_role
    const serviceClient = createServiceRoleClient();
    const {
      data: { users: authUsers },
      error: authErr,
    } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });

    if (authErr) {
      console.error("[admin/search] auth.admin.listUsers error:", authErr.message);
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar usuários" },
        { status: 500 }
      );
    }

    // 5. Filter by email (partial match)
    const matches = (authUsers ?? []).filter(
      (u) => u.email && u.email.toLowerCase().includes(email)
    );

    if (matches.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    // 6. Fetch profiles and subscriptions for matched users
    const matchedIds = matches.map((u) => u.id);

    const [profilesResult, subsResult] = await Promise.all([
      serviceClient
        .from("profiles")
        .select("id, display_name, is_admin, created_at")
        .in("id", matchedIds),
      serviceClient
        .from("subscriptions")
        .select("user_id, plan, status")
        .in("user_id", matchedIds),
    ]);

    interface ProfileRow {
      id: string;
      display_name: string | null;
      is_admin: boolean;
      created_at: string | null;
    }
    interface SubRow {
      user_id: string;
      plan: string;
      status: string;
    }

    const profileMap = new Map(
      ((profilesResult.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
    );
    const subMap = new Map(
      ((subsResult.data ?? []) as SubRow[]).map((s) => [
        s.user_id,
        { plan: s.plan, status: s.status },
      ])
    );

    // 7. Combine
    const users = matches.map((authUser) => {
      const profile = profileMap.get(authUser.id);
      const sub = subMap.get(authUser.id);
      return {
        id: authUser.id,
        displayName: profile?.display_name ?? null,
        email: authUser.email ?? null,
        plan: sub?.plan ?? "free",
        status: sub?.status ?? null,
        isAdmin: profile?.is_admin === true,
        createdAt: profile?.created_at ?? authUser.created_at ?? null,
      };
    });

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("[admin/search] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
