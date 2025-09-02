import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailTemplateRequest {
  template: 'welcome' | 'job_match' | 'payment_received' | 'pro_upgrade' | 'password_reset';
  data: Record<string, any>;
  to: string;
  language?: 'ru' | 'ro';
}

const templates = {
  welcome: {
    ru: {
      subject: 'Добро пожаловать в ServiceHub!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">Добро пожаловать в ServiceHub!</h1>
          </div>
          <div style="padding: 40px; background: #f8f9fa;">
            <h2>Привет, ${data.name}!</h2>
            <p>Спасибо за регистрацию на нашей платформе. Теперь вы можете:</p>
            <ul>
              <li>Найти проверенных специалистов</li>
              <li>Получить мгновенные предложения</li>
              <li>Безопасно оплачивать услуги</li>
              <li>Оставлять отзывы и рейтинги</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Перейти в личный кабинет</a>
            </div>
          </div>
        </div>
      `
    },
    ro: {
      subject: 'Bine ați venit la ServiceHub!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">Bine ați venit la ServiceHub!</h1>
          </div>
          <div style="padding: 40px; background: #f8f9fa;">
            <h2>Salut, ${data.name}!</h2>
            <p>Mulțumim pentru înregistrare pe platforma noastră. Acum puteți:</p>
            <ul>
              <li>Găsi specialiști verificați</li>
              <li>Primi oferte instantanee</li>
              <li>Plăti serviciile în siguranță</li>
              <li>Lăsa recenzii și evaluări</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.dashboardUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Mergi la contul personal</a>
            </div>
          </div>
        </div>
      `
    }
  },
  job_match: {
    ru: {
      subject: 'Новый заказ для вас!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Новый заказ!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>${data.jobTitle}</h2>
            <p><strong>Категория:</strong> ${data.category}</p>
            <p><strong>Бюджет:</strong> ${data.budget} MDL</p>
            <p><strong>Местоположение:</strong> ${data.location}</p>
            <p><strong>Описание:</strong></p>
            <p>${data.description}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.jobUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Откликнуться на заказ</a>
            </div>
          </div>
        </div>
      `
    },
    ro: {
      subject: 'Comandă nouă pentru dvs.!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #28a745; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Comandă nouă!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>${data.jobTitle}</h2>
            <p><strong>Categoria:</strong> ${data.category}</p>
            <p><strong>Buget:</strong> ${data.budget} MDL</p>
            <p><strong>Locația:</strong> ${data.location}</p>
            <p><strong>Descrierea:</strong></p>
            <p>${data.description}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.jobUrl}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Răspunde la comandă</a>
            </div>
          </div>
        </div>
      `
    }
  },
  payment_received: {
    ru: {
      subject: 'Платеж получен!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #17a2b8; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Платеж получен!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Сумма: ${data.amount} MDL</h2>
            <p><strong>За заказ:</strong> ${data.jobTitle}</p>
            <p><strong>Дата:</strong> ${data.date}</p>
            <p><strong>ID транзакции:</strong> ${data.transactionId}</p>
            <p>Средства поступили на ваш кошелек ServiceHub.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.walletUrl}" style="background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Посмотреть кошелек</a>
            </div>
          </div>
        </div>
      `
    },
    ro: {
      subject: 'Plata primită!',
      html: (data: any) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #17a2b8; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Plata primită!</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2>Suma: ${data.amount} MDL</h2>
            <p><strong>Pentru comanda:</strong> ${data.jobTitle}</p>
            <p><strong>Data:</strong> ${data.date}</p>
            <p><strong>ID tranzacție:</strong> ${data.transactionId}</p>
            <p>Fondurile au fost adăugate în portofelul dvs. ServiceHub.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.walletUrl}" style="background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Vezi portofelul</a>
            </div>
          </div>
        </div>
      `
    }
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { template, data, to, language = 'ru' }: EmailTemplateRequest = await req.json();

    if (!templates[template]) {
      throw new Error(`Template ${template} not found`);
    }

    const templateConfig = templates[template][language];
    const emailContent = {
      to,
      subject: templateConfig.subject,
      html: templateConfig.html(data),
    };

    // Store email in database for tracking
    const { error: dbError } = await supabaseClient
      .from('email_queue')
      .insert({
        recipient: to,
        template,
        subject: emailContent.subject,
        html_content: emailContent.html,
        template_data: data,
        language,
        status: 'pending'
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(JSON.stringify({
      success: true,
      email: emailContent
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);