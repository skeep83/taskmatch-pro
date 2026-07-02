import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntegrationRequest {
  provider: 'stripe' | 'twilio' | 'facebook' | 'google' | 'maib' | 'mdl_pay';
  action: string;
  data: Record<string, any>;
}

// Moldovan payment providers
const paymentProviders = {
  maib: {
    apiUrl: 'https://api.maib.md/v1',
    methods: ['card', 'mobile']
  },
  mdl_pay: {
    apiUrl: 'https://api.mdlpay.md/v1',
    methods: ['card', 'wallet', 'bank_transfer']
  }
};

// Facebook/Instagram integration for business promotion
async function handleFacebookIntegration(action: string, data: any): Promise<any> {
  const accessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');
  if (!accessToken) {
    throw new Error('Facebook access token not configured');
  }

  switch (action) {
    case 'create_business_post':
      return await fetch(`https://graph.facebook.com/v18.0/${data.pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          access_token: accessToken
        })
      });

    case 'get_page_insights':
      return await fetch(`https://graph.facebook.com/v18.0/${data.pageId}/insights?metric=page_views,page_fans&access_token=${accessToken}`);

    default:
      throw new Error(`Unsupported Facebook action: ${action}`);
  }
}

// Google Business Profile integration
async function handleGoogleIntegration(action: string, data: any): Promise<any> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY');
  if (!apiKey) {
    throw new Error('Google API key not configured');
  }

  switch (action) {
    case 'update_business_hours':
      return await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${data.locationName}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          regularHours: data.hours
        })
      });

    case 'get_reviews':
      return await fetch(`https://mybusiness.googleapis.com/v4/${data.locationName}/reviews?key=${apiKey}`);

    default:
      throw new Error(`Unsupported Google action: ${action}`);
  }
}

// MAIB (Moldova Agroindbank) payment integration
async function handleMaibIntegration(action: string, data: any): Promise<any> {
  const apiKey = Deno.env.get('MAIB_API_KEY');
  const merchantId = Deno.env.get('MAIB_MERCHANT_ID');
  
  if (!apiKey || !merchantId) {
    throw new Error('MAIB credentials not configured');
  }

  switch (action) {
    case 'create_payment':
      return await fetch(`${paymentProviders.maib.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantId,
          amount: data.amount,
          currency: 'MDL',
          description: data.description,
          returnUrl: data.returnUrl,
          cancelUrl: data.cancelUrl
        })
      });

    case 'check_payment_status':
      return await fetch(`${paymentProviders.maib.apiUrl}/payments/${data.paymentId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

    default:
      throw new Error(`Unsupported MAIB action: ${action}`);
  }
}

// MDL Pay integration (local Moldovan payment system)
async function handleMdlPayIntegration(action: string, data: any): Promise<any> {
  const apiKey = Deno.env.get('MDL_PAY_API_KEY');
  if (!apiKey) {
    throw new Error('MDL Pay API key not configured');
  }

  switch (action) {
    case 'create_payment':
      return await fetch(`${paymentProviders.mdl_pay.apiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: data.amount,
          currency: 'MDL',
          description: data.description,
          paymentMethod: data.method || 'card'
        })
      });

    default:
      throw new Error(`Unsupported MDL Pay action: ${action}`);
  }
}

// Twilio integration for SMS and calls
async function handleTwilioIntegration(action: string, data: any): Promise<any> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured');
  }

  const auth = btoa(`${accountSid}:${authToken}`);

  switch (action) {
    case 'send_sms':
      return await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: data.to,
          From: data.from,
          Body: data.message
        })
      });

    case 'create_video_room':
      return await fetch(`https://video.twilio.com/v1/Rooms`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          UniqueName: data.roomName,
          Type: 'group'
        })
      });

    default:
      throw new Error(`Unsupported Twilio action: ${action}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { provider, action, data }: IntegrationRequest = await req.json();

    let result;
    switch (provider) {
      case 'facebook':
        result = await handleFacebookIntegration(action, data);
        break;
      case 'google':
        result = await handleGoogleIntegration(action, data);
        break;
      case 'maib':
        result = await handleMaibIntegration(action, data);
        break;
      case 'mdl_pay':
        result = await handleMdlPayIntegration(action, data);
        break;
      case 'twilio':
        result = await handleTwilioIntegration(action, data);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    const responseData = await result.json();

    // Log integration usage
    const { error: logError } = await supabaseClient
      .from('integration_logs')
      .insert({
        provider,
        action,
        request_data: data,
        response_data: responseData,
        status: result.ok ? 'success' : 'error',
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Logging error:', logError);
    }

    return new Response(JSON.stringify({
      success: result.ok,
      data: responseData,
      provider,
      action
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error('Integration Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);