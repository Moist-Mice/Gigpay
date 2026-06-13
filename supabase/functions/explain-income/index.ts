// @ts-nocheck
// supabase/functions/explain-income/index.ts
// Phase 4 (Master Plan): Streams a Hindi income explanation via MiniMax M3
// Uses Server-Sent Events (SSE) so tokens appear live in the app

import { createClient } from "npm:@supabase/supabase-js@2";

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MINIMAX_MODEL = 'minimax/minimax-m3';

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
    const clerkUserId = payload.sub;
    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch submission ──────────────────────────────────────────────────────
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
      .select('*, users(name, platform)')
      .eq('id', submission_id)
      .single();

    if (!submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Build Hindi prompt ────────────────────────────────────────────────────
    const platform = submission.platform ?? submission.users?.platform ?? 'gig';
    const avg = submission.avg_monthly_income ?? 0;
    const trend = submission.trend_pct ?? 0;
    const consistency = submission.consistency_score ?? 0;
    const verdict = submission.nbfc_verdict ?? 'WEAK';
    const composite = submission.composite_credit_score;
    const loan = submission.loan_eligibility_estimate;

    const prompt = `Yeh income report samjhao simple Hindi mein:

Platform: ${platform}
Avg monthly income: ₹${avg.toLocaleString('en-IN')}
Income trend: ${trend >= 0 ? '+' : ''}${trend}%
Consistency score: ${consistency}/100
NBFC verdict: ${verdict}${composite != null ? `\nCredit score: ${composite}/100` : ''}${loan != null ? `\nLoan eligibility: ₹${loan.toLocaleString('en-IN')}` : ''}
Monthly data: ${JSON.stringify((submission.months_data ?? []).slice(0, 6))}

Ek gig worker ke liye 4-5 sentences mein samjhao:
1. Income kaisi hai?
2. Loan ke liye eligible hai kya?
3. Ek practical suggestion do.
Simple Hindi mein likho, koi technical words mat use karo.`;

    // ── Call MiniMax M3 with streaming ────────────────────────────────────────
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openRouterKey) {
      // No API key — return a canned Hindi explanation for demo
      const fallback = buildFallbackExplanation(avg, verdict, composite, loan);
      return new Response(
        `data: ${JSON.stringify({ text: fallback, done: true })}\n\ndata: [DONE]\n\n`,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    const aiResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://gigpay.app',
        'X-Title': 'GigPay',
      },
      body: JSON.stringify({
        model: MINIMAX_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful financial assistant for Indian gig workers. Always respond in simple Hindi. Keep it encouraging and practical.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      // Fall back to canned explanation
      const fallback = buildFallbackExplanation(avg, verdict, composite, loan);
      return new Response(
        `data: ${JSON.stringify({ text: fallback, done: true })}\n\ndata: [DONE]\n\n`,
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // ── Pipe SSE stream from OpenRouter back to client ────────────────────────
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = aiResponse.body!.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const jsonStr = line.replace('data: ', '');
            if (jsonStr === '[DONE]') {
              await writer.write(encoder.encode('data: [DONE]\n\n'));
              break;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const token = parsed.choices?.[0]?.delta?.content ?? '';
              if (token) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

  } catch (err) {
    console.error('explain-income error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Canned Hindi explanation for demo / no API key ───────────────────────────
function buildFallbackExplanation(avg: number, verdict: string, composite: number | null, loan: number | null): string {
  const avgStr = `₹${Math.round(avg).toLocaleString('en-IN')}`;
  const loanStr = loan ? `₹${loan.toLocaleString('en-IN')}` : 'thodi kam';
  const scoreStr = composite != null ? `${composite}/100` : '';

  if (verdict === 'STRONG') {
    return `Bahut badhiya! Aapki average monthly income ${avgStr} hai aur yeh bilkul stable hai. ${scoreStr ? `Aapka credit score ${scoreStr} hai jo ek strong profile dikhata hai. ` : ''}Loan eligibility estimate ${loanStr} tak hai — iska matlab NBFC aapko easily loan de sakti hai. Apni kamai ka yeh certificate lender ko WhatsApp karo!`;
  } else if (verdict === 'MODERATE') {
    return `Theek hai! Aapki income ${avgStr} per month hai. ${scoreStr ? `Credit score ${scoreStr} — moderate profile. ` : ''}Loan ke liye eligible ho, lekin ${loanStr} tak hi. Agar aap EMI thodi kam karein aur savings badhaein, toh score aur behtar hoga. Certificate share karo lender ke saath!`;
  } else {
    return `Aapki income ${avgStr} per month hai. Abhi loan eligibility thodi weak hai. Kuch months aur consistent income show karo, EMI payments regular rakho, aur savings badhao. GigPay certificate lender ko dikhao — yeh formal income proof hai jo bohot kaam aata hai!`;
  }
}
