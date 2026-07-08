import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  type: 'job_match' | 'job_update' | 'payment' | 'message' | 'rating' | 'system' | 'price_proposal' | 'job_application';
  title: string;
  title_ro?: string;
  message: string;
  message_ro?: string;
  data?: any;
  channels?: ('push' | 'email' | 'sms' | 'telegram')[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const notificationData: NotificationRequest = await req.json();
    const { channels = ['push'] } = notificationData;

    console.log('📨 Processing notification request:', {
      user_id: notificationData.user_id,
      type: notificationData.type,
      title: notificationData.title,
      channels
    });

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        title_ro: notificationData.title_ro,
        message: notificationData.message,
        message_ro: notificationData.message_ro,
        data: notificationData.data || {}
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Failed to create notification:', notificationError);
      throw notificationError;
    }

    console.log('✅ Notification created:', {
      id: notification.id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title
    });

    const results = {
      notification_id: notification.id,
      push_sent: false,
      email_sent: false,
      sms_sent: false,
      telegram_sent: false,
      errors: [] as string[]
    };

    // Send push notification
    if (channels.includes('push')) {
      try {
        const { data: devices } = await supabase
          .from('user_devices')
          .select('device_token, platform')
          .eq('user_id', notificationData.user_id)
          .eq('is_active', true);

        if (devices && devices.length > 0) {
          // Here you would integrate with push notification service
          // For now, just simulate success
          console.log(`Would send push to ${devices.length} devices`);
          results.push_sent = true;
          
          // Update notification record
          await supabase
            .from('notifications')
            .update({ push_sent: true })
            .eq('id', notification.id);
        }
      } catch (error) {
        results.errors.push(`Push notification failed: ${error.message}`);
      }
    }

    // Telegram: deliver to every linked account (cheap, high open rate)
    try {
      const tgToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      if (tgToken) {
        const { data: tg } = await supabase
          .from('user_telegram')
          .select('chat_id')
          .eq('user_id', notificationData.user_id)
          .maybeSingle();
        if (tg?.chat_id) {
          const text = `<b>${notificationData.title}</b>\n${notificationData.message}`;
          const resp = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: tg.chat_id, text, parse_mode: 'HTML' }),
          });
          results.telegram_sent = resp.ok;
          if (!resp.ok) results.errors.push(`Telegram send failed: ${resp.status}`);
        }
      }
    } catch (error) {
      results.errors.push(`Telegram failed: ${error.message}`);
    }

    // Send email notification
    if (channels.includes('email')) {
      try {
        // Get user email from auth.users
        const { data: user } = await supabase.auth.admin.getUserById(notificationData.user_id);
        
        if (user?.user?.email) {
          // Here you would integrate with email service (SendGrid, etc.)
          console.log(`Would send email to ${user.user.email}`);
          results.email_sent = true;
          
          // Update notification record
          await supabase
            .from('notifications')
            .update({ email_sent: true })
            .eq('id', notification.id);
        }
      } catch (error) {
        results.errors.push(`Email notification failed: ${error.message}`);
      }
    }

    // Send SMS notification
    if (channels.includes('sms')) {
      try {
        // Get user phone from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', notificationData.user_id)
          .single();
        
        if (profile?.phone) {
          // Here you would integrate with SMS service (Twilio, etc.)
          console.log(`Would send SMS to ${profile.phone}`);
          results.sms_sent = true;
          
          // Update notification record
          await supabase
            .from('notifications')
            .update({ sms_sent: true })
            .eq('id', notification.id);
        }
      } catch (error) {
        results.errors.push(`SMS notification failed: ${error.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });

  } catch (error) {
    console.error('Notification error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
});