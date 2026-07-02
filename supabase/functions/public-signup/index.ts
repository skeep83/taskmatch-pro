import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SignupRole = "client" | "pro" | "business";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { email, password, role } = await req.json() as {
      email?: string;
      password?: string;
      role?: SignupRole;
    };

    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole: SignupRole = role === "pro" || role === "business" ? role : "client";

    if (!normalizedEmail || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(password).length < 6) {
      return new Response(JSON.stringify({ error: "Password should be at least 6 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        signup_role: normalizedRole,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message, code: createError.code }), {
        status: createError.status || 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = created.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "User was not created" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleError } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: normalizedRole }, { onConflict: "user_id,role", ignoreDuplicates: true });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message, code: roleError.code }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError || !signInData.session) {
      return new Response(JSON.stringify({ error: signInError?.message || "Failed to sign in newly created user" }), {
        status: signInError?.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      user: signInData.user,
      session: signInData.session,
      role: normalizedRole,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("public-signup error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
