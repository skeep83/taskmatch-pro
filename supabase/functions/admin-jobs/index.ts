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

    // Verify admin access
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
    const hasAdminAccess = roles.includes('admin') || roles.includes('superadmin') || roles.includes('ops');

    if (!hasAdminAccess) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { method } = req;
    const url = new URL(req.url);
    
    console.log(`Admin Jobs API: ${method} ${url.pathname}`);

    switch (method) {
      case "GET":
        return await handleGetJobs(supabaseService, url, user.id);
      
      case "POST": {
        const postData = await req.json();
        return await handleJobAction(supabaseService, postData, user.id, req);
      }

      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("Admin Jobs API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGetJobs(supabase: any, url: URL, adminId: string) {
  const action = url.searchParams.get('action') || 'list';
  const jobId = url.searchParams.get('jobId');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';

  // Log admin action
  await supabase.rpc('log_admin_action', {
    p_action: 'ADMIN_JOBS_VIEW',
    p_resource_type: 'jobs',
    p_resource_id: jobId || null,
    p_new_values: { action, status, search, page, limit }
  });

  switch (action) {
    case 'list': {
      let query = supabase
        .from('jobs')
        .select(`
          id, title, description, status, created_at, updated_at,
          scheduled_at, budget_min_cents, budget_max_cents,
          start_confirmed, end_confirmed,
          categories(label_ru, key),
          profiles!client_id(full_name, phone),
          profiles!pro_id(full_name, phone),
          escrows(amount_cents, status),
          job_photos(file_url),
          dispute_cases(id, status, created_at)
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data: jobs, error, count } = await query;

      if (error) {
        console.error('Error fetching jobs:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch jobs' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        jobs, 
        pagination: { page, limit, total: count }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'detail': {
      if (!jobId) {
        return new Response(JSON.stringify({ error: 'Job ID required' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job, error } = await supabase
        .from('jobs')
        .select(`
          *,
          categories(label_ru, key),
          profiles!client_id(id, full_name, phone),
          profiles!pro_id(id, full_name, phone),
          escrows(id, amount_cents, status, created_at, updated_at),
          job_photos(id, file_url, created_at),
          job_applications(id, price_cents, note, eta_slot, created_at, profiles(full_name)),
          chats(id, created_at, last_message_at),
          dispute_cases(id, status, resolution, created_at),
          ratings(score, comment, created_at, from_user_id, to_user_id)
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'disputes': {
      const { data: disputes, error } = await supabase
        .from('dispute_cases')
        .select(`
          id, status, resolution, created_at, sla_due_at,
          jobs(id, title, description),
          profiles!claimant(full_name, phone)
        `)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch disputes' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ disputes }), {
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

async function handleJobAction(supabase: any, data: any, adminId: string, req: Request) {
  const { action, jobId, ...actionData } = data;

  if (!jobId || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get job data before action for audit log
  const { data: oldJob } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  let result;
  let error;

  switch (action) {
    case 'reassign_job': {
      const { newProId, reason } = actionData;
      
      const { error: reassignError } = await supabase
        .from('jobs')
        .update({ 
          pro_id: newProId,
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      result = { success: !reassignError, reassignedTo: newProId, reason };
      error = reassignError;
      break;
    }

    case 'cancel_job': {
      const { reason, refundAmount } = actionData;
      
      // Update job status
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ 
          status: 'canceled',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Handle refund if specified
      if (!jobError && refundAmount > 0) {
        await supabase
          .from('escrows')
          .update({ status: 'refunded' })
          .eq('job_id', jobId);
      }
      
      result = { success: !jobError, reason, refundAmount };
      error = jobError;
      break;
    }

    case 'force_complete': {
      const { reason } = actionData;
      
      const { error: completeError } = await supabase
        .from('jobs')
        .update({ 
          status: 'done',
          end_confirmed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      // Release escrow
      if (!completeError) {
        await supabase
          .from('escrows')
          .update({ status: 'released' })
          .eq('job_id', jobId);
      }
      
      result = { success: !completeError, reason };
      error = completeError;
      break;
    }

    case 'create_dispute': {
      const { reason, claimantId } = actionData;
      
      const { error: disputeError } = await supabase
        .from('dispute_cases')
        .insert({
          job_id: jobId,
          claimant: claimantId,
          status: 'open',
          evidence: { admin_initiated: true, reason },
          sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
      
      result = { success: !disputeError, reason };
      error = disputeError;
      break;
    }

    case 'update_schedule': {
      const { newScheduledAt } = actionData;
      
      const { error: scheduleError } = await supabase
        .from('jobs')
        .update({ 
          scheduled_at: newScheduledAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      result = { success: !scheduleError, newScheduledAt };
      error = scheduleError;
      break;
    }

    case 'apply_discount': {
      const { discountPercent, reason } = actionData;
      
      // This would typically involve updating the escrow amount
      // and creating a credit for the client
      const { error: discountError } = await supabase
        .from('job_adjustments')
        .insert({
          job_id: jobId,
          type: 'discount',
          amount_cents: Math.round((oldJob.budget_max_cents || 0) * discountPercent / 100),
          reason,
          applied_by: adminId
        });
      
      result = { success: !discountError, discountPercent, reason };
      error = discountError;
      break;
    }

    default:
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  // Log admin action
  await supabase.rpc('log_admin_action', {
    p_action: `ADMIN_JOB_${action.toUpperCase()}`,
    p_resource_type: 'job',
    p_resource_id: jobId,
    p_old_values: oldJob,
    p_new_values: { action, ...actionData, result },
    p_ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
    p_user_agent: req.headers.get('user-agent')
  });

  if (error) {
    console.error(`Error in ${action}:`, error);
    return new Response(JSON.stringify({ error: `Failed to ${action}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}