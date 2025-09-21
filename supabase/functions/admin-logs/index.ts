import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEntry {
  id?: string;
  timestamp?: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: string;
  message: string;
  user_id?: string;
  metadata?: any;
  stack_trace?: string;
  resolved?: boolean;
}

serve(async (req) => {
  console.log('Admin Logs function called with method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth client for user verification
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Verify user authentication and admin access
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin access
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminAccess = userRoles?.some(r => 
      ['admin', 'superadmin', 'ops'].includes(r.role)
    );

    if (!hasAdminAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = req.method;
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    // Log admin action
    await supabaseAdmin.rpc('log_admin_action', {
      admin_user_id: user.id,
      action: `logs_${action}`,
      resource_type: 'logs',
      resource_id: null,
      details: { method, action }
    });

    if (method === 'GET') {
      if (action === 'list') {
        // Get logs with filters
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const level = url.searchParams.get('level');
        const source = url.searchParams.get('source');
        const search = url.searchParams.get('search');
        const resolved = url.searchParams.get('resolved');
        const timeRange = url.searchParams.get('timeRange') || '24h';

        const offset = (page - 1) * limit;

        // Build time filter
        let timeFilter = '';
        const now = new Date();
        switch (timeRange) {
          case '1h':
            timeFilter = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            break;
          case '24h':
            timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case '7d':
            timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case '30d':
            timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }

        // Build query
        let query = supabaseAdmin
          .from('error_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .range(offset, offset + limit - 1);

        if (timeFilter) {
          query = query.gte('timestamp', timeFilter);
        }

        if (level && level !== 'all') {
          query = query.eq('level', level);
        }

        if (source && source !== 'all') {
          query = query.eq('source', source);
        }

        if (search) {
          query = query.ilike('message', `%${search}%`);
        }

        if (resolved !== null && resolved !== '' && resolved !== 'all') {
          query = query.eq('resolved', resolved === 'true');
        }

        const { data: logs, error: logsError } = await query;

        if (logsError) {
          console.error('Error fetching logs:', logsError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch logs' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get stats
        const { data: statsData } = await supabaseAdmin
          .from('error_logs')
          .select('level, resolved, timestamp');

        const stats = {
          total: statsData?.length || 0,
          critical: statsData?.filter(l => l.level === 'critical').length || 0,
          errors: statsData?.filter(l => l.level === 'error').length || 0,
          warnings: statsData?.filter(l => l.level === 'warning').length || 0,
          resolved: statsData?.filter(l => l.resolved).length || 0,
          last_24h: statsData?.filter(l => 
            new Date(l.timestamp) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
          ).length || 0
        };

        return new Response(
          JSON.stringify({ logs, stats }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'export') {
        // Export logs as CSV
        const level = url.searchParams.get('level');
        const source = url.searchParams.get('source');
        const search = url.searchParams.get('search');
        const resolved = url.searchParams.get('resolved');
        const timeRange = url.searchParams.get('timeRange') || '24h';

        let query = supabaseAdmin
          .from('error_logs')
          .select('*')
          .order('timestamp', { ascending: false });

        // Apply same filters as list
        const now = new Date();
        let timeFilter = '';
        switch (timeRange) {
          case '1h':
            timeFilter = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            break;
          case '24h':
            timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case '7d':
            timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case '30d':
            timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }

        if (timeFilter) query = query.gte('timestamp', timeFilter);
        if (level && level !== 'all') query = query.eq('level', level);
        if (source && source !== 'all') query = query.eq('source', source);
        if (search) query = query.ilike('message', `%${search}%`);
        if (resolved !== null && resolved !== '' && resolved !== 'all') query = query.eq('resolved', resolved === 'true');

        const { data: logs } = await query;

        // Convert to CSV
        const csvHeaders = ['ID', 'Timestamp', 'Level', 'Source', 'Message', 'User ID', 'Resolved'];
        const csvRows = logs?.map(log => [
          log.id,
          log.timestamp,
          log.level,
          log.source,
          log.message.replace(/"/g, '""'),
          log.user_id || '',
          log.resolved ? 'Yes' : 'No'
        ]) || [];

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        return new Response(csvContent, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="error_logs.csv"'
          }
        });
      }

    } else if (method === 'POST') {
      const body = await req.json();

      if (action === 'create') {
        // Create new log entry
        const logEntry: LogEntry = {
          level: body.level,
          source: body.source,
          message: body.message,
          user_id: body.user_id,
          metadata: body.metadata,
          stack_trace: body.stack_trace,
          resolved: false,
          timestamp: new Date().toISOString()
        };

        const { data, error } = await supabaseAdmin
          .from('error_logs')
          .insert([logEntry])
          .select()
          .single();

        if (error) {
          console.error('Error creating log:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create log' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, log: data }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'resolve') {
        // Mark log as resolved
        const logId = body.log_id;

        const { error } = await supabaseAdmin
          .from('error_logs')
          .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
          .eq('id', logId);

        if (error) {
          console.error('Error resolving log:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to resolve log' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'bulk_create') {
        // Create multiple log entries at once (for crawler results)
        const logs = body.logs;
        
        if (!logs || !Array.isArray(logs)) {
          return new Response(
            JSON.stringify({ error: 'Logs array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Bulk creating ${logs.length} log entries`);

        const logEntries = logs.map(log => ({
          level: log.level,
          source: log.source || 'auto-crawler',
          message: log.message,
          user_id: log.user_id,
          metadata: log.metadata,
          stack_trace: log.stack_trace,
          resolved: false,
          timestamp: new Date().toISOString()
        }));

        const { data, error } = await supabaseAdmin
          .from('error_logs')
          .insert(logEntries)
          .select();

        if (error) {
          console.error('Error creating bulk logs:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to create bulk logs', details: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Successfully created ${data.length} log entries`);

        return new Response(
          JSON.stringify({ success: true, logs: data, count: data.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin Logs Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});