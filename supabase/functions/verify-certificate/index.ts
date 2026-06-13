// @ts-nocheck
// supabase/functions/verify-certificate/index.ts
// Public endpoint — no auth. Called by lender scanning QR on PDF.
// Accepts GET (?id=GIG-...) or POST ({ id })
// NOTE: @ts-nocheck suppresses Node TS server errors — this file runs on Deno, not Node.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Re-compute SHA-256 to verify tamper evidence */
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Accept both GET (?id=GIG-...) and POST ({ id })
    let humanId: string | null = null;
    if (req.method === 'GET') {
      humanId = new URL(req.url).searchParams.get('id');
    } else {
      const body = await req.json();
      humanId = body.id;
    }

    if (!humanId) {
      return new Response(JSON.stringify({ error: 'Certificate ID required (?id=GIG-...)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Load certificate + submission + user
    const { data: cert, error: certError } = await supabaseAdmin
      .from('certificates')
      .select(`
        *,
        income_submissions (
          id, months_data, avg_monthly_income, trend_pct,
          consistency_score, nbfc_verdict, platform, created_at
        ),
        users ( name, phone, platform )
      `)
      .eq('human_id', humanId)
      .single();

    if (certError || !cert) {
      return new Response(JSON.stringify({ valid: false, error: 'Certificate not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sub = cert.income_submissions;

    // Re-compute SHA-256 to verify tamper evidence
    const issuedDate = cert.issued_at.slice(0, 10);
    const canonicalStr = [
      cert.user_id,
      cert.submission_id,
      JSON.stringify(sub.months_data),
      sub.avg_monthly_income,
      issuedDate,
    ].join('|');

    const recomputedHash = await sha256(canonicalStr);
    const hashVerified = recomputedHash === cert.sha256_hash;

    // Increment verified_count
    await supabaseAdmin
      .from('certificates')
      .update({ verified_count: (cert.verified_count ?? 0) + 1 })
      .eq('id', cert.id);

    // Log verification event
    await supabaseAdmin
      .from('verifications')
      .insert({
        certificate_id: cert.id,
        verifier_ip: req.headers.get('x-forwarded-for') ?? 'unknown',
      });

    return new Response(JSON.stringify({
      valid:              true,
      hash_verified:      hashVerified,
      human_id:           humanId,
      worker_name:        cert.users.name,
      platform:           sub.platform,
      avg_monthly_income: sub.avg_monthly_income,
      trend_pct:          sub.trend_pct,
      consistency_score:  sub.consistency_score,
      nbfc_verdict:       sub.nbfc_verdict,
      issued_at:          cert.issued_at,
      verified_count:     (cert.verified_count ?? 0) + 1,
      pdf_url:            cert.pdf_url,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('verify-certificate error:', err);
    return new Response(JSON.stringify({ valid: false, error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
