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
        
        // Check if this is a list request via POST
        if (postData.action === 'list' || (!postData.action && !postData.userId)) {
          return await handleGetUsers(supabaseService, url, user.id, postData);
        }
        
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

async function handleGetUsers(supabase: any, url: URL, adminId: string, requestData?: any) {
  const action = requestData?.action || url.searchParams.get('action') || 'list';
  const userId = requestData?.userId || url.searchParams.get('userId');
  const page = parseInt(requestData?.page || url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(requestData?.limit || url.searchParams.get('limit') || '50'), 100);
  const search = requestData?.search || url.searchParams.get('search') || '';
  const role = requestData?.role || url.searchParams.get('role') || '';

  // Log admin action
  await supabase.rpc('log_admin_action', {
    p_action: 'ADMIN_USERS_VIEW',
    p_resource_type: 'users',
    p_resource_id: userId || null,
    p_new_values: { action, search, role, page, limit }
  });

  switch (action) {
    case 'list': {
      try {
        // First get total count from auth schema
        const { data: authUsersResponse, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
          console.error('Error fetching auth users:', authError);
          return new Response(JSON.stringify({ error: 'Failed to fetch users from auth' }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const allAuthUsers = authUsersResponse.users || [];
        const totalUsers = allAuthUsers.length;
        
        // Apply pagination to auth users
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedAuthUsers = allAuthUsers.slice(startIndex, endIndex);
        
        if (paginatedAuthUsers.length === 0) {
          return new Response(JSON.stringify({ 
            users: [], 
            pagination: { page, limit, total: totalUsers }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const userIds = paginatedAuthUsers.map(u => u.id);

        // Get profile data for these users
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id, full_name, phone, locale, created_at, updated_at
          `)
          .in('id', userIds);

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
          // Don't fail completely, just continue without profile data
        }

        // Get user roles
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
        }

        // Get KYC documents
        const { data: kycDocs, error: kycError } = await supabase
          .from('kyc_documents')
          .select('user_id, status, created_at')
          .in('user_id', userIds);

        if (kycError) {
          console.error('Error fetching KYC documents:', kycError);
        }

        // Get pro profiles
        const { data: proProfiles, error: proError } = await supabase
          .from('pro_profiles')
          .select('user_id, bio, radius_km, hourly_rate_cents')
          .in('user_id', userIds);

        if (proError) {
          console.error('Error fetching pro profiles:', proError);
        }

        // Get rating stats
        const { data: ratingStats, error: ratingError } = await supabase
          .from('pro_rating_stats')
          .select('pro_id, avg_score, rating_count')
          .in('pro_id', userIds);

        if (ratingError) {
          console.error('Error fetching rating stats:', ratingError);
        }

        // Merge all data
        const users = paginatedAuthUsers.map(authUser => {
          const profile = profiles?.find(p => p.id === authUser.id);
          const roles = userRoles?.filter(r => r.user_id === authUser.id) || [];
          const kyc = kycDocs?.filter(k => k.user_id === authUser.id) || [];
          const proProfile = proProfiles?.find(p => p.user_id === authUser.id);
          const ratings = ratingStats?.find(r => r.pro_id === authUser.id);

          return {
            id: authUser.id,
            email: authUser.email,
            email_confirmed_at: authUser.email_confirmed_at,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at,
            last_sign_in_at: authUser.last_sign_in_at,
            full_name: profile?.full_name || null,
            phone: profile?.phone || null,
            locale: profile?.locale || 'ru',
            user_roles: roles,
            kyc_documents: kyc,
            pro_profiles: proProfile ? [proProfile] : [],
            pro_rating_stats: ratings ? [ratings] : []
          };
        });

        // Apply search filter if provided
        const filteredUsers = users.filter(user => {
          if (role && (!user.user_roles || !user.user_roles.some(r => r.role === role))) {
            return false;
          }
          if (search) {
            const searchLower = search.toLowerCase();
            const emailMatch = user.email && user.email.toLowerCase().includes(searchLower);
            const nameMatch = user.full_name && user.full_name.toLowerCase().includes(searchLower);
            const phoneMatch = user.phone && user.phone.toLowerCase().includes(searchLower);
            if (!emailMatch && !nameMatch && !phoneMatch) {
              return false;
            }
          }
          return true;
        });

        return new Response(JSON.stringify({ 
          users: filteredUsers, 
          pagination: { page, limit, total: totalUsers }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (error) {
        console.error('Error in list users:', error);
        return new Response(JSON.stringify({ error: 'Internal server error while fetching users' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (error) {
        console.error('Error fetching users:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        users, 
        pagination: { page, limit, total }
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

  // For list action via POST, handle it differently
  if (action === 'list') {
    return new Response(JSON.stringify({ error: 'Use GET for list action or call handleGetUsers directly' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!userId || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields: userId and action are required' }), {
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