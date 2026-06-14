// @ts-nocheck
// supabase/functions/parse-statement/index.ts
// Phase 4: Bank Statement PDF analysis via server-side text extraction + LLM + credit scoring
//
// Behavior/Fallback Flow:
// 1. JWT authentication check (Clerk mock token verification).
// 2. If use_mock is true: instantly bypass PDF parsing and return MOCK_BANK_MONTHS (Demo Mode).
// 3. Otherwise, base64-decode the PDF and extract raw text using "unpdf".
//    - If text is empty or < 200 characters, return HTTP 422 (scanned image error).
// 4. Send the first 15,000 characters of extracted text to OpenRouter.
//    - Models tried in order: minimax/minimax-m3 -> deepseek/deepseek-v4-flash -> deepseek/deepseek-v4-pro.
//    - If all models fail (network or non-200), return HTTP 503 (service unavailable).
// 5. Parse the LLM JSON response.
//    - If LLM flags an irrelevant PDF (e.g. resume or invoice), propagate error via HTTP 422.
//    - If JSON parsing fails entirely, return HTTP 422 (format error).
// 6. Run Credit Scoring and insert final record into supabase DB.

import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getResolvedPDFJS } from "npm:unpdf";

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS = [
  'minimax/minimax-m3',         // primary — strong extraction, 1M context, cheap
  'deepseek/deepseek-v4-flash',  // fallback — very cheap, fast, 1M context
  'deepseek/deepseek-v4-pro',    // last resort — higher quality if both above fail
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── PDF Text Extraction Helper ────────────────────────────────────────────────
// Uses getResolvedPDFJS + native getDocument so the `password` param is
// correctly forwarded to pdf.js and PasswordException is properly thrown.
async function extractPdfText(base64: string, password?: string): Promise<string> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // getResolvedPDFJS gives us the raw pdf.js API which correctly handles
  // the password option and throws a PasswordException on wrong/missing password.
  const { getDocument } = await getResolvedPDFJS();
  const loadingTask = getDocument({
    data: bytes,
    ...(password ? { password } : {}),
  });

  const pdf = await loadingTask.promise;
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

// ── Credit Scoring (inline — same as lib/credit-score.ts) ────────────────────

function stdDev(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function computeCreditScore(months: any[]) {
  if (!months || months.length === 0) return { composite: 0, nbfc_verdict: 'WEAK', loan_eligibility: 0, income_stability: 0, debt_ratio: 0, savings_rate: 0 };

  const credits = months.map(m => m.total_credits || 0);
  const debits = months.map(m => m.total_debits || 0);
  const emis = months.map(m => m.emi_payments || 0);
  const avgCredits = credits.reduce((s, v) => s + v, 0) / credits.length;
  const avgDebits = debits.reduce((s, v) => s + v, 0) / debits.length;
  const avgEMI = emis.reduce((s, v) => s + v, 0) / emis.length;

  const cvRatio = avgCredits > 0 ? stdDev(credits) / avgCredits : 1;
  const incomeStabilityScore = clamp(Math.round((1 - cvRatio) * 100));
  const avgIncomeScore = clamp(Math.round(Math.min(avgCredits / 60000, 1) * 100));

  const debtToIncomeRatio = avgCredits > 0 ? avgEMI / avgCredits : 0;
  const debtScore = clamp(Math.round((1 - Math.min(debtToIncomeRatio / 0.5, 1)) * 100));

  const savingsRateRaw = avgCredits > 0 ? (avgCredits - avgDebits) / avgCredits : 0;
  const savingsRate = Math.max(0, savingsRateRaw);
  const savingsScore = clamp(Math.round(Math.min(savingsRate / 0.3, 1) * 100));

  const hasEMIs = emis.some(e => e > 0);
  const disciplineScore = hasEMIs ? clamp(Math.round((emis.filter(e => e > 0).length / months.length) * 100)) : 100;
  const activeMonths = months.filter(m => m.total_credits > 0).length;
  const transactionRegularity = clamp(Math.round((activeMonths / months.length) * 100));

  const composite = clamp(Math.round(
    incomeStabilityScore * 0.25 + avgIncomeScore * 0.25 + debtScore * 0.20 +
    savingsScore * 0.15 + disciplineScore * 0.10 + transactionRegularity * 0.05
  ));

  let nbfc_verdict = 'WEAK';
  if (composite >= 75) nbfc_verdict = 'STRONG';
  else if (composite >= 50) nbfc_verdict = 'MODERATE';

  const multiplier = composite >= 75 ? 10 : composite >= 50 ? 7 : 4;
  const loan_eligibility = Math.min(Math.round(avgCredits * multiplier / 1000) * 1000, 500000);

  return {
    composite,
    nbfc_verdict,
    loan_eligibility,
    avg_credits: Math.round(avgCredits),
    income_stability: incomeStabilityScore,
    debt_ratio: Math.round(debtToIncomeRatio * 100) / 100,
    savings_rate: Math.round(savingsRate * 100) / 100,
    consistency_score: incomeStabilityScore,
    trend_pct: 0,
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── Auth (same mock-compatible decode as other functions) ─────────────────
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

    // ── Supabase admin client ─────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Map Clerk user ID to users table ─────────────────────────────────────
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

    // ── Parse request ─────────────────────────────────────────────────────────
    const { pdf_base64, statement_type = 'bank', use_mock, password } = await req.json();

    let months;

    if (use_mock) {
      // Demo mode: return pre-baked HDFC-style mock bank data
      months = MOCK_BANK_MONTHS;
    } else {
      // Real flow: check base64 presence
      if (!pdf_base64) {
        return new Response(JSON.stringify({ error: 'No PDF provided.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Server-side PDF text extraction
      let pdfText = '';
      try {
        pdfText = await extractPdfText(pdf_base64, password);
      } catch (err: any) {
        console.error('PDF text extraction library failure:', err?.name, err?.code, err?.message);
        const errMsg = (err.message || '').toLowerCase();
        const errName = (err.name || '');
        // pdf.js PasswordException: name === 'PasswordException', code 1 = needs password, code 2 = wrong password
        const isPasswordError =
          errName === 'PasswordException' ||
          errName.includes('PasswordException') ||
          err.code === 1 || err.code === 2 ||
          errMsg.includes('password') ||
          errMsg.includes('decrypt') ||
          errMsg.includes('encrypted');

        if (isPasswordError) {
          // code 2 means a password WAS provided but it was wrong
          const wrongPassword = password && (err.code === 2 || errMsg.includes('incorrect') || errMsg.includes('wrong'));
          return new Response(JSON.stringify({
            error: wrongPassword
              ? 'Incorrect password. Please check and try again.'
              : password
                ? 'Incorrect password. Please check and try again.'
                : 'This PDF is password-protected. Please enter the password to unlock it.',
            password_required: true,
          }), {
            status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({
          error: 'Could not read text from this PDF. It may be a scanned image — please upload a PDF exported directly from net banking, not a scanned copy.'
        }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Guard on extracted text length
      if (!pdfText || pdfText.trim().length < 200) {
        console.error(`Extracted text too short: ${pdfText?.trim()?.length ?? 0} characters`);
        return new Response(JSON.stringify({
          error: 'Could not read text from this PDF. It may be a scanned image — please upload a PDF exported directly from net banking, not a scanned copy.'
        }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Truncate to first 15k characters
      const truncatedText = pdfText.slice(0, 15000);

      // 2. Build LLM prompt
      const prompt = `You are a financial data extractor for Indian bank statements.

The text below was extracted from a bank/credit card statement PDF. Your job is to parse it and return structured monthly data.

IMPORTANT CONTEXT for Indian bank statements:
- Amounts may appear with ₹ symbol or without (e.g. "₹1,234.56" or "1,234.56")
- Credits are marked as "Cr", "CR", "+", "Interest Cr", "UPI-Credit", "NEFT Cr", "IMPS Cr" etc.
- Debits are marked as "Dr", "DR", "-", "UPI-Debit", "ATW" etc.
- This may be a SAVINGS ACCOUNT — small daily interest credits (e.g. ₹1-₹50/day) are normal and should be counted as credits
- Dates may appear as "01 May '26", "01-05-2026", "01/05/2026", "May 1, 2026" etc — all are valid
- Group all transactions by calendar month

Step 1 — Validity check:
Does this text contain any of: transaction dates, debit/credit entries, account balance, bank name? If it clearly is NOT a bank/financial statement (e.g. resume, article, recipe), respond EXACTLY:
{"error": "This PDF doesn't look like a bank or credit card statement. Please upload your actual bank/CC statement PDF."}

Step 2 — If it IS a bank statement, return ONLY valid JSON with no markdown:
{
  "account_holder": "name or empty string",
  "bank_name": "bank name or empty string",
  "statement_period": {"from": "YYYY-MM", "to": "YYYY-MM"},
  "months": [
    {
      "month": "YYYY-MM",
      "total_credits": 0,
      "total_debits": 0,
      "emi_payments": 0,
      "upi_credits": 0,
      "closing_balance": 0,
      "salary_credits": 0,
      "gig_credits": 0
    }
  ]
}

Field rules:
- All rupee amounts → integers (round to nearest rupee, strip ₹ and commas)
- total_credits = SUM of ALL credit transactions in that month (including interest, UPI credits, NEFT, salary — everything positive)
- total_debits = SUM of ALL debit transactions in that month (UPI debits, ATM, charges — everything negative, as positive integer)
- closing_balance = the account balance at the end of the month (last balance entry for that month)
- emi_payments = sum of recurring fixed debits that look like loan EMI payments (0 if none)
- upi_credits = COUNT (not amount) of UPI credit transactions in that month
- salary_credits = sum of credits labelled salary/payroll (0 if none)
- gig_credits = COUNT of credit transactions under ₹500 each
- If a month has no transactions, omit it
- Return months in chronological order

Extracted Statement Text:
${truncatedText}`;

      // 3. Call OpenRouter models in a waterfall
      let aiResponse: Response | null = null;
      let lastError = '';

      for (const model of OPENROUTER_MODELS) {
        try {
          console.log(`Calling model: ${model}...`);
          const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://gigpay.app',
              'X-Title': 'GigPay',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 4000,
              temperature: 0,
            }),
          });
          if (resp.ok) {
            aiResponse = resp;
            break;
          }
          lastError = `OR/${model}: status ${resp.status}`;
          console.warn('OpenRouter model failed:', lastError);
        } catch (e) {
          lastError = `OR/${model} exception: ${e}`;
          console.warn('OpenRouter model threw:', lastError);
        }
      }

      // If all models failed to respond
      if (!aiResponse) {
        console.error('All OpenRouter models failed. Last error:', lastError);
        return new Response(JSON.stringify({
          error: 'Our AI extraction service is temporarily unavailable. Please try again in a moment.'
        }), {
          status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiData = await aiResponse.json();
      const rawContent = aiData.choices?.[0]?.message?.content ?? '';

      // JSON parsing of output
      let parsed;
      try {
        const cleaned = rawContent.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (err) {
        console.error('LLM response JSON parse failed:', err, 'Raw content:', rawContent);
        return new Response(JSON.stringify({
          error: 'Could not understand the statement format. Please try a different PDF export.'
        }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Propagate AI detected errors (e.g. irrelevant PDF error)
      if (parsed.error) {
        console.warn('AI reported extraction error:', parsed.error);
        return new Response(JSON.stringify({ error: parsed.error }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      months = parsed.months;
      if (!months || !Array.isArray(months) || months.length === 0) {
        console.error('Invalid extracted months structure:', parsed);
        return new Response(JSON.stringify({
          error: 'Could not understand the statement format. Please try a different PDF export.'
        }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Run credit scoring ────────────────────────────────────────────────────
    const score = computeCreditScore(months);

    // Convert months to MonthData for backward compat
    const months_data = months.map((m: any) => ({
      period: m.month,
      amount: m.total_credits,
    }));

    // ── Insert into income_submissions ────────────────────────────────────────
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('income_submissions')
      .insert({
        user_id: user.id,
        platform: statement_type === 'credit_card' ? 'other' : (user.platform ?? 'other'),
        screenshot_url: 'pdf://statement',
        raw_parsed_json: { months, statement_type },
        months_data,
        avg_monthly_income: score.avg_credits,
        trend_pct: score.trend_pct,
        consistency_score: score.consistency_score,
        seasonality_flags: [],
        nbfc_verdict: score.nbfc_verdict,
        status: 'complete',
        statement_type,
        income_stability_score: score.income_stability,
        debt_to_income_ratio: score.debt_ratio,
        savings_rate: score.savings_rate,
        composite_credit_score: score.composite,
        loan_eligibility_estimate: score.loan_eligibility,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // ── Return result ─────────────────────────────────────────────────────────
    return new Response(JSON.stringify({
      submission_id: submission.id,
      months_data,
      avg_monthly_income: score.avg_credits,
      composite_credit_score: score.composite,
      nbfc_verdict: score.nbfc_verdict,
      loan_eligibility_estimate: score.loan_eligibility,
      income_stability_score: score.income_stability,
      debt_to_income_ratio: score.debt_ratio,
      savings_rate: score.savings_rate,
      status: 'complete',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('parse-statement error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Mock bank data (HDFC-style, 6 months) ────────────────────────────────────
const MOCK_BANK_MONTHS = [
  { month: '2025-01', total_credits: 34200, total_debits: 26800, emi_payments: 8500, upi_credits: 18, closing_balance: 12400, salary_credits: 0, gig_credits: 12 },
  { month: '2025-02', total_credits: 36800, total_debits: 27200, emi_payments: 8500, upi_credits: 22, closing_balance: 15600, salary_credits: 0, gig_credits: 15 },
  { month: '2025-03', total_credits: 38100, total_debits: 28900, emi_payments: 8500, upi_credits: 24, closing_balance: 17200, salary_credits: 0, gig_credits: 18 },
  { month: '2025-04', total_credits: 35600, total_debits: 27100, emi_payments: 8500, upi_credits: 20, closing_balance: 16100, salary_credits: 0, gig_credits: 14 },
  { month: '2025-05', total_credits: 41200, total_debits: 29800, emi_payments: 8500, upi_credits: 28, closing_balance: 19600, salary_credits: 0, gig_credits: 22 },
  { month: '2025-06', total_credits: 39400, total_debits: 28400, emi_payments: 8500, upi_credits: 25, closing_balance: 22100, salary_credits: 0, gig_credits: 20 },
];
