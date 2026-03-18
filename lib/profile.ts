import { supabase } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  dashboard_layout: import("@/components/dashboard/WidgetRenderer").DashboardLayout | null;
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
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    devError("getMyProfile session", sessionError);
    throw sessionError;
  }

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, dashboard_layout")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    // PGRST116 = no rows found — não é erro real
    if ((error as any).code === "PGRST116") {
      devLog("getMyProfile", "no profile row");
      return null;
    }
    devError("getMyProfile query", error);
    throw error;
  }

  if (!data) {
    devLog("getMyProfile", "no profile row");
    return null;
  }

  return data as Profile;
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
