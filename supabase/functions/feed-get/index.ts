// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page = 1, limit = 20, city, category_id } = await req.json().catch(() => ({}));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let query = admin.from("posts")
      .select("id, author_id, title, content, city, category_id, created_at")
      .eq("is_published", true)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (city) query = query.eq("city", city);
    if (category_id) query = query.eq("category_id", category_id);

    const { data: posts, error } = await query;
    if (error) throw error;

    const ids = posts?.map((p: any) => p.id) || [];
    let photosByPost: Record<string, any[]> = {};
    if (ids.length) {
      const { data: photos, error: pErr } = await admin
        .from("post_photos")
        .select("id, post_id, file_url")
        .in("post_id", ids);
      if (pErr) throw pErr;
      photosByPost = (photos || []).reduce((acc: any, ph: any) => {
        (acc[ph.post_id] ||= []).push(ph);
        return acc;
      }, {} as Record<string, any[]>);
    }

    const items = (posts || []).map((p: any) => ({
      ...p,
      photos: photosByPost[p.id] || [],
    }));

    return new Response(JSON.stringify({ items, page, limit }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (e) {
    console.error("feed-get error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }
});
