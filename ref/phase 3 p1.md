# Antigravity Prompt — GigPay Phase 3: Certificate + Share

> Read `GIGPAY_MASTER_PLAN.md` first. That is the single source of truth.
> Phase 1 (auth + scaffold) and Phase 2 (upload + AI parse + results screen) are complete and TypeScript-clean.
> **This is the last implementation phase before prototype testing.** After Phase 3, the full core loop — photograph → AI parse → certificate → share → lender verifies — is end-to-end functional on a physical device.

---

## WHAT PHASE 2 DELIVERED (do not re-create)

- `supabase/functions/parse-screenshot/index.ts` — deployed, working
- `lib/upload.ts` — Storage upload + parse Edge Function call
- `app/(tabs)/upload.tsx` — camera/gallery picker, demo long-press mode
- `app/processing/[id].tsx` — polling fallback screen
- `app/results/[id].tsx` — NBFC verdict, metrics, chart, monthly table
- `components/IncomeChart.tsx` — SVG bar chart
- `app/certificate/generate.tsx` — **placeholder only** (shows "Coming Soon")
- `components/EarningsCard.tsx` — updated to support submission cards
- `app/(tabs)/home.tsx` — live submissions list

## WHAT PHASE 3 MUST BUILD

| # | File | Status |
|---|------|--------|
| 1 | `supabase/functions/generate-certificate/index.ts` | NEW — Deno Edge Function |
| 2 | `supabase/functions/verify-certificate/index.ts` | NEW — Deno Edge Function (public, no auth) |
| 3 | `lib/share.ts` | NEW — PDF download + share sheet |
| 4 | `lib/certificate.ts` | NEW — certificate helper (human ID generator) |
| 5 | `app/certificate/generate.tsx` | REPLACE placeholder with real screen |
| 6 | `app/certificate/[id].tsx` | REPLACE placeholder with full certificate viewer |
| 7 | `app/verify/[id].tsx` | NEW — public lender verification page |
| 8 | `app/(tabs)/certificates.tsx` | REPLACE placeholder with certificates list |

> **Prototype testing goal**: After this phase, a judge or lender should be able to:
> 1. Open the app on a real Android device
> 2. Use demo mode (long-press) → see results → tap Generate Certificate → see the PDF certificate
> 3. Tap Share → WhatsApp opens with a PDF attachment
> 4. Lender opens the verify URL in a browser → sees tamper-proof verification instantly
> This complete loop must work on-device before Phase 3 is considered done.

---

## CRITICAL DESIGN NOTE — Prototype vs. Production

Phase 3 is the **prototype-complete milestone**. Some things are intentionally simplified for hackathon testing and will be hardened in future phases:

- The `verify-certificate` Edge Function is **public (no auth)** — by design, lenders scan a QR and verify without installing the app
- PDF is generated server-side (Deno Edge Function) to prevent client-side tampering — this is the production design, not a shortcut
- SHA-256 hash is computed server-side and stored — the verify function re-computes and compares, making the certificate tamper-evident
- The QR code in the PDF encodes a deep link URL: `https://gigpay.app/verify/GIG-YYYY-XXXXX` — in testing, this should point to your Expo dev server or a Supabase Edge Function that returns a mobile-friendly HTML page

---

## STEP 1: Install Dependencies

```bash
# PDF generation (client-side PDF download + preview)
npx expo install expo-print expo-sharing expo-file-system

# QR code in app screens (the PDF QR is generated server-side via a URL)
npx expo install react-native-qrcode-svg
```

> Note: The PDF itself is generated server-side in the Deno Edge Function using `pdf-lib` (imported from npm via Deno). `expo-print` is used only to download/preview the PDF on the device. Do not use `pdf-lib` in the Expo client.

---

## STEP 2: `lib/certificate.ts` — Certificate Helpers

```typescript
// lib/certificate.ts
// Helpers for certificate ID generation and formatting

/** Generate a human-readable certificate ID: GIG-2025-XXXXX */
export function generateHumanId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GIG-${year}-${random}`;
}

/** Format a certificate ID for display (already human-readable) */
export function formatCertId(humanId: string): string {
  return humanId;
}

/** Get public verify URL for a certificate */
export function getVerifyUrl(humanId: string): string {
  const base = process.env.EXPO_PUBLIC_APP_URL ?? 'https://gigpay.app';
  return `${base}/verify/${humanId}`;
}

