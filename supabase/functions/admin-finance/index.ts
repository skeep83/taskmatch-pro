import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin access (finance role required)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user roles directly with authenticated user context
    const { data: userRoles, error: rolesError } = await supabaseService
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error checking user roles:', rolesError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = userRoles?.map(r => r.role) || [];
    const hasAdminAccess = roles.includes('admin') || roles.includes('superadmin') || roles.includes('finance');

    if (!hasAdminAccess) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { method } = req;
    const url = new URL(req.url);
    
    switch (method) {
      case "GET":
        return await handleGetFinance(supabaseService, url);
      
      case "POST": {
        const postData = await req.json();
        return await handleFinanceAction(supabaseService, postData, req);
      }

      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("Admin Finance API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGetFinance(supabase: any, url: URL) {
  const action = url.searchParams.get('action') || 'wallets';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

  await supabase.rpc('log_admin_action', {
    p_action: 'ADMIN_FINANCE_VIEW',
    p_resource_type: 'finance',
    p_new_values: { action, page, limit }
  });

  switch (action) {
    case 'wallets': {
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select(`
          id, pro_id, balance_cents, pending_cents, created_at, updated_at,
          profiles(full_name, phone),
          pro_rating_stats(avg_score, rating_count)
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('balance_cents', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch wallets' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ wallets }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'escrows': {
      const { data: escrows, error } = await supabase
        .from('escrows')
        .select(`
          id, job_id, client_id, pro_id, amount_cents, status, 
          created_at, updated_at, currency,
          jobs(id, description, status),
          profiles!client_id(full_name, phone),
          profiles!pro_id(full_name, phone)
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch escrows' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ escrows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'payouts': {
      const { data: payouts, error } = await supabase
        .from('payouts')
        .select(`
          id, pro_id, amount_cents, status, method,
          initiated_at, settled_at,
          profiles(full_name, phone),
          payout_requests(id, created_at)
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('initiated_at', { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch payouts' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ payouts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    default:
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
}

async function handleFinanceAction(supabase: any, data: any, req: Request) {
  const { action, ...actionData } = data;

  switch (action) {
    case 'release_escrow': {
      const { escrowId, reason } = actionData;
      
      if (!escrowId) {
        return new Response(JSON.stringify({ error: 'Escrow ID required' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get escrow details
      const { data: escrow, error: fetchError } = await supabase
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (fetchError || !escrow) {
        return new Response(JSON.stringify({ error: 'Escrow not found' }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update escrow status
      const { error: releaseError } = await supabase
        .from('escrows')
        .update({ 
          status: 'released',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (releaseError) {
        await supabase.rpc('log_admin_action', {
          p_action: 'ADMIN_ESCROW_RELEASE_FAILED',
          p_resource_type: 'escrow',
          p_resource_id: escrowId,
          p_old_values: escrow,
          p_new_values: { reason, error: releaseError.message }
        });

        return new Response(JSON.stringify({ error: 'Failed to release escrow' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update pro wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          balance_cents: supabase.raw(`balance_cents + ${escrow.amount_cents}`),
          updated_at: new Date().toISOString()
        })
        .eq('pro_id', escrow.pro_id);

      await supabase.rpc('log_admin_action', {
        p_action: 'ADMIN_ESCROW_RELEASE',
        p_resource_type: 'escrow',
        p_resource_id: escrowId,
        p_old_values: escrow,
        p_new_values: { reason, amount_cents: escrow.amount_cents },
        p_ip_address: req.headers.get('cf-connecting-ip'),
        p_user_agent: req.headers.get('user-agent')
      });

      return new Response(JSON.stringify({ success: true, released: escrow.amount_cents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'refund_escrow': {
      const { escrowId, reason, refundAmount } = actionData;
      
      const { data: escrow, error: fetchError } = await supabase
        .from('escrows')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (fetchError || !escrow) {
        return new Response(JSON.stringify({ error: 'Escrow not found' }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const actualRefund = refundAmount || escrow.amount_cents;

      const { error: refundError } = await supabase
        .from('escrows')
        .update({ 
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      await supabase.rpc('log_admin_action', {
        p_action: 'ADMIN_ESCROW_REFUND',
        p_resource_type: 'escrow',
        p_resource_id: escrowId,
        p_old_values: escrow,
        p_new_values: { reason, refund_amount: actualRefund },
        p_ip_address: req.headers.get('cf-connecting-ip'),
        p_user_agent: req.headers.get('user-agent')
      });

      if (refundError) {
        return new Response(JSON.stringify({ error: 'Failed to process refund' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, refunded: actualRefund }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'approve_payout': {
      const { payoutId, notes } = actionData;
      
      const { data: payout, error: fetchError } = await supabase
        .from('payouts')
        .select('*')
        .eq('id', payoutId)
        .single();

      if (fetchError || !payout) {
        return new Response(JSON.stringify({ error: 'Payout not found' }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update payout status
      const { error: approveError } = await supabase
        .from('payouts')
        .update({ 
          status: 'approved',
          settled_at: new Date().toISOString()
        })
        .eq('id', payoutId);

      // Deduct from wallet
      if (!approveError) {
        await supabase
          .from('wallets')
          .update({ 
            balance_cents: supabase.raw(`balance_cents - ${payout.amount_cents}`)
          })
          .eq('pro_id', payout.pro_id);
      }

      await supabase.rpc('log_admin_action', {
        p_action: 'ADMIN_PAYOUT_APPROVE',
        p_resource_type: 'payout',
        p_resource_id: payoutId,
        p_old_values: payout,
        p_new_values: { notes, approved_amount: payout.amount_cents }
      });

      if (approveError) {
        return new Response(JSON.stringify({ error: 'Failed to approve payout' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, approved: payout.amount_cents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    default:
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }
}