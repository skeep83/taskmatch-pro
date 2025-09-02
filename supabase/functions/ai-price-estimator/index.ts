import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceEstimationRequest {
  description: string;
  category: string;
  photos?: string[];
  location?: string;
  urgency?: 'normal' | 'urgent' | 'emergency';
}

const categoryPricing = {
  'plumbing': {
    base: 150,
    hourly: 80,
    keywords: {
      'труба': 50, 'кран': 30, 'унитаз': 100, 'ванна': 200,
      'țeavă': 50, 'robinet': 30, 'toaletă': 100, 'cadă': 200
    }
  },
  'electrical': {
    base: 120,
    hourly: 100,
    keywords: {
      'проводка': 200, 'розетка': 25, 'выключатель': 20, 'люстра': 80,
      'instalație': 200, 'priză': 25, 'întrerupător': 20, 'candelabru': 80
    }
  },
  'cleaning': {
    base: 80,
    hourly: 40,
    keywords: {
      'генеральная': 150, 'окна': 50, 'ковер': 30, 'кухня': 80,
      'generală': 150, 'ferestre': 50, 'covor': 30, 'bucătărie': 80
    }
  },
  'repair': {
    base: 200,
    hourly: 120,
    keywords: {
      'стена': 100, 'потолок': 150, 'пол': 120, 'дверь': 80,
      'perete': 100, 'tavan': 150, 'podea': 120, 'ușă': 80
    }
  }
};

const urgencyMultipliers = {
  'normal': 1.0,
  'urgent': 1.3,
  'emergency': 1.8
};

const locationMultipliers = {
  'Кишинев': 1.2, 'Chișinău': 1.2,
  'Бельцы': 1.0, 'Bălți': 1.0,
  'Тирасполь': 0.9, 'Tiraspol': 0.9,
  'Комрат': 0.8, 'Comrat': 0.8,
  'Кагул': 0.8, 'Cahul': 0.8
};

async function analyzeImageWithAI(imageUrl: string): Promise<string> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return 'Изображение загружено, но анализ недоступен';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Проанализируйте это изображение и опишите, какие работы требуются. Оцените сложность от 1 до 10.'
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Анализ изображения не удался';

  } catch (error) {
    console.error('Image analysis error:', error);
    return 'Ошибка анализа изображения';
  }
}

function estimatePrice(description: string, category: string, urgency: string, location?: string): any {
  const pricing = categoryPricing[category] || categoryPricing['repair'];
  let estimatedPrice = pricing.base;

  // Analyze description for keywords
  const lowerDesc = description.toLowerCase();
  for (const [keyword, price] of Object.entries(pricing.keywords)) {
    if (lowerDesc.includes(keyword.toLowerCase())) {
      estimatedPrice += price;
    }
  }

  // Apply urgency multiplier
  const urgencyMult = urgencyMultipliers[urgency] || 1.0;
  estimatedPrice *= urgencyMult;

  // Apply location multiplier
  if (location) {
    for (const [loc, mult] of Object.entries(locationMultipliers)) {
      if (location.toLowerCase().includes(loc.toLowerCase())) {
        estimatedPrice *= mult;
        break;
      }
    }
  }

  // Calculate time estimate (hours)
  const estimatedHours = Math.max(1, Math.ceil(estimatedPrice / pricing.hourly));

  return {
    estimatedPrice: Math.round(estimatedPrice),
    estimatedHours,
    priceRange: {
      min: Math.round(estimatedPrice * 0.8),
      max: Math.round(estimatedPrice * 1.3)
    },
    hourlyRate: pricing.hourly,
    complexity: estimatedPrice > 500 ? 'high' : estimatedPrice > 200 ? 'medium' : 'low'
  };
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

    const { description, category, photos, location, urgency = 'normal' }: PriceEstimationRequest = await req.json();

    // Basic price estimation
    const estimation = estimatePrice(description, category, urgency, location);

    // AI image analysis if photos provided
    let imageAnalysis = null;
    if (photos && photos.length > 0) {
      imageAnalysis = await analyzeImageWithAI(photos[0]);
    }

    // Store estimation in database for learning
    const { error: dbError } = await supabaseClient
      .from('price_estimations')
      .insert({
        description,
        category,
        location,
        urgency,
        estimated_price: estimation.estimatedPrice,
        estimated_hours: estimation.estimatedHours,
        image_analysis: imageAnalysis,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(JSON.stringify({
      success: true,
      estimation: {
        ...estimation,
        imageAnalysis,
        confidence: photos ? 0.85 : 0.70,
        recommendations: [
          'Цены могут варьироваться в зависимости от сложности работ',
          'Рекомендуем получить несколько предложений',
          urgency === 'emergency' ? 'Срочные работы дороже на 80%' : null
        ].filter(Boolean)
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error('AI Estimation Error:', error);
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