/** Mask a phone number for display: +91 98765XXXXX */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(-10, -5)}XXXXX`;
}

/** Platform display name */
export const platformNames: Record<string, string> = {
  swiggy: 'Swiggy Delivery',
  zomato: 'Zomato Delivery',
  rapido: 'Rapido Captain',
  other:  'Gig Platform',
};
```

---

## STEP 3: Supabase Edge Function — `generate-certificate`

Create `supabase/functions/generate-certificate/index.ts`.

**What it does:**
1. Verifies Clerk JWT
2. Loads `income_submission` + `user` from DB
3. Generates a human certificate ID (`GIG-YYYY-XXXXX`)
4. Computes SHA-256 hash of canonical data string
5. Builds a PDF (A4) using `pdf-lib` from npm
6. Uploads PDF to `pdfs/` Supabase Storage bucket (public)
7. Saves `certificates` row to DB
8. Returns certificate metadata

```typescript
// supabase/functions/generate-certificate/index.ts
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

// ── PDF Builder ───────────────────────────────────────────────────────────────
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
  const orange  = rgb(0.976, 0.451, 0.086);   // #F97316
  const white   = rgb(1, 1, 1);
  const dark    = rgb(0.102, 0.102, 0.102);    // #1A1A1A
  const muted   = rgb(0.42, 0.447, 0.502);     // #6B7280
  const border  = rgb(0.898, 0.906, 0.922);    // #E5E7EB
  const success = rgb(0.086, 0.639, 0.290);    // #16A34A
  const warning = rgb(0.851, 0.467, 0.000);    // #D97706
  const danger  = rgb(0.863, 0.149, 0.149);    // #DC2626
  const gray    = rgb(0.6, 0.6, 0.6);

  let y = height; // current Y position (we draw top-to-bottom, decrementing y)

  // ── 1. Orange header strip (80pt) ────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: orange });

  page.drawText('GigPay', {
    x: 32, y: height - 48,
    font: fontBold, size: 28, color: white,
  });
  page.drawText('Income Verification Certificate', {
    x: 32, y: height - 66,
    font: fontRegular, size: 11, color: white,
  });
  // Certificate ID — right-aligned monospace
  const idText = params.humanId;
  const idWidth = fontMono.widthOfTextAtSize(idText, 10);
  page.drawText(idText, {
    x: width - idWidth - 32, y: height - 52,
    font: fontMono, size: 10, color: white,
  });

  y = height - 80;

  // ── 2. Worker details block ───────────────────────────────────────────────
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

  // ── 3. Divider ────────────────────────────────────────────────────────────
  y -= 8;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 20;

  // ── 4. 3-metric block ─────────────────────────────────────────────────────
  page.drawText('Income Summary', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 28;

  const metricW = (width - 64) / 3;
  const metrics = [
    { label: 'Avg Monthly Income', value: `₹${params.avgMonthly.toLocaleString('en-IN')}`, color: dark },
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
    page.drawText(metrics[i].value, { x: mx, y, font: fontBold, size: 22, color: metrics[i].color });
    page.drawText(metrics[i].label, { x: mx, y: y - 16, font: fontRegular, size: 9, color: muted });
  }

  y -= 44;

  // NBFC Verdict badge
  const verdictColors: Record<string, typeof success> = {
    STRONG: success, MODERATE: warning, WEAK: danger,
  };
  const verdictColor = verdictColors[params.nbfcVerdict] ?? danger;
  const verdictText = `NBFC Verdict: ${params.nbfcVerdict}`;
  page.drawRectangle({ x: 32, y: y - 6, width: 160, height: 22, color: rgb(0.95, 0.95, 0.95), borderRadius: 4 });
  page.drawText(verdictText, { x: 40, y: y, font: fontBold, size: 11, color: verdictColor });
  y -= 24;

  // ── 5. Divider ────────────────────────────────────────────────────────────
  y -= 12;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 20;

  // ── 6. Monthly earnings table ─────────────────────────────────────────────
  page.drawText('Monthly Earnings', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 18;

  // Table header
  page.drawRectangle({ x: 32, y: y - 4, width: width - 64, height: 18, color: rgb(0.97, 0.97, 0.97) });
  page.drawText('Month',     { x: 40,  y, font: fontBold, size: 9, color: muted });
  page.drawText('Amount',    { x: 200, y, font: fontBold, size: 9, color: muted });
  page.drawText('vs Average',{ x: 340, y, font: fontBold, size: 9, color: muted });
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
    page.drawText(monthLabel,                              { x: 40,  y, font: fontRegular, size: 9, color: dark });
    page.drawText(`₹${m.amount.toLocaleString('en-IN')}`, { x: 200, y, font: fontRegular, size: 9, color: dark });
    page.drawText(deviationStr, {
      x: 340, y,
      font: fontBold, size: 9,
      color: deviation >= 0 ? success : danger,
    });
    y -= 16;

    // Safety: stop if running out of page space (> 12 months edge case)
    if (y < 220) break;
  }

  // ── 7. Tamper evidence block ──────────────────────────────────────────────
  y -= 16;
  page.drawLine({ start: { x: 32, y }, end: { x: width - 32, y }, thickness: 0.5, color: border });
  y -= 16;

  page.drawText('Tamper Evidence', { x: 32, y, font: fontBold, size: 11, color: muted });
  y -= 16;

  // SHA-256 hash (first 32 chars for readability, then "...")
  const hashDisplay = params.sha256Hash.slice(0, 32) + '...';
  page.drawText('SHA-256:', { x: 32, y, font: fontBold, size: 9, color: muted });
  page.drawText(hashDisplay, { x: 100, y, font: fontMono, size: 8, color: dark });
  y -= 14;

  // Verify URL
  page.drawText('Verify at:', { x: 32, y, font: fontBold, size: 9, color: muted });
  page.drawText(params.verifyUrl, { x: 100, y, font: fontMono, size: 8, color: orange });
  y -= 14;

  // ── 8. Disclaimer ─────────────────────────────────────────────────────────
  y -= 8;
  const disclaimer =
    'This certificate is generated by GigPay based on earnings data extracted from platform screenshots. ' +
    'It is not a government-issued document. The SHA-256 hash uniquely identifies this certificate and ' +
    'can be used to verify its authenticity at the URL above.';

  // Word-wrap disclaimer at ~80 chars per line
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

  // ── 9. Footer strip ───────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: 0, width, height: 32, color: rgb(0.95, 0.95, 0.95) });
  page.drawText('gigpay.app', { x: 32, y: 12, font: fontBold, size: 9, color: muted });
  const dateStr = new Date(params.issuedAt).toLocaleDateString('en-IN');
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 9);
  page.drawText(dateStr, { x: width - dateWidth - 32, y: 12, font: fontRegular, size: 9, color: muted });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
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

    // ── Supabase admin ───────────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Parse body ───────────────────────────────────────────────────────────
    const { submission_id } = await req.json();
    if (!submission_id) {
      return new Response(JSON.stringify({ error: 'submission_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Load submission ──────────────────────────────────────────────────────
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

    // ── Check if certificate already exists for this submission ──────────────
    const { data: existing } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('submission_id', submission_id)
      .single();

    if (existing) {
      // Return existing certificate (idempotent)
      return new Response(JSON.stringify({
        certificate_id: existing.id,
        human_id: existing.human_id,
        pdf_url: existing.pdf_url,
        sha256_hash: existing.sha256_hash,
        qr_data: existing.qr_data,
        issued_at: existing.issued_at,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Generate IDs and hash ─────────────────────────────────────────────────
    const humanId = `GIG-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    const dateStr = issuedAt.slice(0, 10); // YYYY-MM-DD

    // Canonical string for SHA-256
    const canonicalStr = [
      submission.users.id,
      submission_id,
      JSON.stringify(submission.months_data),
      submission.avg_monthly_income,
      dateStr,
    ].join('|');

    const sha256Hash = await sha256(canonicalStr);

    // Verify URL
    const appUrl = Deno.env.get('APP_URL') ?? 'https://gigpay.app';
    const verifyUrl = `${appUrl}/verify/${humanId}`;

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const pdfBytes = await buildCertificatePDF({
      humanId,
      workerName: submission.users.name,
      phone: submission.users.phone,
      platform: submission.platform,
      avgMonthly: submission.avg_monthly_income,
      trendPct: submission.trend_pct,
      consistencyScore: submission.consistency_score,
      nbfcVerdict: submission.nbfc_verdict,
      monthsData: submission.months_data,
      sha256Hash,
      verifyUrl,
      issuedAt,
    });

    // ── Upload PDF to Supabase Storage (pdfs bucket — public) ────────────────
    const pdfPath = `${submission.users.id}/${humanId}.pdf`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('pdfs')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin
      .storage
      .from('pdfs')
      .getPublicUrl(pdfPath);

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
        qr_data:       verifyUrl,
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
```

**Deploy:**
```bash
supabase functions deploy generate-certificate
```

**Add this secret in Supabase dashboard (Edge Functions → Secrets):**
```
APP_URL=https://gigpay.app
```
> For local testing, set `APP_URL` to your ngrok/tunnel URL so the QR code links actually resolve.

---

## STEP 4: Supabase Edge Function — `verify-certificate`

Create `supabase/functions/verify-certificate/index.ts`.

**This function is PUBLIC — no Clerk JWT required.** Lenders access it by scanning the QR code on the PDF.

```typescript
// supabase/functions/verify-certificate/index.ts
// Public endpoint — no auth. Called by lender scanning QR on PDF.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Log verification
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
```

**Deploy:**
```bash
supabase functions deploy verify-certificate
```

---

## STEP 5: `lib/share.ts` — Download + Share PDF

```typescript
// lib/share.ts
// PDF download from Supabase Storage + WhatsApp / system share sheet

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/** Download PDF to device cache, then open system share sheet */
export async function sharePDF(pdfUrl: string, humanId: string): Promise<void> {
  try {
    const localPath = `${FileSystem.cacheDirectory}${humanId}.pdf`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);

    if (!fileInfo.exists) {
      // Download from Supabase Storage public URL
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, localPath);
      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }
    }

    // Check sharing is available (Android requires it)
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing not available', 'Please update your device to enable file sharing.');
      return;
    }

    // Open system share sheet — user can pick WhatsApp, email, Drive, etc.
    await Sharing.shareAsync(localPath, {
      mimeType: 'application/pdf',
      dialogTitle: `Share GigPay Certificate ${humanId}`,
      UTI: 'com.adobe.pdf', // iOS
    });
  } catch (err: any) {
    Alert.alert('Share failed', err.message ?? 'Could not share the certificate. Please try again.');
    throw err;
  }
}

