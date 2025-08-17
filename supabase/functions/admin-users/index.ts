import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client for user verification
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Create service client for admin operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user authentication and admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
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
    const hasAdminAccess = roles.includes('admin') || roles.includes('superadmin');

    if (!hasAdminAccess) {
      await supabaseService
        .rpc('log_admin_action', {
          p_action: 'ADMIN_ACCESS_DENIED',
          p_resource_type: 'admin_users',
          p_ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
          p_user_agent: req.headers.get('user-agent')
        });

      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { method } = req;
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    console.log(`Admin Users API: ${method} ${url.pathname}`);

    // Handle different admin user operations
    switch (method) {
      case "GET":
        return await handleGetUsers(supabaseService, url, user.id);
      
      case "POST":
        const postData = await req.json();
        return await handleUserAction(supabaseService, postData, user.id, req);
      
      case "PUT":
        const putData = await req.json();
        return await handleUpdateUser(supabaseService, putData, user.id, req);
      
      default:
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("Admin Users API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGetUsers(supabase: any, url: URL, adminId: string) {
  const action = url.searchParams.get('action') || 'list';
  const userId = url.searchParams.get('userId');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const search = url.searchParams.get('search') || '';
  const role = url.searchParams.get('role') || '';

  // Log admin action
  await supabase.rpc('log_admin_action', {
    p_action: 'ADMIN_USERS_VIEW',
    p_resource_type: 'users',
    p_resource_id: userId || null,
    p_new_values: { action, search, role, page, limit }
  });

  switch (action) {
    case 'list': {
      let query = supabase
        .from('profiles')
        .select(`
          id, full_name, phone, locale, created_at, updated_at,
          user_roles(role),
          kyc_documents(status, created_at),
          pro_profiles(bio, radius_km, hourly_rate_cents),
          pro_rating_stats(avg_score, rating_count)
        `)
        .range((page - 1) * limit, page * limit - 1)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      if (role) {
        query = query.eq('user_roles.role', role);
      }

      const { data: users, error, count } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        users, 
        pagination: { page, limit, total: count }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    case 'detail': {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID required' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user, error } = await supabase
        .from('profiles')
        .select(`
          id, full_name, phone, locale, created_at, updated_at,
          user_roles(role),
          kyc_documents(id, doc_type, status, created_at, reviewed_at),
          pro_profiles(bio, radius_km, hourly_rate_cents, fixed_price_cents),
          pro_rating_stats(avg_score, rating_count),
          jobs!client_id(id, status, created_at, budget_min_cents, budget_max_cents),
          jobs!pro_id(id, status, created_at, budget_min_cents, budget_max_cents)
        `)
        .eq('id', userId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user }), {
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

async function handleUserAction(supabase: any, data: any, adminId: string, req: Request) {
  const { action, userId, ...actionData } = data;

  if (!userId || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get user data before action for audit log
  const { data: oldUser } = await supabase
    .from('profiles')
    .select('*, user_roles(role)')
    .eq('id', userId)
    .single();

  let result;
  let error;

  switch (action) {
    case 'block_user': {
      // Add blocked role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'blocked' });
      
      result = { success: !roleError };
      error = roleError;
      break;
    }

    case 'unblock_user': {
      // Remove blocked role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'blocked');
      
      result = { success: !roleError };
      error = roleError;
      break;
    }

    case 'change_role': {
      const { newRole, removeRole } = actionData;
      
      if (removeRole) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', removeRole);
      }

      if (newRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        error = roleError;
      }

      result = { success: !error };
      break;
    }

    case 'reset_kyc': {
      const { error: kycError } = await supabase
        .from('kyc_documents')
        .update({ status: 'pending' })
        .eq('user_id', userId);
      
      result = { success: !kycError };
      error = kycError;
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
    p_action: `ADMIN_USER_${action.toUpperCase()}`,
    p_resource_type: 'user',
    p_resource_id: userId,
    p_old_values: oldUser,
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

async function handleUpdateUser(supabase: any, data: any, adminId: string, req: Request) {
  const { userId, updates } = data;

  if (!userId || !updates) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get old data for audit
  const { data: oldData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Update user profile
  const { data: updatedUser, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  // Log admin action
  await supabase.rpc('log_admin_action', {
    p_action: 'ADMIN_USER_UPDATE',
    p_resource_type: 'user',
    p_resource_id: userId,
    p_old_values: oldData,
    p_new_values: updates,
    p_ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
    p_user_agent: req.headers.get('user-agent')
  });

  if (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ user: updatedUser }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}