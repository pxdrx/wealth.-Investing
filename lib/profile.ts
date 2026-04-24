import { supabase } from "@/lib/supabase/client";
import { safeGetSession } from "@/lib/supabase/safe-session";

export type ProfileLocale = "pt" | "en";

export type Profile = {
  id: string;
  display_name: string | null;
  dashboard_layout: import("@/components/dashboard/WidgetRenderer").DashboardLayout | null;
  preferred_locale: ProfileLocale | null;
};

/** Converte erros de rede/Supabase em mensagem legível para o usuário. */
export function toFriendlyMessage(err: unknown): string {
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return "Falha na conexão. Verifique sua internet e tente novamente.";
  }
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Ocorreu um erro. Tente novamente.";
}

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";
function devLog(context: string, detail: unknown) {
  if (isDev) console.debug(`[profile] ${context}`, detail);
}
function devError(context: string, err: unknown) {
  if (isDev) console.error(`[profile] ${context}`, err);
}

/**
 * Busca o profile do usuário atual em public.profiles (id = auth user id).
 * Retorna null quando o profile não existe.
 * Em caso de erro (rede/Supabase), lança para que o caller possa diferenciar
 * "sem perfil ainda" de "falha ao buscar perfil".
 */
export async function getMyProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await safeGetSession();

  if (!session?.user?.id) {
    return null;
  }

  // Try full select first; if any newer column doesn't exist yet (deploy ran
  // before migration) gracefully drop it. Order of fallbacks:
  //   full → drop preferred_locale → drop dashboard_layout → minimal
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, dashboard_layout, preferred_locale")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!error) {
    if (!data) {
      devLog("getMyProfile", "no profile row");
      return null;
    }
    return data as Profile;
  }

  const isMissingColumn = (e: { code?: string; message?: string } | null) =>
    !!e && (e.code === "42703" || !!e.message?.includes("column"));

  // Drop preferred_locale if it's the missing one
  if (isMissingColumn(error) && error.message?.includes("preferred_locale")) {
    devLog("getMyProfile", "preferred_locale column not found, retrying");
    const { data: d2, error: e2 } = await supabase
      .from("profiles")
      .select("id, display_name, dashboard_layout")
      .eq("id", session.user.id)
      .maybeSingle();
    if (e2 && isMissingColumn(e2) && e2.message?.includes("dashboard_layout")) {
      return fetchProfileMinimal(session.user.id);
    }
    if (e2 && (e2 as { code?: string }).code !== "PGRST116") {
      devError("getMyProfile fallback no-locale", e2);
      throw e2;
    }
    if (!d2) return null;
    return {
      ...(d2 as { id: string; display_name: string | null; dashboard_layout: Profile["dashboard_layout"] }),
      preferred_locale: null,
    };
  }

  if (isMissingColumn(error) && error.message?.includes("dashboard_layout")) {
    return fetchProfileMinimal(session.user.id);
  }

  if ((error as { code?: string }).code === "PGRST116") {
    devLog("getMyProfile", "no profile row");
    return null;
  }

  devError("getMyProfile query", error);
  throw error;
}

async function fetchProfileMinimal(userId: string): Promise<Profile | null> {
  devLog("getMyProfile", "falling back to minimal select");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", userId)
    .maybeSingle();
  if (error && (error as { code?: string }).code !== "PGRST116") {
    devError("getMyProfile minimal", error);
    throw error;
  }
  if (!data) return null;
  return {
    ...(data as { id: string; display_name: string | null }),
    dashboard_layout: null,
    preferred_locale: null,
  };
}

/**
 * Upsert current user's profile with display_name.
 * Never throws; returns { error: { message } } on failure.
 */
export async function upsertMyProfileDisplayName(displayName: string): Promise<{ error: { message: string } | null }> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      devError("upsertMyProfileDisplayName session", sessionError);
      return { error: { message: toFriendlyMessage(sessionError) } };
    }

    if (!session?.user?.id) {
      return { error: { message: "Não autenticado" } };
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, display_name: displayName.trim() },
        { onConflict: "id" }
      );

    if (error) {
      devError("upsertMyProfileDisplayName", error);
      return { error: { message: error.message } };
    }
    devLog("upsertMyProfileDisplayName", "ok");
    return { error: null };
  } catch (err) {
    devError("upsertMyProfileDisplayName throw", err);
    return { error: { message: toFriendlyMessage(err) } };
  }
}

/**
 * Upsert the current user's preferred UI locale in public.profiles.
 * Never throws; returns { error: { message } } on failure. Callers in
 * fire-and-forget paths can ignore the result.
 *
 * Tolerant to the column not existing yet (deploy before migration): a
 * missing-column error is swallowed as a no-op instead of surfacing.
 */
export async function updateMyPreferredLocale(
  locale: ProfileLocale,
): Promise<{ error: { message: string } | null }> {
  try {
    if (locale !== "pt" && locale !== "en") {
      return { error: { message: "Invalid locale" } };
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      devError("updateMyPreferredLocale session", sessionError);
      return { error: { message: toFriendlyMessage(sessionError) } };
    }
    if (!session?.user?.id) {
      return { error: { message: "Não autenticado" } };
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, preferred_locale: locale },
        { onConflict: "id" },
      );

    if (error) {
      // Deploy may have landed before the migration; treat as no-op.
      if (error.code === "42703" || error.message?.includes("preferred_locale")) {
        devLog("updateMyPreferredLocale", "column missing, skipping");
        return { error: null };
      }
      devError("updateMyPreferredLocale", error);
      return { error: { message: error.message } };
    }
    devLog("updateMyPreferredLocale", `ok: ${locale}`);
    return { error: null };
  } catch (err) {
    devError("updateMyPreferredLocale throw", err);
    return { error: { message: toFriendlyMessage(err) } };
  }
}
