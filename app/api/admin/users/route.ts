import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClientForUser } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { isAdmin } from "@/lib/admin";

interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  plan: string | null;
  status: string | null;
  isAdmin: boolean;
  createdAt: string | null;
}

/**
 * GET /api/admin/users
 * Returns all users with their profile and subscription data.
 * Requires admin privileges.
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

    // 3. Use service_role client to bypass RLS (admin needs to see ALL profiles)
    const serviceClient = createServiceRoleClient();

    // 4. Fetch profiles via service_role
    const { data: profiles, error: profilesErr } = await serviceClient
      .from("profiles")
      .select("id, display_name, is_admin, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (profilesErr) {
      console.error("[admin/users] profiles query error:", profilesErr.message);
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar perfis" },
        { status: 500 }
      );
    }

    // 5. Fetch subscriptions via service_role
    const { data: subscriptions, error: subsErr } = await serviceClient
      .from("subscriptions")
      .select("user_id, plan, status");

    if (subsErr) {
      console.error("[admin/users] subscriptions query error:", subsErr.message);
      return NextResponse.json(
        { ok: false, error: "Erro ao buscar assinaturas" },
        { status: 500 }
      );
    }

    // 6. Fetch emails via service_role (auth.users is only accessible with service key)
    const {
      data: { users: authUsers },
      error: authErr,
    } = await serviceClient.auth.admin.listUsers({ perPage: 1000 });

    if (authErr) {
      console.error("[admin/users] auth.admin.listUsers error:", authErr.message);
      // Continue without emails — non-critical
    }

    // 6. Build lookup maps
    const subMap = new Map(
      (subscriptions ?? []).map(
        (s: { user_id: string; plan: string; status: string }) => [
          s.user_id,
          { plan: s.plan, status: s.status },
        ]
      )
    );

    const emailMap = new Map(
      (authUsers ?? []).map((u) => [u.id, u.email ?? null])
    );

    // 7. Combine
    interface ProfileRow {
      id: string;
      display_name: string | null;
      is_admin: boolean;
      created_at: string | null;
    }

    const users: AdminUser[] = ((profiles ?? []) as ProfileRow[]).map((p) => {
      const sub = subMap.get(p.id);
      return {
        id: p.id,
        displayName: p.display_name ?? null,
        email: emailMap.get(p.id) ?? null,
        plan: sub?.plan ?? "free",
        status: sub?.status ?? null,
        isAdmin: p.is_admin === true,
        createdAt: p.created_at ?? null,
      };
    });

    return NextResponse.json({ ok: true, users });
  } catch (err) {
    console.error("[admin/users] Error:", err);
    return NextResponse.json(
      { ok: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
