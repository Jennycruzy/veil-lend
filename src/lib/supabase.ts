import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub that throws helpful errors when Supabase isn't configured
    return new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === "from") {
          return () => ({
            insert: () => ({ select: () => ({ single: () => Promise.reject(new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")) }) }),
            select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }), single: () => Promise.resolve({ data: null, error: null }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.reject(new Error("Supabase not configured")) }) }) }),
          });
        }
        return undefined;
      },
    });
  }

  _client = createClient(url, key);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string, unknown>)[prop as string];
  },
});
