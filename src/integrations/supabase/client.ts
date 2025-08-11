import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Bridge to obtain a Supabase client in Lovable projects
// 1) Prefer a platform-provided global client (native integration)
// 2) Fallback: create a client from hints (localStorage/meta/globals)
// No env files are used.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = (globalThis ?? window) as any;

function pickPlatformClient(): SupabaseClient | undefined {
  const candidates = [
    g.__LOVABLE_SUPABASE__,
    g.lovableSupabase,
    g.supabase,
    g.__LOVABLE__?.supabase,
    g.__INTEGRATIONS__?.supabase,
    g.__supabaseClient,
  ];
  for (const c of candidates) {
    if (c?.auth && typeof c.from === "function") return c as SupabaseClient;
  }
  // Heuristic scan
  try {
    for (const key of Object.keys(g)) {
      const v = g[key];
      if (v && typeof v === "object" && v.auth && typeof v.from === "function") {
        return v as SupabaseClient;
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function getMeta(name: string): string | undefined {
  const el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  return el?.content || undefined;
}

function pickFromHints(): SupabaseClient | undefined {
  const url =
    g.__LOVABLE_SUPABASE_URL ||
    g.SUPABASE_URL ||
    localStorage.getItem("supabase.url") ||
    getMeta("supabase-url");

  const anon =
    g.__LOVABLE_SUPABASE_ANON_KEY ||
    g.SUPABASE_ANON_KEY ||
    localStorage.getItem("supabase.anon") ||
    getMeta("supabase-anon-key");

  if (typeof url === "string" && url.startsWith("http") && typeof anon === "string" && anon.length > 20) {
    const client = createClient(url, anon);
    // cache for future lookups
    g.__LOVABLE_SUPABASE__ = client;
    return client;
  }
  return undefined;
}

export const supabase: SupabaseClient | undefined = pickPlatformClient() || pickFromHints();
export default supabase;
