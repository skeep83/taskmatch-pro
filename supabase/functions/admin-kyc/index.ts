import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('Admin KYC function called with method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin'])
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Access denied - admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, userId, status, notes } = await req.json()
    console.log('Received action:', action, 'for user:', userId, 'status:', status)

    if (action === 'moderate') {
      if (!userId || !status || !['approved', 'rejected'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid parameters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update KYC document status
      const { error: updateError } = await supabaseClient
        .from('kyc_documents')
        .update({
          status: status,
          reviewer_id: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating KYC status:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update KYC status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Send notification to user
      const message = status === 'approved' 
        ? 'Поздравляем! Ваши документы прошли проверку.' 
        : `Ваши документы требуют доработки. ${notes ? `Причина: ${notes}` : ''}`

      const messageRo = status === 'approved'
        ? 'Felicitări! Documentele dumneavoastră au fost verificate.'
        : `Documentele dumneavoastră necesită îmbunătățiri. ${notes ? `Motiv: ${notes}` : ''}`

      const { error: notifyError } = await supabaseClient.rpc('notify_user', {
        p_user_id: userId,
        p_type: `kyc_${status}`,
        p_title_ru: status === 'approved' ? 'Документы одобрены' : 'Документы отклонены',
        p_message_ru: message,
        p_title_ro: status === 'approved' ? 'Documente aprobate' : 'Documente respinse',
        p_message_ro: messageRo,
        p_data: { reviewer_id: user.id, notes }
      })

      if (notifyError) {
        console.warn('Warning: Failed to send notification:', notifyError)
      }

      // Log admin action  
      const { error: logError } = await supabaseClient.rpc('log_admin_action', {
        p_action: `kyc_${status}`,
        p_resource_type: 'kyc_documents',
        p_resource_id: userId,
        p_new_values: { status, reviewer_id: user.id, notes }
      })

      if (logError) {
        console.warn('Warning: Failed to log admin action:', logError)
      }

      return new Response(
        JSON.stringify({ success: true, message: `KYC ${status} successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reset') {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Reset KYC status
      const { error: resetError } = await supabaseClient
        .from('kyc_documents')
        .update({
          status: 'pending',
          reviewer_id: null,
          reviewed_at: null
        })
        .eq('user_id', userId)

      if (resetError) {
        console.error('Error resetting KYC status:', resetError)
        return new Response(
          JSON.stringify({ error: 'Failed to reset KYC status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabaseClient.rpc('log_admin_action', {
        p_action: 'kyc_reset',
        p_resource_type: 'kyc_documents',
        p_resource_id: userId,
        p_new_values: { status: 'pending', reviewer_id: null, reset_by: user.id, notes }
      })

      return new Response(
        JSON.stringify({ success: true, message: 'KYC reset successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-kyc function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})