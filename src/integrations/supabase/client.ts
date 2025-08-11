// Supabase client bridge for Lovable native integration
// Attempts to discover a pre-initialized Supabase client exposed by the platform.
// No env vars are used here. If a client isn't found, consumers should handle it gracefully.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = (globalThis ?? window) as any;

function pickClient(): any | undefined {
  // Common direct globals
  const direct = g.__LOVABLE_SUPABASE__ || g.lovableSupabase || g.supabase;
  if (direct?.auth && typeof direct.from === "function") return direct;

  // Nested under a namespace
  const nested = g.__LOVABLE__?.supabase || g.__INTEGRATIONS__?.supabase;
  if (nested?.auth && typeof nested.from === "function") return nested;

  // Heuristic scan: find any object on global that looks like a Supabase client
  try {
    for (const key of Object.keys(g)) {
      const v = g[key];
      if (v && typeof v === "object" && v.auth && typeof v.from === "function") {
        return v;
      }
    }
  } catch {
    // ignore
  }

  return undefined;
}

export const supabase = pickClient();
export default supabase;
