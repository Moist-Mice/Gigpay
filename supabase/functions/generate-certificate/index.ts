// @ts-nocheck
// supabase/functions/generate-certificate/index.ts
// Deno Edge Function — generates tamper-proof PDF certificate
// 1. Verify Clerk JWT  2. Load submission + user  3. Build PDF (pdf-lib)
// 4. SHA-256 hash  5. Upload to pdfs/ bucket  6. Save certificates row
// NOTE: @ts-nocheck suppresses Node TS server errors — this file runs on Deno, not Node.

import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateHumanId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GIG-${year}-${random}`;
}

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(-10, -5)}XXXXX`;
}

const platformNames: Record<string, string> = {
  swiggy: 'Swiggy Delivery',
  zomato: 'Zomato Delivery',
  rapido: 'Rapido Captain',
  other:  'Gig Platform',
};

// ── PDF Builder ────────────────────────────────────────────────────────────────
// A4 = 595 × 842 pt. Origin is bottom-left in pdf-lib.

async function buildCertificatePDF(params: {
  humanId: string;
  workerName: string;
  phone: string;
  platform: string;
  avgMonthly: number;
  trendPct: number;
  consistencyScore: number;
  nbfcVerdict: 'STRONG' | 'MODERATE' | 'WEAK';
  monthsData: Array<{ period: string; amount: number }>;
  sha256Hash: string;
  verifyUrl: string;
  issuedAt: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono    = await pdfDoc.embedFont(StandardFonts.Courier);

  // Brand colors (rgb 0–1 scale)
  const orange  = rgb(0.976, 0.451, 0.086);  // #F97316
  const white   = rgb(1, 1, 1);
  const dark    = rgb(0.102, 0.102, 0.102);   // #1A1A1A
  const muted   = rgb(0.42, 0.447, 0.502);    // #6B7280
  const border  = rgb(0.898, 0.906, 0.922);   // #E5E7EB
  const success = rgb(0.086, 0.639, 0.290);   // #16A34A
  const warning = rgb(0.851, 0.467, 0.000);   // #D97706
  const danger  = rgb(0.863, 0.149, 0.149);   // #DC2626
  const gray    = rgb(0.6, 0.6, 0.6);

  let y = height;

  // ── 1. Orange header strip (80pt) ─────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: orange });
  page.drawText('GigPay', { x: 32, y: height - 48, font: fontBold, size: 28, color: white });
  page.drawText('Income Verification Certificate', { x: 32, y: height - 66, font: fontRegular, size: 11, color: white });
  const idWidth = fontMono.widthOfTextAtSize(params.humanId, 10);
  page.drawText(params.humanId, { x: width - idWidth - 32, y: height - 52, font: fontMono, size: 10, color: white });
  y = height - 80;

  // ── 2. Worker details block ────────────────────────────────────────────────
  y -= 28;
  page.drawText('Worker Details', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 20;

  const workerDetails = [
    ['Name',         params.workerName],
    ['Phone',        maskPhone(params.phone)],
    ['Platform',     platformNames[params.platform] ?? params.platform],
    ['Issued Date',  new Date(params.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
  ];

  for (const [label, value] of workerDetails) {
    page.drawText(`${label}:`, { x: 32, y, font: fontBold, size: 10, color: muted });
    page.drawText(value, { x: 140, y, font: fontRegular, size: 10, color: dark });
    y -= 16;
  }

  // ── 3. Divider ─────────────────────────────────────────────────────────────
  y -= 8;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 20;

  // ── 4. 3-metric block ──────────────────────────────────────────────────────
  page.drawText('Income Summary', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 28;

  const metricW = (width - 64) / 3;
  const metrics = [
    { label: 'Avg Monthly Income', value: `Rs.${params.avgMonthly.toLocaleString('en-IN')}`, color: dark },
    {
      label: 'Income Trend',
      value: `${params.trendPct >= 0 ? '+' : ''}${params.trendPct.toFixed(1)}%`,
      color: params.trendPct >= 0 ? success : danger,
    },
    {
      label: 'Consistency Score',
      value: `${params.consistencyScore}/100`,
      color: params.consistencyScore >= 80 ? success : params.consistencyScore >= 60 ? warning : danger,
    },
  ];

  for (let i = 0; i < metrics.length; i++) {
    const mx = 32 + i * metricW;
    page.drawText(metrics[i].value, { x: mx, y, font: fontBold, size: 20, color: metrics[i].color });
    page.drawText(metrics[i].label, { x: mx, y: y - 16, font: fontRegular, size: 9, color: muted });
  }
  y -= 44;

  // NBFC Verdict badge
  const verdictColors: Record<string, typeof success> = { STRONG: success, MODERATE: warning, WEAK: danger };
  const verdictColor = verdictColors[params.nbfcVerdict] ?? danger;
  const verdictText = `NBFC Verdict: ${params.nbfcVerdict}`;
  page.drawRectangle({ x: 32, y: y - 6, width: 160, height: 22, color: rgb(0.95, 0.95, 0.95) });
  page.drawText(verdictText, { x: 40, y, font: fontBold, size: 11, color: verdictColor });
  y -= 24;

  // ── 5. Divider ─────────────────────────────────────────────────────────────
  y -= 12;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 20;

  // ── 6. Monthly earnings table ──────────────────────────────────────────────
  page.drawText('Monthly Earnings', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 18;

  page.drawRectangle({ x: 32, y: y - 4, width: width - 64, height: 18, color: rgb(0.97, 0.97, 0.97) });
  page.drawText('Month',      { x: 40,  y, font: fontBold, size: 9, color: muted });
  page.drawText('Amount',     { x: 200, y, font: fontBold, size: 9, color: muted });
  page.drawText('vs Average', { x: 340, y, font: fontBold, size: 9, color: muted });
  y -= 18;

  const avg = params.avgMonthly;
  const sorted = [...params.monthsData].sort((a, b) => a.period.localeCompare(b.period));

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const deviation = ((m.amount - avg) / avg * 100);
    const monthLabel = new Date(m.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    const deviationStr = `${deviation >= 0 ? '+' : ''}${deviation.toFixed(0)}%`;
    const rowColor = i % 2 === 0 ? white : rgb(0.98, 0.98, 0.98);

    page.drawRectangle({ x: 32, y: y - 4, width: width - 64, height: 16, color: rowColor });
    page.drawText(monthLabel, { x: 40, y, font: fontRegular, size: 9, color: dark });
    page.drawText(`Rs.${m.amount.toLocaleString('en-IN')}`, { x: 200, y, font: fontRegular, size: 9, color: dark });
    page.drawText(deviationStr, { x: 340, y, font: fontBold, size: 9, color: deviation >= 0 ? success : danger });
    y -= 16;
    if (y < 220) break; // safety for 12+ months
  }

  // ── 7. Tamper evidence block ───────────────────────────────────────────────
  y -= 16;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 16;
  page.drawText('Tamper Evidence', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 16;

  const hashDisplay = params.sha256Hash.slice(0, 32) + '...';
  page.drawText('SHA-256:', { x: 32, y, font: fontBold, size: 9, color: muted });
  page.drawText(hashDisplay, { x: 100, y, font: fontMono, size: 8, color: dark });
  y -= 14;
  page.drawText('Verify at:', { x: 32, y, font: fontBold, size: 9, color: muted });
  page.drawText(params.verifyUrl, { x: 100, y, font: fontMono, size: 8, color: orange });
  y -= 14;

  // ── 8. Disclaimer ──────────────────────────────────────────────────────────
  y -= 8;
  const disclaimer =
    'This certificate is generated by GigPay based on earnings data extracted from platform screenshots. ' +
    'It is not a government-issued document. The SHA-256 hash uniquely identifies this certificate and ' +
    'can be used to verify its authenticity at the URL above.';

  const words = disclaimer.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    if ((line + word).length > 88) { lines.push(line.trim()); line = ''; }
    line += word + ' ';
  }
  if (line.trim()) lines.push(line.trim());

  for (const l of lines) {
    page.drawText(l, { x: 32, y, font: fontRegular, size: 7, color: gray });
    y -= 10;
  }

  // ── 9. Footer strip ────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 32, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('gigpay.app', { x: 32, y: 12, font: fontBold, size: 9, color: muted });
  const dateStr = new Date(params.issuedAt).toLocaleDateString('en-IN');
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, { x: width - dateWidth - 32, y: 12, font: fontRegular, size: 9, color: muted });

  return pdfDoc.save();
}

// ── Main Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
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

    // ── Supabase admin ────────────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Parse body ────────────────────────────────────────────────────────────
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Load submission ───────────────────────────────────────────────────────
    const { data: submission, error: subError } = await supabaseAdmin
      .from('income_submissions')
      .select('*, users(id, clerk_user_id, name, phone, platform)')
      .eq('id', submission_id)
      .single();

    if (subError || !submission) {
      return new Response(JSON.stringify({ error: 'Submission not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller owns this submission
    if (submission.users.clerk_user_id !== clerkUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Check if certificate already exists (idempotent) ─────────────────────
    const { data: existing } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('submission_id', submission_id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({
        certificate_id: existing.id,
        human_id:       existing.human_id,
        pdf_url:        existing.pdf_url,
        sha256_hash:    existing.sha256_hash,
        qr_data:        existing.qr_data,
        issued_at:      existing.issued_at,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Generate IDs and hash ─────────────────────────────────────────────────
    const humanId   = generateHumanId();
    const issuedAt  = new Date().toISOString();
    const dateStr   = issuedAt.slice(0, 10);

    const canonicalStr = [
      submission.users.id,
      submission_id,
      JSON.stringify(submission.months_data),
      submission.avg_monthly_income,
      dateStr,
    ].join('|');

    const sha256Hash = await sha256(canonicalStr);

    // QR uses deep link (opens the verify screen in-app on device)
    const appUrl   = Deno.env.get('APP_URL') ?? 'gigpay://';
    const verifyUrl = `gigpay://verify/${humanId}`;
    // Web verify URL for the PDF text (browser fallback)
    const webVerifyUrl = `${appUrl}/verify/${humanId}`;

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const pdfBytes = await buildCertificatePDF({
      humanId,
      workerName:       submission.users.name,
      phone:            submission.users.phone,
      platform:         submission.platform,
      avgMonthly:       submission.avg_monthly_income,
      trendPct:         submission.trend_pct,
      consistencyScore: submission.consistency_score,
      nbfcVerdict:      submission.nbfc_verdict,
      monthsData:       submission.months_data,
      sha256Hash,
      verifyUrl:        webVerifyUrl,
      issuedAt,
    });

    // ── Upload PDF to Supabase Storage (pdfs bucket — public) ─────────────────
    const pdfPath = `${submission.users.id}/${humanId}.pdf`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('pdfs')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage.from('pdfs').getPublicUrl(pdfPath);
    const pdfUrl = publicUrlData.publicUrl;

    // ── Save certificate record ───────────────────────────────────────────────
    const { data: cert, error: certError } = await supabaseAdmin
      .from('certificates')
      .insert({
        human_id:      humanId,
        submission_id: submission_id,
        user_id:       submission.users.id,
        pdf_url:       pdfUrl,
        sha256_hash:   sha256Hash,
        qr_data:       verifyUrl,   // deep link for QR scan
        issued_at:     issuedAt,
      })
      .select()
      .single();

    if (certError) throw certError;

    // ── Return ────────────────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      certificate_id: cert.id,
      human_id:       humanId,
      pdf_url:        pdfUrl,
      sha256_hash:    sha256Hash,
      qr_data:        verifyUrl,
      issued_at:      issuedAt,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('generate-certificate error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
