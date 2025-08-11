// Supabase client bridge for Lovable native integration
// Tries to use a globally provided client from the platform.
// If not available at runtime, consumers should handle a missing client gracefully.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalAny: any = (globalThis ?? window) as any;

// Common fallbacks for platform-provided clients
export const supabase =
  globalAny.__LOVABLE_SUPABASE__ ||
  globalAny.lovableSupabase ||
  globalAny.supabase ||
  undefined;

export default supabase;
