import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user has admin role
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const hasAdminAccess = userRoles?.some(r => ['admin', 'superadmin', 'kyc'].includes(r.role))
    if (!hasAdminAccess) {
      throw new Error('Insufficient permissions')
    }

    // Get pro upgrade requests
    const { data: requests, error: requestsError } = await supabaseClient
      .from('pro_upgrade_requests')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (requestsError) throw requestsError

    // Get user data for each request
    const requestsWithUserData = await Promise.all(
      (requests || []).map(async (request) => {
        // Get profile data
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('first_name, last_name, phone, city, avatar_url')
          .eq('id', request.user_id)
          .single()

        // Get auth user data (email)
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(request.user_id)

        return {
          ...request,
          user: {
            email: authUser?.user?.email || 'Не указан',
            profiles: profile || {
              first_name: '',
              last_name: '',
              phone: '',
              city: '',
              avatar_url: ''
            }
          }
        }
      })
    )

    return new Response(JSON.stringify({ submissions: requestsWithUserData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})