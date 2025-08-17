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

    // Verify admin access (superadmin required for audit logs)
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

    const { data: adminCheck } = await supabaseService
      .rpc('verify_admin_access', { required_role: 'admin' });

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url_obj = new URL(req.url);
    const action = url_obj.searchParams.get('action') || 'list';
    const page = parseInt(url_obj.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url_obj.searchParams.get('limit') || '100'), 500);
    const resourceType = url_obj.searchParams.get('resource_type') || '';
    const adminUser = url_obj.searchParams.get('admin_user') || '';
    const startDate = url_obj.searchParams.get('start_date');
    const endDate = url_obj.searchParams.get('end_date');

    console.log(`Admin Audit API: ${action}`);

    // Log audit log access (meta logging)
    await supabaseService.rpc('log_admin_action', {
      p_action: 'ADMIN_AUDIT_VIEW',
      p_resource_type: 'audit_log',
      p_new_values: { action, resourceType, adminUser, page, limit }
    });

    switch (action) {
      case 'list': {
        let query = supabaseService
          .from('admin_audit_log')
          .select(`
            id, admin_user_id, action, resource_type, resource_id,
            old_values, new_values, ip_address, user_agent, created_at
          `)
          .range((page - 1) * limit, page * limit - 1)
          .order('created_at', { ascending: false });

        if (resourceType) {
          query = query.eq('resource_type', resourceType);
        }

        if (adminUser) {
          query = query.eq('admin_user_id', adminUser);
        }

        if (startDate) {
          query = query.gte('created_at', startDate);
        }

        if (endDate) {
          query = query.lte('created_at', endDate);
        }

        const { data: auditLogs, error, count } = await query;

        if (error) {
          console.error('Error fetching audit logs:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch audit logs' }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ 
          auditLogs, 
          pagination: { page, limit, total: count }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'stats': {
        // Get audit statistics
        const [actionStats, resourceStats, adminStats, timeStats] = await Promise.all([
          // Actions by type
          supabaseService
            .from('admin_audit_log')
            .select('action', { count: 'exact' })
            .gte('created_at', startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .group('action'),
          
          // Resources by type
          supabaseService
            .from('admin_audit_log')
            .select('resource_type', { count: 'exact' })
            .gte('created_at', startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .group('resource_type'),
          
          // Most active admins
          supabaseService
            .from('admin_audit_log')
            .select('admin_user_id', { count: 'exact' })
            .gte('created_at', startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .group('admin_user_id')
            .order('count', { ascending: false })
            .limit(10),
          
          // Activity by hour
          supabaseService
            .from('admin_audit_log')
            .select('created_at')
            .gte('created_at', startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        ]);

        const hourlyActivity = groupByHour(timeStats.data || []);

        return new Response(JSON.stringify({
          actionStats: actionStats.data || [],
          resourceStats: resourceStats.data || [],
          adminStats: adminStats.data || [],
          hourlyActivity
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case 'export': {
        // Export audit logs as CSV
        const { data: logs, error } = await supabaseService
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10000);

        if (error) {
          return new Response(JSON.stringify({ error: 'Failed to export audit logs' }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Convert to CSV format
        const csv = convertToCSV(logs);

        return new Response(csv, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`
          },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

  } catch (error) {
    console.error("Audit action error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

function groupByHour(data: any[]) {
  const hourlyGroups: Record<string, number> = {};
  
  data.forEach(item => {
    const hour = new Date(item.created_at).getHours();
    const key = `${hour}:00`;
    hourlyGroups[key] = (hourlyGroups[key] || 0) + 1;
  });
  
  return hourlyGroups;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => 
    headers.map(header => {
      const cell = row[header];
      if (cell === null || cell === undefined) return '';
      if (typeof cell === 'object') return JSON.stringify(cell).replace(/"/g, '""');
      return String(cell).replace(/"/g, '""');
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}