/** Open verify URL in default browser */
export function openVerifyUrl(verifyUrl: string): void {
  // Linking is imported from react-native
  const { Linking } = require('react-native');
  Linking.openURL(verifyUrl).catch(() => {
    Alert.alert('Could not open link', verifyUrl);
  });
}
```

---

## STEP 6: Certificate Generate Screen — `app/certificate/generate.tsx`

Replace the placeholder from Phase 2 with the real generate flow.

```typescript
// app/certificate/generate.tsx
// Triggered from results screen: calls generate-certificate Edge Function,
// then navigates to /certificate/[id] to show the certificate.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { colors, spacing } from '../../constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type Stage = 'generating' | 'done' | 'error';

export default function GenerateCertificateScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [stage, setStage] = useState<Stage>('generating');
  const [error, setError] = useState('');
  const [certId, setCertId] = useState('');

  useEffect(() => {
    if (submissionId) generate();
  }, [submissionId]);

  async function generate() {
    setStage('generating');
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication error. Please sign in again.');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-certificate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `Certificate generation failed (${response.status})`);
      }

      const data = await response.json();
      setCertId(data.certificate_id);
      setStage('done');

      // Auto-navigate to certificate viewer after a brief moment
      setTimeout(() => {
        router.replace(`/certificate/${data.certificate_id}` as any);
      }, 800);

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setStage('error');
    }
  }

  return (
    <View style={styles.container}>
      {stage === 'generating' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.title}>Creating your certificate...</Text>
          <Text style={styles.subtitle}>Building your tamper-proof income PDF</Text>
        </>
      )}
      {stage === 'done' && (
        <>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.title}>Certificate Ready!</Text>
          <Text style={styles.subtitle}>Redirecting you now...</Text>
        </>
      )}
      {stage === 'error' && (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Generation Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={generate}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>← Go Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title:        { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  subtitle:     { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  successIcon:  { fontSize: 64 },
  errorIcon:    { fontSize: 64 },
  errorText:    { fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 8, marginBottom: spacing.md },
  retryBtn:     { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink:     { padding: spacing.md },
  backLinkText: { color: colors.textMuted },
});
```

---

## STEP 7: Certificate Viewer — `app/certificate/[id].tsx`

Replace the Phase 1/2 placeholder. This is the screen users share to lenders.

```typescript
// app/certificate/[id].tsx
// Full certificate view: metrics, QR code, share + download buttons.

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { sharePDF, openVerifyUrl } from '../../lib/share';
import { platformNames, maskPhone } from '../../lib/certificate';
import { colors, spacing } from '../../constants/theme';
import type { Certificate, IncomeSubmission, User } from '../../lib/types';

interface CertificateWithDetails extends Certificate {
  submission: IncomeSubmission;
  user: User;
}

export default function CertificateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CertificateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadCertificate();
  }, [id]);

  async function loadCertificate() {
    setLoading(true);
    try {
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .select(`
          *,
          income_submissions (*),
          users (*)
        `)
        .eq('id', id)
        .single();

      if (certError || !cert) throw new Error('Certificate not found');

      setData({
        ...cert,
        submission: cert.income_submissions as unknown as IncomeSubmission,
        user: cert.users as unknown as User,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!data) return;
    setSharing(true);
    try {
      await sharePDF(data.pdf_url, data.human_id);
    } catch {
      // error already shown in sharePDF via Alert
    } finally {
      setSharing(false);
    }
  }

  async function handleShareLink() {
    if (!data) return;
    await Share.share({
      message: `Verify my GigPay income certificate: ${data.qr_data}`,
      url: data.qr_data,
      title: `GigPay Certificate ${data.human_id}`,
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading certificate...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error || 'Certificate not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sub = data.submission;
  const user = data.user;

  const verdictConfig = {
    STRONG:   { color: colors.success, emoji: '💪' },
    MODERATE: { color: colors.warning, emoji: '👍' },
    WEAK:     { color: colors.danger,  emoji: '⚠️' },
  };
  const verdict = verdictConfig[sub.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Orange header bar (mirrors PDF layout) */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>GigPay</Text>
          <Text style={styles.headerSub}>Income Verification Certificate</Text>
        </View>
        <Text style={styles.certId}>{data.human_id}</Text>
      </View>

      {/* Worker details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Worker Details</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{user.name}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Phone</Text><Text style={styles.detailValue}>{maskPhone(user.phone)}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Platform</Text><Text style={styles.detailValue}>{platformNames[sub.platform] ?? sub.platform}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Issued</Text><Text style={styles.detailValue}>{new Date(data.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
      </View>

      {/* NBFC Verdict */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
        <View>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>
            {sub.nbfc_verdict} Profile
          </Text>
          <Text style={styles.verdictSub}>NBFC loan eligibility assessment</Text>
        </View>
      </View>

      {/* 3 metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>₹{sub.avg_monthly_income?.toLocaleString('en-IN')}</Text>
          <Text style={styles.metricLabel}>Avg / Month</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: (sub.trend_pct ?? 0) >= 0 ? colors.success : colors.danger }]}>
            {(sub.trend_pct ?? 0) >= 0 ? '+' : ''}{sub.trend_pct?.toFixed(1)}%
          </Text>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, {
            color: sub.consistency_score >= 80 ? colors.success
                 : sub.consistency_score >= 60 ? colors.warning
                 : colors.danger
          }]}>
            {sub.consistency_score}/100
          </Text>
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* QR Code + tamper evidence */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tamper Evidence</Text>
        <View style={styles.tamperRow}>
          <View style={styles.qrContainer}>
            <QRCode value={data.qr_data} size={100} color={colors.text} backgroundColor="#fff" />
            <Text style={styles.qrLabel}>Scan to verify</Text>
          </View>
          <View style={styles.hashContainer}>
            <Text style={styles.hashLabel}>SHA-256</Text>
            <Text style={styles.hashValue}>{data.sha256_hash.slice(0, 20)}...</Text>
            <Text style={styles.hashLabel}>Verified: {data.verified_count ?? 0} times</Text>
            <TouchableOpacity onPress={() => openVerifyUrl(data.qr_data)}>
              <Text style={styles.verifyLink}>Open verify page →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Share buttons */}
      <TouchableOpacity
        style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
        onPress={handleShare}
        disabled={sharing}
      >
        {sharing
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.shareBtnText}>📤 Share PDF (WhatsApp / Email)</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={handleShareLink}>
        <Text style={styles.linkBtnText}>🔗 Share Verify Link</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home' as any)}>
        <Text style={styles.backLinkText}>← Back to Home</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: spacing.md, paddingBottom: spacing.xl },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:     { marginTop: spacing.md, color: colors.textMuted },
  errorText:       { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  headerBar:       { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerTitle:     { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  certId:          { fontSize: 11, color: '#fff', fontFamily: 'monospace' },
  card:            { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle:       { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  detailRow:       { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel:     { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  detailValue:     { flex: 2, fontSize: 13, color: colors.text },
  verdictBanner:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 14, borderWidth: 2, marginBottom: spacing.md, backgroundColor: colors.card },
  verdictEmoji:    { fontSize: 32 },
  verdictLabel:    { fontSize: 17, fontWeight: '800' },
  verdictSub:      { fontSize: 12, color: colors.textMuted },
  metricsRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:      { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricValue:     { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metricLabel:     { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  tamperRow:       { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  qrContainer:     { alignItems: 'center' },
  qrLabel:         { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  hashContainer:   { flex: 1, gap: 8 },
  hashLabel:       { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  hashValue:       { fontSize: 10, color: colors.text, fontFamily: 'monospace' },
  verifyLink:      { fontSize: 12, color: colors.primary, fontWeight: '600' },
  shareBtn:        { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.sm },
  shareBtnDisabled:{ opacity: 0.6 },
  shareBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700' },
  linkBtn:         { backgroundColor: colors.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  linkBtnText:     { color: colors.primary, fontSize: 16, fontWeight: '600' },
  backBtn:         { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  backBtnText:     { color: colors.text, fontWeight: '600' },
  backLink:        { padding: spacing.md, alignItems: 'center' },
  backLinkText:    { color: colors.textMuted, fontSize: 14 },
});
```

---

## STEP 8: Public Verify Page — `app/verify/[id].tsx`

This page is opened by lenders scanning the QR code. It must work in a mobile browser with **no Clerk auth** — so it calls `verify-certificate` directly with no Authorization header.

```typescript
// app/verify/[id].tsx
// Public lender verification page — no auth required.
// Accessed by scanning QR code on certificate PDF.

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing } from '../../constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface VerifyResult {
  valid: boolean;
  hash_verified: boolean;
  human_id: string;
  worker_name: string;
  platform: string;
  avg_monthly_income: number;
  trend_pct: number;
  consistency_score: number;
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  issued_at: string;
  verified_count: number;
  pdf_url: string;
  error?: string;
}

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) verify();
  }, [id]);

  async function verify() {
    setLoading(true);
    try {
      // No Authorization header — this endpoint is public
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-certificate?id=${encodeURIComponent(id)}`,
        {
          headers: { 'apikey': SUPABASE_ANON_KEY },
        }
      );
      const data = await response.json();
      setResult(data);
    } catch (e: any) {
      setResult({ valid: false, error: e.message } as any);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.spinner}>🔍</Text>
        <Text style={styles.loadingText}>Verifying certificate...</Text>
      </View>
    );
  }

  if (!result?.valid) {
    return (
      <View style={styles.center}>
        <Text style={styles.invalidIcon}>❌</Text>
        <Text style={styles.invalidTitle}>Certificate Not Found</Text>
        <Text style={styles.invalidSub}>
          {result?.error ?? 'This certificate ID is invalid or has been revoked.'}
        </Text>
      </View>
    );
  }

  const verdictConfig = {
    STRONG:   { color: colors.success, emoji: '💪', label: 'Strong — Good candidate for loan' },
    MODERATE: { color: colors.warning, emoji: '👍', label: 'Moderate — Review recommended' },
    WEAK:     { color: colors.danger,  emoji: '⚠️', label: 'Weak — High risk for lender' },
  };
  const verdict = verdictConfig[result.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Verified banner */}
      <View style={styles.verifiedBanner}>
        <Text style={styles.verifiedIcon}>✅</Text>
        <View>
          <Text style={styles.verifiedTitle}>Certificate Verified</Text>
          <Text style={styles.verifiedSub}>
            {result.hash_verified
              ? 'SHA-256 hash matches — data is unmodified'
              : '⚠️ Hash mismatch — data may have been altered'}
          </Text>
        </View>
      </View>

      {/* Certificate ID */}
      <View style={styles.idRow}>
        <Text style={styles.idLabel}>Certificate ID</Text>
        <Text style={styles.idValue}>{result.human_id}</Text>
      </View>

      {/* Worker info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Worker Information</Text>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Name</Text><Text style={styles.detailValue}>{result.worker_name}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Platform</Text><Text style={styles.detailValue}>{result.platform}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Issued</Text><Text style={styles.detailValue}>{new Date(result.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text></View>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>Times Verified</Text><Text style={styles.detailValue}>{result.verified_count}</Text></View>
      </View>

      {/* Income metrics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Income Metrics</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>₹{result.avg_monthly_income?.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricLabel}>Avg Monthly</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: result.trend_pct >= 0 ? colors.success : colors.danger }]}>
              {result.trend_pct >= 0 ? '+' : ''}{result.trend_pct?.toFixed(1)}%
            </Text>
            <Text style={styles.metricLabel}>Trend</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, {
              color: result.consistency_score >= 80 ? colors.success
                   : result.consistency_score >= 60 ? colors.warning : colors.danger
            }]}>
              {result.consistency_score}/100
            </Text>
            <Text style={styles.metricLabel}>Consistency</Text>
          </View>
        </View>
      </View>

      {/* NBFC Verdict */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
        <View>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>{result.nbfc_verdict}</Text>
          <Text style={styles.verdictDesc}>{verdict.label}</Text>
        </View>
      </View>

      {/* Download PDF */}
      {result.pdf_url && (
        <TouchableOpacity style={styles.downloadBtn} onPress={() => Linking.openURL(result.pdf_url)}>
          <Text style={styles.downloadBtnText}>📄 Download Full Certificate PDF</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>
        Verified by GigPay · gigpay.app · Certificate data is tamper-evident via SHA-256 hash
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: spacing.md, paddingBottom: spacing.xl },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  spinner:        { fontSize: 48, marginBottom: spacing.md },
  loadingText:    { fontSize: 16, color: colors.textMuted },
  invalidIcon:    { fontSize: 64, marginBottom: spacing.md },
  invalidTitle:   { fontSize: 22, fontWeight: 'bold', color: colors.danger, textAlign: 'center', marginBottom: 8 },
  invalidSub:     { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#F0FDF4', padding: spacing.md, borderRadius: 16, borderWidth: 2, borderColor: colors.success, marginBottom: spacing.md },
  verifiedIcon:   { fontSize: 36 },
  verifiedTitle:  { fontSize: 18, fontWeight: '800', color: colors.success },
  verifiedSub:    { fontSize: 12, color: colors.textMuted },
  idRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: spacing.md, borderRadius: 12, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  idLabel:        { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  idValue:        { fontSize: 13, color: colors.text, fontFamily: 'monospace', fontWeight: '700' },
  card:           { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  detailRow:      { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel:    { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  detailValue:    { flex: 2, fontSize: 13, color: colors.text },
  metricsRow:     { flexDirection: 'row', gap: spacing.sm },
  metricCard:     { flex: 1, alignItems: 'center', padding: spacing.sm },
  metricValue:    { fontSize: 18, fontWeight: '800', color: colors.text },
  metricLabel:    { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  verdictBanner:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 14, borderWidth: 2, marginBottom: spacing.md, backgroundColor: colors.card },
  verdictEmoji:   { fontSize: 32 },
  verdictLabel:   { fontSize: 17, fontWeight: '800' },
  verdictDesc:    { fontSize: 12, color: colors.textMuted },
  downloadBtn:    { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md },
  downloadBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:         { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
```

---

## STEP 9: Certificates List — `app/(tabs)/certificates.tsx`

Replace the Phase 1 placeholder with a real list of certificates for the signed-in user.

```typescript
// app/(tabs)/certificates.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';
import type { Certificate } from '../../lib/types';

export default function CertificatesScreen() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCertificates(); }, []);

  async function loadCertificates() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .order('issued_at', { ascending: false });
      setCerts((data ?? []) as Certificate[]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (certs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyTitle}>No certificates yet</Text>
        <Text style={styles.emptySub}>Upload an earnings screenshot to generate your first certificate</Text>
        <TouchableOpacity style={styles.cta} onPress={() => router.push('/(tabs)/upload' as any)}>
          <Text style={styles.ctaText}>Add Earnings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Certificates</Text>
      <FlatList
        data={certs}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.certCard}
            onPress={() => router.push(`/certificate/${item.id}` as any)}
          >
            <View style={styles.certCardLeft}>
              <Text style={styles.certId}>{item.human_id}</Text>
              <Text style={styles.certDate}>
                {new Date(item.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.certCardRight}>
              <Text style={styles.verifiedCount}>Verified {item.verified_count ?? 0}×</Text>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title:        { fontSize: 24, fontWeight: 'bold', color: colors.text, padding: spacing.md, paddingBottom: 0 },
  emptyIcon:    { fontSize: 64, marginBottom: spacing.md },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  cta:          { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  ctaText:      { color: '#fff', fontWeight: '700', fontSize: 16 },
  certCard:     { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  certCardLeft: { gap: 4 },
  certId:       { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  certDate:     { fontSize: 12, color: colors.textMuted },
  certCardRight:{ alignItems: 'flex-end', gap: 4 },
  verifiedCount:{ fontSize: 12, color: colors.success, fontWeight: '600' },
  arrow:        { fontSize: 16, color: colors.textMuted },
});
```

---

## STEP 10: Update `lib/types.ts`

Add `Certificate` type if not already present (it was defined in Phase 1 but verify it's complete):

```typescript
// Ensure this interface exists in lib/types.ts exactly as below
export interface Certificate {
  id: string;
  human_id: string;
  submission_id: string;
  user_id: string;
  pdf_url: string;
  sha256_hash: string;
  qr_data: string;
  issued_at: string;
  verified_count: number;
}
```

---

## STEP 11: Run TypeScript Check

```bash
npx tsc --noEmit 2>&1
```

Fix any errors before considering Phase 3 complete. The Deno Edge Function folder is excluded from the root tsconfig (done in Phase 2), so only app errors should appear.

---

## FILE CHECKLIST

```
# NEW FILES
supabase/functions/generate-certificate/index.ts   ← Deno, pdf-lib PDF builder
supabase/functions/verify-certificate/index.ts     ← Deno, public endpoint
lib/certificate.ts                                 ← humanId, maskPhone, platformNames helpers
lib/share.ts                                       ← PDF download + share sheet
app/verify/[id].tsx                                ← Public lender verification page

# REPLACED (remove old placeholder content entirely)
app/certificate/generate.tsx                       ← Real generate + navigate flow
app/certificate/[id].tsx                           ← Full certificate viewer with QR
app/(tabs)/certificates.tsx                        ← Real certificates list

# VERIFY UNTOUCHED (do not modify)
app/_layout.tsx
app/(auth)/index.tsx
app/(auth)/otp.tsx
app/onboarding/name.tsx
app/(tabs)/_layout.tsx
app/(tabs)/home.tsx
app/(tabs)/upload.tsx
app/results/[id].tsx
lib/supabase.ts
lib/intelligence.ts
lib/upload.ts
```

---

## DEPLOY COMMANDS (run after all files are written)

```bash
# Deploy both new Edge Functions
supabase functions deploy generate-certificate
supabase functions deploy verify-certificate

# Verify all 3 functions are deployed
supabase functions list
```

---

## PROTOTYPE TEST CHECKLIST — Complete Before Ending Phase 3

Run this end-to-end on a **physical Android device** with Expo Go:

1. ✅ Sign in with phone OTP → lands on Home
2. ✅ Tap Upload → long-press CTA → demo data loads → navigates to Results
3. ✅ Results screen shows: NBFC verdict banner, avg monthly, trend %, consistency, monthly table
4. ✅ Tap "Generate Certificate" → generate screen shows spinner → auto-navigates to certificate viewer
5. ✅ Certificate viewer shows: worker name, platform, all 3 metrics, QR code
6. ✅ Tap "Share PDF" → system share sheet opens → able to send via WhatsApp or save to files
7. ✅ Tap QR code verify link → browser opens `/verify/GIG-YYYY-XXXXX` → shows green "Certificate Verified" banner
8. ✅ Verify page shows correct worker name, income, NBFC verdict
9. ✅ Verified count increments each time the verify page is loaded
10. ✅ Certificates tab lists all issued certificates with certificate IDs
11. ✅ Tapping a certificate card in the list opens the certificate viewer
12. ✅ `npx tsc --noEmit` exits clean (excluding Deno functions)

---

## HANDOFF NOTE — What Phase 4 Builds

Phase 3 completes the core prototype loop. The following are **not** in scope for Phase 3 but are built next:

- `supabase/functions/explain-income/index.ts` — MiniMax M3 Hindi income explainer, SSE streaming
- `components/IncomeExplainer.tsx` — real-time streaming token display in results screen
- "Explain my report" button on results screen
- Demo mode polish, error handling edge cases, UI animations (Phase 5)

The prototype is fully testable at the end of Phase 3. Phases 4 and 5 add the AI Hindi explainer and polish — they do not change the core loop.

---

## IMPORTANT NOTE ON VERIFY URL FOR TESTING

During prototype testing, the QR code in the PDF and the verify link will point to `https://gigpay.app/verify/GIG-...` (or whatever `APP_URL` is set to in Edge Function secrets).

For local testing, either:
- Set `APP_URL` to your **ngrok tunnel URL** pointing to your local Expo dev server
- Or set `APP_URL` to your **Supabase project URL** and use the `verify-certificate` Edge Function URL directly

The `app/verify/[id].tsx` screen works as a React Native screen in Expo Go — the QR just needs to deep-link into the app using the `gigpay://` scheme configured in `app.json`.

To enable deep linking for the verify QR, the QR value should be:
```
gigpay://verify/GIG-2025-XXXXX
```
Update `generateHumanId` in `generate-certificate/index.ts` to use `gigpay://verify/` as the prefix instead of `https://gigpay.app/verify/` during testing.

---

*GigPay Phase 3 — iQOO PayBazaar PS3 Hackathon | June 2025*
