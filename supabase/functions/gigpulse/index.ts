// @ts-nocheck
// supabase/functions/gigpulse/index.ts
// GigPulse: Seasonal AI pattern analysis — the novel feature
// Returns: pattern_type, high_months, low_months, insight_hindi, badge

import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: submission } = await supabaseAdmin
      .from('income_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (!submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const months = submission.months_data ?? [];
    const rawMonths = submission.raw_parsed_json?.months ?? [];
    const avg = submission.avg_monthly_income ?? 0;
    const platform = submission.platform ?? 'gig';

    // ── Build month labels for AI ─────────────────────────────────────────────
    const monthLabels = months.map((m: any) => {
      const date = new Date(m.period + '-01');
      const label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const deviation = avg > 0 ? Math.round(((m.amount - avg) / avg) * 100) : 0;
      return `${label}: ₹${m.amount.toLocaleString('en-IN')} (${deviation >= 0 ? '+' : ''}${deviation}% avg se)`;
    }).join('\n');

    // ── Build additional signals from raw_parsed_json ─────────────────────────
    const upiCreditCounts = rawMonths.map((m: any) => m.upi_credits ?? 0);
    const gigCounts = rawMonths.map((m: any) => m.gig_credits ?? 0);
    const totalUpiCredits = upiCreditCounts.reduce((s: number, v: number) => s + v, 0);
    const totalGigCredits = gigCounts.reduce((s: number, v: number) => s + v, 0);

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    // ── Fallback if no API key ────────────────────────────────────────────────
    if (!openRouterKey) {
      return new Response(JSON.stringify(buildFallback(months, avg, platform)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Build AI prompt ───────────────────────────────────────────────────────
    const prompt = `You are a financial analyst specializing in Indian gig worker income patterns.

Analyze this gig worker's monthly income data and identify seasonal patterns.

Platform: ${platform}
Average monthly income: ₹${avg.toLocaleString('en-IN')}
Monthly breakdown:
${monthLabels}
${totalUpiCredits > 0 ? `Total UPI credit transactions: ${totalUpiCredits}` : ''}
${totalGigCredits > 0 ? `Total small gig transactions (<₹500): ${totalGigCredits}` : ''}

Respond with ONLY valid JSON (no markdown), exactly this structure:
{
  "pattern_type": "FESTIVAL_DRIVEN" | "WEATHER_DRIVEN" | "SALARY_STABLE" | "GROWING" | "DECLINING" | "IRREGULAR",
  "high_months": ["Oct", "Nov"],
  "low_months": ["Jan", "Feb"],
  "insight_hindi": "2-3 sentences in simple Hindi explaining the pattern and what it means for the worker's creditworthiness. Be encouraging.",
  "insight_english": "1 sentence English summary for lenders",
  "reliability_signal": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "badge_text": "6 words max describing pattern e.g. Festival-Driven Reliable Income"
}

Rules:
- FESTIVAL_DRIVEN: spikes in Oct-Nov (Diwali), Mar (year-end), or other Indian festival months
- WEATHER_DRIVEN: dips in Jun-Aug (monsoon) for delivery/transport workers  
- SALARY_STABLE: consistent income within 15% variance (good for formal-sector side income)
- GROWING: clear upward trend month over month
- DECLINING: clear downward trend (flag gently)
- IRREGULAR: no clear pattern
- If income spikes in known festival months, mark reliability_signal as POSITIVE even if variance is high
- insight_hindi must be written in Devanagari Hindi script`;

    // ── Call OpenRouter ───────────────────────────────────────────────────────
    const models = ['minimax/minimax-m3', 'deepseek/deepseek-v4-flash', 'google/gemini-flash-1.5'];
    let result = null;

    for (const model of models) {
      try {
        const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://gigpay.app',
            'X-Title': 'GigPay GigPulse',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.3,
          }),
        });

        if (!resp.ok) continue;
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content ?? '';
        const cleaned = content.replace(/```json|```/g, '').trim();
        result = JSON.parse(cleaned);
        break;
      } catch { continue; }
    }

    if (!result) {
      return new Response(JSON.stringify(buildFallback(months, avg, platform)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('gigpulse error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Fallback without AI ───────────────────────────────────────────────────────
function buildFallback(months: any[], avg: number, platform: string) {
  if (months.length === 0) return {
    pattern_type: 'IRREGULAR', high_months: [], low_months: [],
    insight_hindi: 'आपकी आय का डेटा उपलब्ध नहीं है।',
    insight_english: 'Insufficient data for pattern analysis.',
    reliability_signal: 'NEUTRAL', badge_text: 'Insufficient Data',
  };

  const amounts = months.map((m: any) => m.amount);
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  const variance = avg > 0 ? (max - min) / avg : 0;
  const trend = amounts.length >= 2 ? amounts[amounts.length - 1] - amounts[0] : 0;

  let pattern_type = 'IRREGULAR';
  let reliability_signal = 'NEUTRAL';
  let insight_hindi = `आपकी औसत मासिक आय ₹${avg.toLocaleString('en-IN')} है।`;
  let badge_text = 'Irregular Income Pattern';

  if (variance < 0.15) {
    pattern_type = 'SALARY_STABLE';
    reliability_signal = 'POSITIVE';
    insight_hindi = `आपकी आय बहुत स्थिर है — हर महीने लगभग ₹${avg.toLocaleString('en-IN')} की कमाई है। यह लोन के लिए बहुत अच्छा संकेत है।`;
    badge_text = 'Highly Stable Income';
  } else if (trend > avg * 0.1) {
    pattern_type = 'GROWING';
    reliability_signal = 'POSITIVE';
    insight_hindi = `आपकी आय हर महीने बढ़ रही है! यह ट्रेंड दर्शाता है कि आप एक मेहनती कामगार हैं। लोन मिलने की संभावना अच्छी है।`;
    badge_text = 'Steadily Growing Income';
  } else if (trend < -avg * 0.1) {
    pattern_type = 'DECLINING';
    reliability_signal = 'NEGATIVE';
    insight_hindi = `पिछले कुछ महीनों में आय में कमी आई है। थोड़ा और मेहनत करें और कुछ महीने बाद दोबारा apply करें।`;
    badge_text = 'Income Needs Recovery';
  } else {
    reliability_signal = 'NEUTRAL';
    insight_hindi = `आपकी आय में उतार-चढ़ाव है, जो gig काम में सामान्य है। ₹${avg.toLocaleString('en-IN')} की औसत कमाई से loan मिलने की संभावना है।`;
    badge_text = 'Variable Gig Income';
  }

  return {
    pattern_type, high_months: [], low_months: [],
    insight_hindi, insight_english: `${platform} worker with ${pattern_type.toLowerCase().replace('_', ' ')} income pattern.`,
    reliability_signal, badge_text,
  };
}
