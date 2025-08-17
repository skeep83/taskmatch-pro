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
    const hasAdminAccess = roles.includes('admin') || roles.includes('superadmin');

    if (!hasAdminAccess) {

    
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const metric = url.searchParams.get('metric') || 'dashboard';
    const period = url.searchParams.get('period') || '7d';
    
    console.log(`Admin Analytics: ${metric} for ${period}`);

    // Log admin action
    await supabaseService.rpc('log_admin_action', {
      p_action: 'ADMIN_ANALYTICS_VIEW',
      p_resource_type: 'analytics',
      p_new_values: { metric, period }
    });

    const analytics = await getAnalytics(supabaseService, metric, period);

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Admin Analytics Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getAnalytics(supabase: any, metric: string, period: string) {
  const now = new Date();
  const periodDays = parsePeriod(period);
  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  switch (metric) {
    case 'dashboard':
      return await getDashboardMetrics(supabase, startDate, now);
    
    case 'users':
      return await getUserMetrics(supabase, startDate, now);
    
    case 'jobs':
      return await getJobMetrics(supabase, startDate, now);
    
    case 'finance':
      return await getFinanceMetrics(supabase, startDate, now);
    
    case 'tenders':
      return await getTenderMetrics(supabase, startDate, now);
    
    default:
      return { error: 'Invalid metric' };
  }
}

async function getDashboardMetrics(supabase: any, startDate: Date, endDate: Date) {
  try {
    // Get key metrics in parallel
    const [
      totalUsers,
      totalJobs,
      activeJobs,
      completedJobs,
      totalGMV,
      disputes,
      avgRating,
      conversion
    ] = await Promise.all([
      // Total users
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      
      // Total jobs
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      
      // Active jobs
      supabase.from('jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['new', 'accepted', 'in_progress']),
      
      // Completed jobs this period
      supabase.from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endDate.toISOString()),
      
      // Total GMV (from escrows)
      supabase.from('escrows')
        .select('amount_cents')
        .eq('status', 'released')
        .gte('updated_at', startDate.toISOString()),
      
      // Active disputes
      supabase.from('dispute_cases')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      
      // Average rating
      supabase.from('ratings')
        .select('score')
        .gte('created_at', startDate.toISOString()),
      
      // Job conversion rate
      supabase.rpc('calculate_conversion_rate', { 
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
    ]);

    // Calculate GMV
    const gmv = totalGMV.data?.reduce((sum: number, item: any) => sum + (item.amount_cents || 0), 0) || 0;
    
    // Calculate average rating
    const ratings = avgRating.data || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum: number, r: any) => sum + r.score, 0) / ratings.length 
      : 0;

    return {
      overview: {
        totalUsers: totalUsers.count || 0,
        totalJobs: totalJobs.count || 0,
        activeJobs: activeJobs.count || 0,
        completedJobs: completedJobs.count || 0,
        gmv: Math.round(gmv / 100), // Convert cents to dollars
        disputes: disputes.count || 0,
        avgRating: Math.round(averageRating * 10) / 10,
        conversionRate: conversion.data || 0
      },
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
    };

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return { error: 'Failed to fetch dashboard metrics' };
  }
}

async function getUserMetrics(supabase: any, startDate: Date, endDate: Date) {
  try {
    const [newUsers, activeUsers, byRole, churnRate] = await Promise.all([
      // New user registrations
      supabase.from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Active users (with activity)
      supabase.from('jobs')
        .select('client_id, pro_id, created_at')
        .gte('created_at', startDate.toISOString()),
      
      // Users by role
      supabase.from('user_roles')
        .select('role', { count: 'exact' })
        .group('role'),
      
      // Churn rate calculation would go here
      Promise.resolve({ data: 0.05 }) // Placeholder
    ]);

    // Process active users
    const activeUserIds = new Set();
    activeUsers.data?.forEach((job: any) => {
      if (job.client_id) activeUserIds.add(job.client_id);
      if (job.pro_id) activeUserIds.add(job.pro_id);
    });

    return {
      newUsers: newUsers.data?.length || 0,
      activeUsers: activeUserIds.size,
      churnRate: churnRate.data,
      byRole: byRole.data || [],
      registrationTrend: groupByDay(newUsers.data || [], 'created_at')
    };

  } catch (error) {
    console.error('User metrics error:', error);
    return { error: 'Failed to fetch user metrics' };
  }
}

async function getJobMetrics(supabase: any, startDate: Date, endDate: Date) {
  try {
    const [jobStats, categoryStats, conversionFunnel] = await Promise.all([
      // Job stats by status
      supabase.from('jobs')
        .select('status, created_at, budget_min_cents, budget_max_cents')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      
      // Jobs by category
      supabase.from('jobs')
        .select('category_id, categories(label_ru)')
        .gte('created_at', startDate.toISOString()),
      
      // Conversion funnel
      supabase.rpc('get_job_conversion_funnel', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      })
    ]);

    const jobs = jobStats.data || [];
    const statusCounts = jobs.reduce((acc: any, job: any) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalJobs: jobs.length,
      byStatus: statusCounts,
      byCategory: categoryStats.data || [],
      conversionFunnel: conversionFunnel.data || [],
      averageBudget: calculateAverageBudget(jobs),
      creationTrend: groupByDay(jobs, 'created_at')
    };

  } catch (error) {
    console.error('Job metrics error:', error);
    return { error: 'Failed to fetch job metrics' };
  }
}

