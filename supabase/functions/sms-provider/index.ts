import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  phone: string;
  message: string;
  type: 'otp' | 'notification' | 'marketing';
  language?: 'ru' | 'ro';
}

// Moldovan SMS provider configuration
const MOLDCELL_API_URL = 'https://api.moldcell.md/sms/send';
const ORANGE_API_URL = 'https://api.orange.md/sms/send';

const smsTemplates = {
  otp: {
    ru: (code: string) => `ServiceHub: Ваш код подтверждения: ${code}. Никому не сообщайте этот код.`,
    ro: (code: string) => `ServiceHub: Codul dumneavoastră de confirmare: ${code}. Nu comunicați acest cod nimănui.`
  },
  job_assigned: {
    ru: (jobTitle: string) => `ServiceHub: Вам назначен новый заказ "${jobTitle}". Проверьте приложение.`,
    ro: (jobTitle: string) => `ServiceHub: Vi s-a atribuit o comandă nouă "${jobTitle}". Verificați aplicația.`
  },
  payment_received: {
    ru: (amount: string) => `ServiceHub: Получен платеж ${amount} MDL. Средства зачислены на ваш счет.`,
    ro: (amount: string) => `ServiceHub: Plată primită ${amount} MDL. Fondurile au fost creditate în contul dvs.`
  }
};

// Mock local SMS provider for development
async function sendViaMockProvider(phone: string, message: string): Promise<any> {
  console.log(`Mock SMS to ${phone}: ${message}`);
  return {
    success: true,
    messageId: `mock_${Date.now()}`,
    provider: 'mock'
  };
}

// Moldcell SMS provider
async function sendViaMoldcell(phone: string, message: string): Promise<any> {
  const apiKey = Deno.env.get('MOLDCELL_API_KEY');
  if (!apiKey) {
    throw new Error('Moldcell API key not configured');
  }

  const response = await fetch(MOLDCELL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      phone: phone.replace('+', ''),
      message,
      sender: 'ServiceHub'
    })
  });

  if (!response.ok) {
    throw new Error(`Moldcell API error: ${response.statusText}`);
  }

  return await response.json();
}

// Orange Moldova SMS provider
async function sendViaOrange(phone: string, message: string): Promise<any> {
  const apiKey = Deno.env.get('ORANGE_API_KEY');
  if (!apiKey) {
    throw new Error('Orange API key not configured');
  }

  const response = await fetch(ORANGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      to: phone,
      text: message,
      from: 'ServiceHub'
    })
  });

  if (!response.ok) {
    throw new Error(`Orange API error: ${response.statusText}`);
  }

  return await response.json();
}

// Determine best provider based on phone number
function selectProvider(phone: string): 'moldcell' | 'orange' | 'mock' {
  // Moldovan numbers: +373
  if (phone.startsWith('+373')) {
    // Moldcell: 60*, 61*, 67*, 68*, 69*
    const number = phone.substring(4);
    if (['60', '61', '67', '68', '69'].some(prefix => number.startsWith(prefix))) {
      return 'moldcell';
    }
    // Orange: 78*, 79*
    if (['78', '79'].some(prefix => number.startsWith(prefix))) {
      return 'orange';
    }
  }
  
  // Default to mock for development/testing
  return 'mock';
}

async function sendSMS(phone: string, message: string): Promise<any> {
  const provider = selectProvider(phone);
  
  switch (provider) {
    case 'moldcell':
      return await sendViaMoldcell(phone, message);
    case 'orange':
      return await sendViaOrange(phone, message);
    case 'mock':
    default:
      return await sendViaMockProvider(phone, message);
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

    const { phone, message, type, language = 'ru' }: SMSRequest = await req.json();

    // Validate phone number format
    if (!phone || !phone.match(/^\+\d{10,15}$/)) {
      throw new Error('Invalid phone number format');
    }

    // Send SMS
    const result = await sendSMS(phone, message);

    // Store SMS in database for tracking
    const { error: dbError } = await supabaseClient
      .from('sms_queue')
      .insert({
        phone,
        message,
        type,
        language,
        provider_response: result,
        status: result.success ? 'sent' : 'failed',
        external_id: result.messageId
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(JSON.stringify({
      success: result.success,
      messageId: result.messageId,
      provider: result.provider || selectProvider(phone)
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error('SMS Error:', error);
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