// @ts-nocheck
// supabase/functions/parse-screenshot/index.ts
// NOTE: @ts-nocheck suppresses Node TS server errors — this file runs on Deno, not Node.
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MINIMAX_MODEL = 'minimax/minimax-m3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify Clerk JWT ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode Clerk JWT (standard JWT — no library needed in Deno)
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    const clerkUserId = payload.sub;

    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Init Supabase admin client ────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 3. Map Clerk user ID to our users table ──────────────────────────────
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, platform')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Parse request body ────────────────────────────────────────────────
    const { storage_path, platform_hint } = await req.json();
    if (!storage_path) {
      return new Response(JSON.stringify({ error: 'storage_path required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. Create submission record (status: processing) ─────────────────────
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('income_submissions')
      .insert({
        user_id: user.id,
        platform: platform_hint ?? user.platform,
        screenshot_url: storage_path,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    const submissionId = submission.id;

    // ── 6. Download screenshot from Supabase Storage ─────────────────────────
    const { data: fileData, error: downloadError } = await supabaseAdmin
      .storage
      .from('screenshots')
      .download(storage_path);

    if (downloadError || !fileData) throw new Error('Failed to download screenshot');

    // Convert Blob → base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binary);

    // Detect MIME type from file header
    const mimeType = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 ? 'image/jpeg' : 'image/png';

    // ── 7. Call MiniMax M3 via OpenRouter (vision) ───────────────────────────
    const aiMessages = [
      {
        role: 'system',
        content: 'You are a precise data extraction AI. Return only valid JSON. No explanation, no markdown, no code fences.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
          {
            type: 'text',
            text: `Extract all earnings data from this gig worker's platform earnings screenshot (Swiggy / Zomato / Rapido or similar Indian platform).

Return this exact JSON structure:
{
  "platform": "swiggy|zomato|rapido|unknown",
  "currency": "INR",
  "earnings": [
    {"period": "YYYY-MM", "amount": 18400, "trips": 245, "label": "October 2024"}
  ],
  "total_visible": 110400,
  "data_quality": "high|medium|low",
  "notes": "any caveats"
}

Rules:
- period must be YYYY-MM format
- amount in rupees as integer (no decimals)
- If you cannot extract earnings data, return: {"error": "reason why"}
- Extract ALL months visible
- If trips count not visible, omit the trips field`,
          },
        ],
      },
    ];

    const aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gigpay.app',
        'X-Title': 'GigPay',
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: aiMessages,
        max_tokens: 1000,
        temperature: 0,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenRouter error: ${aiResponse.status} ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';

    // ── 8. Parse AI JSON response ────────────────────────────────────────────
    let parsedAI: any;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawContent.replace(/```json|```/g, '').trim();
      parsedAI = JSON.parse(cleaned);
    } catch {
      throw new Error(`AI returned unparseable JSON: ${rawContent.slice(0, 200)}`);
    }

    if (parsedAI.error) {
      // AI couldn't extract data
      await supabaseAdmin
        .from('income_submissions')
        .update({ status: 'failed', error_message: parsedAI.error })
        .eq('id', submissionId);

      return new Response(JSON.stringify({ error: parsedAI.error, submission_id: submissionId }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const months_data: Array<{ period: string; amount: number; trips?: number }> =
      parsedAI.earnings ?? [];

    if (months_data.length === 0) {
      await supabaseAdmin
        .from('income_submissions')
        .update({ status: 'failed', error_message: 'No earnings data found in screenshot' })
        .eq('id', submissionId);

      return new Response(JSON.stringify({ error: 'No earnings data found', submission_id: submissionId }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 9. Run income intelligence (inline — same logic as lib/intelligence.ts) ──
    const sorted = [...months_data].sort((a, b) => a.period.localeCompare(b.period));
    const amounts = sorted.map(e => e.amount);
    const n = amounts.length;
    const avg = amounts.reduce((s, a) => s + a, 0) / n;

    // Linear regression slope as % of mean (trend)
    const xMean = (n - 1) / 2;
    let num = 0, den = 0;
    amounts.forEach((y, i) => { num += (i - xMean) * (y - avg); den += (i - xMean) ** 2; });
    const slope = den === 0 ? 0 : num / den;
    const trend_pct = Math.round(((slope / avg) * 100) * 10) / 10;

    // Consistency: % of months where amount >= 80% of avg
    const consistentMonths = amounts.filter(a => a >= avg * 0.8).length;
    const consistency_score = Math.round((consistentMonths / n) * 100);

    // Seasonality: months with >20% deviation from mean
    const seasonality_flags = sorted
      .filter(m => Math.abs(m.amount - avg) / avg > 0.2)
      .map(m => {
        const dev = ((m.amount - avg) / avg * 100).toFixed(0);
        const label = new Date(m.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        return `${label}: ${Number(dev) >= 0 ? '+' : ''}${dev}%`;
      });

    // NBFC verdict
    let nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
    if (consistency_score >= 80 && trend_pct >= 0) nbfc_verdict = 'STRONG';
    else if (consistency_score >= 60) nbfc_verdict = 'MODERATE';

    // ── 10. Update submission with results ───────────────────────────────────
    await supabaseAdmin
      .from('income_submissions')
      .update({
        platform: parsedAI.platform ?? platform_hint ?? user.platform,
        raw_parsed_json: parsedAI,
        months_data: months_data,
        avg_monthly_income: Math.round(avg),
        trend_pct,
        consistency_score,
        seasonality_flags,
        nbfc_verdict,
        status: 'complete',
      })
      .eq('id', submissionId)
      .select()
      .single();

    // ── 11. Return result ────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      submission_id: submissionId,
      platform: parsedAI.platform,
      months_count: months_data.length,
      months_data,
      avg_monthly_income: Math.round(avg),
      trend_pct,
      consistency_score,
      seasonality_flags,
      nbfc_verdict,
      status: 'complete',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('parse-screenshot error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
