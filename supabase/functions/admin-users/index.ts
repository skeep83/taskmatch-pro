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
    console.log(`Admin Users API: ${req.method} ${req.url}`);

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
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user roles
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
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { method } = req;
    
    // Handle list users request
    if (method === "POST") {
      const postData = await req.json();
      console.log('Request data:', postData);
      
      if (postData.action === 'list') {
        return await handleListUsers(supabaseService, postData, user.id);
      }
      
      return await handleUserAction(supabaseService, postData, user.id, req);
    }
    
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Admin Users API Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleListUsers(supabase: any, data: any, adminId: string) {
  try {
    const page = parseInt(data.page || '1');
    const limit = Math.min(parseInt(data.limit || '50'), 100);
    const search = data.search || '';
    const role = data.role || '';

    console.log(`Fetching users - page: ${page}, limit: ${limit}, search: ${search}, role: ${role}`);

    // Get all users from auth schema with emails
    const { data: authUsersResponse, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users from auth', details: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allAuthUsers = authUsersResponse.users || [];
    console.log(`Found ${allAuthUsers.length} auth users`);
    
    if (allAuthUsers.length === 0) {
      return new Response(JSON.stringify({ 
        users: [], 
        pagination: { page, limit, total: 0 }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all profiles in one query
    const { data: allProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, locale, created_at, updated_at');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
    }

    // Get all user roles in one query
    const { data: allUserRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
    }

    // Merge data for all users
    const enrichedUsers = allAuthUsers.map(authUser => {
      const profile = allProfiles?.find(p => p.id === authUser.id);
      const userRoles = allUserRoles?.filter(r => r.user_id === authUser.id) || [];

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
        user_roles: userRoles,
        kyc_documents: [],
        pro_profiles: [],
        pro_rating_stats: []
      };
    });

    // Apply filters
    let filteredUsers = enrichedUsers;

    if (role) {
      filteredUsers = filteredUsers.filter(user => 
        user.user_roles.some(r => r.role === role)
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => {
        const emailMatch = user.email && user.email.toLowerCase().includes(searchLower);
        const nameMatch = user.full_name && user.full_name.toLowerCase().includes(searchLower);
        const phoneMatch = user.phone && user.phone.toLowerCase().includes(searchLower);
        return emailMatch || nameMatch || phoneMatch;
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    console.log(`Returning ${paginatedUsers.length} users out of ${filteredUsers.length} total`);

    return new Response(JSON.stringify({ 
      users: paginatedUsers, 
      pagination: { page, limit, total: filteredUsers.length }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in handleListUsers:', error);
    return new Response(JSON.stringify({ error: 'Internal server error while fetching users', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleUserAction(supabase: any, data: any, adminId: string, req: Request) {
  const { action, userId, ...actionData } = data;

  if (!userId || !action) {
    return new Response(JSON.stringify({ error: 'Missing required fields: userId and action are required' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Handling user action: ${action} for user: ${userId}`);

  try {
    let result;
    let error;

    switch (action) {
      case 'block_user': {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'blocked' });
        
        result = { success: !roleError };
        error = roleError;
        break;
      }

      case 'unblock_user': {
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

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (error) {
      console.error(`Error in ${action}:`, error);
      return new Response(JSON.stringify({ error: `Failed to ${action}`, details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error(`Error in user action ${action}:`, error);
    return new Response(JSON.stringify({ error: `Failed to ${action}`, details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}