async function getFinanceMetrics(supabase: any, startDate: Date, endDate: Date) {
  try {
    const [escrows, payouts, commissions] = await Promise.all([
      // Escrow data
      supabase.from('escrows')
        .select('amount_cents, status, created_at, updated_at')
        .gte('created_at', startDate.toISOString()),
      
      // Payout data
      supabase.from('payouts')
        .select('amount_cents, status, initiated_at, settled_at')
        .gte('initiated_at', startDate.toISOString()),
      
      // Commission data (calculated from completed jobs)
      supabase.from('jobs')
        .select('budget_max_cents, created_at')
        .eq('status', 'done')
        .gte('updated_at', startDate.toISOString())
    ]);

    const escrowData = escrows.data || [];
    const payoutData = payouts.data || [];
    const jobData = commissions.data || [];

    const totalEscrow = escrowData.reduce((sum: number, e: any) => sum + (e.amount_cents || 0), 0);
    const totalPayouts = payoutData.reduce((sum: number, p: any) => sum + (p.amount_cents || 0), 0);
    const estimatedCommissions = jobData.reduce((sum: number, j: any) => sum + (j.budget_max_cents || 0) * 0.1, 0);

    return {
      totalEscrow: Math.round(totalEscrow / 100),
      totalPayouts: Math.round(totalPayouts / 100),
      estimatedCommissions: Math.round(estimatedCommissions / 100),
      escrowsByStatus: groupByField(escrowData, 'status'),
      payoutsByStatus: groupByField(payoutData, 'status'),
      financeTrend: groupByDay(escrowData, 'created_at')
    };

  } catch (error) {
    console.error('Finance metrics error:', error);
    return { error: 'Failed to fetch finance metrics' };
  }
}

async function getTenderMetrics(supabase: any, startDate: Date, endDate: Date) {
  try {
    const [tenders, bids] = await Promise.all([
      // Tender data
      supabase.from('tenders')
        .select('id, status, created_at, budget_max_cents')
        .gte('created_at', startDate.toISOString()),
      
      // Bid data
      supabase.from('bids')
        .select('tender_id, price_cents, created_at')
        .gte('created_at', startDate.toISOString())
    ]);

    const tenderData = tenders.data || [];
    const bidData = bids.data || [];

    return {
      totalTenders: tenderData.length,
      tendersByStatus: groupByField(tenderData, 'status'),
      totalBids: bidData.length,
      averageBidsPerTender: tenderData.length > 0 ? bidData.length / tenderData.length : 0,
      tenderCreationTrend: groupByDay(tenderData, 'created_at')
    };

  } catch (error) {
    console.error('Tender metrics error:', error);
    return { error: 'Failed to fetch tender metrics' };
  }
}

// Helper functions
function parsePeriod(period: string): number {
  const match = period.match(/(\d+)([dwmy])/);
  if (!match) return 7;
  
  const [, num, unit] = match;
  const multiplier = { d: 1, w: 7, m: 30, y: 365 }[unit] || 1;
  return parseInt(num) * multiplier;
}

function groupByDay(data: any[], dateField: string) {
  const groups: Record<string, number> = {};
  data.forEach(item => {
    const date = new Date(item[dateField]).toISOString().split('T')[0];
    groups[date] = (groups[date] || 0) + 1;
  });
  return groups;
}

function groupByField(data: any[], field: string) {
  const groups: Record<string, number> = {};
  data.forEach(item => {
    const value = item[field] || 'unknown';
    groups[value] = (groups[value] || 0) + 1;
  });
  return groups;
}

function calculateAverageBudget(jobs: any[]) {
  const budgets = jobs
    .filter(j => j.budget_max_cents)
    .map(j => j.budget_max_cents);
  
  return budgets.length > 0
    ? Math.round(budgets.reduce((sum: number, b: number) => sum + b, 0) / budgets.length / 100)
    : 0;
}