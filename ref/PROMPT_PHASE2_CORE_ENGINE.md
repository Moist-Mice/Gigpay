# Antigravity Prompt — GigPay Phase 2: Core Engine

> Read `GIGPAY_MASTER_PLAN.md` first. That is the single source of truth.
> Phase 1 is complete: Expo scaffold, Clerk phone OTP auth, Supabase schema, base navigation, and `lib/intelligence.ts` are all working. Metro Bundler runs at http://localhost:8081 with no errors.
> This prompt builds the AI pipeline: camera upload → MiniMax M3 screenshot parsing → intelligence analysis → results screen.

---

## CONTEXT

**What Phase 1 delivered (do not re-create these):**
- `app/_layout.tsx` — ClerkProvider + AuthGate (working)
- `app/(auth)/index.tsx` — Phone entry with +91 prefix (working)
- `app/(auth)/otp.tsx` — 6-box OTP verify (working)
- `app/onboarding/name.tsx` — Name + platform selector (working)
- `app/(tabs)/_layout.tsx` — Bottom tab navigator (working)
- `app/(tabs)/home.tsx` — Home dashboard shell (working)
- `app/(tabs)/upload.tsx` — **PLACEHOLDER ONLY** — replace in Phase 2
- `app/(tabs)/certificates.tsx` — Placeholder (leave as-is for Phase 3)
- `lib/supabase.ts` — Supabase client (working)
- `lib/intelligence.ts` — `analyseIncome()` function (working, do not touch)
- `lib/types.ts` — All TypeScript interfaces (working)
- `constants/theme.ts` — Brand colors (working)
- `constants/copy.ts` — Bilingual strings (working)
- `components/EarningsCard.tsx`, `CertificateCard.tsx`, `ScoreBadge.tsx`, `PlatformBadge.tsx` (working)

**What Phase 2 must build:**
1. `supabase/functions/parse-screenshot/index.ts` — Deno Edge Function
2. `app/(tabs)/upload.tsx` — Camera/gallery picker + upload flow (replaces placeholder)
3. `app/processing/[id].tsx` — Animated processing screen (polls submission status)
4. `app/results/[id].tsx` — Results screen (income metrics + "Generate Certificate" CTA)
5. `components/IncomeChart.tsx` — Bar chart of monthly earnings
6. `lib/upload.ts` — Upload helper (Storage + Edge Function call)

---

## STEP 1: Supabase Edge Function — `parse-screenshot`

Create `supabase/functions/parse-screenshot/index.ts`.

**What it does:**
1. Receives POST request with `{ storage_path, user_id, platform_hint? }`
2. Verifies Clerk JWT from Authorization header
3. Downloads the screenshot from Supabase Storage (service role)
4. Converts image to base64
5. Calls MiniMax M3 via OpenRouter (vision call)
6. Parses AI JSON response → runs `analyseIncome()` logic inline
7. Saves result to `income_submissions` table
8. Returns submission data

```typescript
// supabase/functions/parse-screenshot/index.ts
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
    const { data: finalSubmission } = await supabaseAdmin
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
```

**Deploy command (run after writing the file):**
```bash
supabase functions deploy parse-screenshot
```

**Edge Function secrets to set (Supabase dashboard → Project Settings → Edge Functions):**
```
OPENROUTER_API_KEY=sk-or-...     # iQOO-provided
CLERK_SECRET_KEY=sk_live_...     # from Clerk dashboard
```

---

## STEP 2: Upload Helper — `lib/upload.ts`

```typescript
// lib/upload.ts
// Handles: image upload to Supabase Storage + parse-screenshot Edge Function call

import { supabase } from './supabase';
import type { IncomeSubmission } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface UploadResult {
  submission_id: string;
  storage_path: string;
}

/** Upload a screenshot image URI to Supabase Storage and trigger parse-screenshot */
export async function uploadAndParse(
  imageUri: string,
  clerkToken: string,
  userId: string,
  platformHint?: string,
): Promise<IncomeSubmission> {
  // 1. Read file as blob
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';

  // 2. Generate unique storage path
  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}.${ext}`;

  // 3. Upload to Supabase Storage (screenshots bucket — private)
  const { error: uploadError } = await supabase
    .storage
    .from('screenshots')
    .upload(storagePath, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 4. Call parse-screenshot Edge Function with Clerk JWT
  const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-screenshot`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkToken}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      storage_path: storagePath,
      user_id: userId,
      platform_hint: platformHint,
    }),
  });

  if (!parseResponse.ok) {
    const err = await parseResponse.json();
    throw new Error(err.error ?? `Parse failed: ${parseResponse.status}`);
  }

  const result = await parseResponse.json();
  return result as IncomeSubmission;
}
```

---

## STEP 3: Upload Screen — `app/(tabs)/upload.tsx`

Replace the placeholder. This screen handles the full upload flow in one place.

```typescript
// app/(tabs)/upload.tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { supabase } from '../../lib/supabase';
import { uploadAndParse } from '../../lib/upload';
import { colors, spacing } from '../../constants/theme';
import { copy } from '../../constants/copy';

// Demo data — loaded on long-press (bypass camera for hackathon demo)
const DEMO_MONTHS = [
  { period: '2025-01', amount: 16800, trips: 212 },
  { period: '2025-02', amount: 17200, trips: 218 },
  { period: '2025-03', amount: 18100, trips: 229 },
  { period: '2025-04', amount: 17900, trips: 226 },
  { period: '2025-05', amount: 19200, trips: 243 },
  { period: '2025-06', amount: 18400, trips: 233 },
];

type Stage = 'idle' | 'picked' | 'uploading' | 'parsing' | 'done' | 'error';

export default function UploadScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stage, setStage] = useState<Stage>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pick image from camera ────────────────────────────────────────────────
  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'GigPay needs camera access to photograph your earnings screen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStage('picked');
    }
  }

  // ── Pick image from gallery ───────────────────────────────────────────────
  async function handleGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'GigPay needs gallery access to select your earnings screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStage('picked');
    }
  }

  // ── Upload + parse ────────────────────────────────────────────────────────
  async function handleProcess() {
    if (!imageUri || !user) return;
    setStage('uploading');
    setError('');

    try {
      // Fetch user record from DB to get our internal user_id
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, platform')
        .eq('clerk_user_id', user.id)
        .single();

      if (!dbUser) throw new Error('User profile not found. Please complete onboarding.');

      setStatusMsg(copy.processingSteps[0]); // "Reading your earnings..."
      setStage('uploading');

      const token = await getToken();
      if (!token) throw new Error('Authentication failed. Please sign in again.');

      setStatusMsg(copy.processingSteps[1]); // "AI is analysing the data..."
      setStage('parsing');

      const submission = await uploadAndParse(
        imageUri,
        token,
        dbUser.id,
        dbUser.platform,
      );

      setStatusMsg(copy.processingSteps[2]); // "Calculating your income score..."

      // Navigate to results screen
      router.push(`/results/${submission.submission_id}`);

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStage('error');
    }
  }

  // ── Demo mode (long-press CTA) — bypass camera ───────────────────────────
  async function handleDemoMode() {
    if (!user) return;
    setStage('parsing');
    setStatusMsg('Loading demo data...');
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, platform')
        .eq('clerk_user_id', user.id)
        .single();

      if (!dbUser) throw new Error('User profile not found.');

      // Insert demo submission directly (no AI call needed)
      const avg = Math.round(DEMO_MONTHS.reduce((s, m) => s + m.amount, 0) / DEMO_MONTHS.length);
      const { data: submission } = await supabase
        .from('income_submissions')
        .insert({
          user_id: dbUser.id,
          platform: 'swiggy',
          screenshot_url: 'demo://mock',
          months_data: DEMO_MONTHS,
          avg_monthly_income: avg,
          trend_pct: 2.3,
          consistency_score: 100,
          seasonality_flags: [],
          nbfc_verdict: 'STRONG',
          status: 'complete',
        })
        .select()
        .single();

      if (submission) {
        router.push(`/results/${submission.id}`);
      }
    } catch (e: any) {
      setError(e.message);
      setStage('error');
    }
  }

  const isProcessing = stage === 'uploading' || stage === 'parsing';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Earnings</Text>
      <Text style={styles.subtitle}>Photograph your earnings screen from Swiggy, Zomato, or Rapido</Text>

      {/* Image preview */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          <TouchableOpacity style={styles.changeBtn} onPress={() => { setImageUri(null); setStage('idle'); }}>
            <Text style={styles.changeBtnText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Idle state — pick source */}
      {stage === 'idle' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity style={styles.pickerCard} onPress={handleCamera}>
            <Text style={styles.pickerIcon}>📷</Text>
            <Text style={styles.pickerLabel}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerCard} onPress={handleGallery}>
            <Text style={styles.pickerIcon}>🖼️</Text>
            <Text style={styles.pickerLabel}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing state */}
      {isProcessing && (
        <View style={styles.processingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>{statusMsg}</Text>
          <Text style={styles.processingHint}>This usually takes 5–10 seconds</Text>
        </View>
      )}

      {/* Error state */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setStage('idle'); setImageUri(null); setError(''); }}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm + process CTA */}
      {stage === 'picked' && imageUri && (
        <TouchableOpacity
          style={styles.cta}
          onPress={handleProcess}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
        >
          <Text style={styles.ctaText}>{copy.addEarnings}</Text>
        </TouchableOpacity>
      )}

      {/* Demo shortcut for idle state (long-press) */}
      {stage === 'idle' && (
        <TouchableOpacity
          style={styles.demoBtn}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
        >
          <Text style={styles.demoBtnText}>Long-press to load demo data</Text>
        </TouchableOpacity>
      )}

      {/* Tips */}
      {(stage === 'idle' || stage === 'picked') && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>📋 Tips for best results</Text>
          <Text style={styles.tipItem}>• Make sure all months are visible on screen</Text>
          <Text style={styles.tipItem}>• Hold phone steady — avoid blur</Text>
          <Text style={styles.tipItem}>• Ensure earnings amounts are clearly readable</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: spacing.md, paddingBottom: spacing.xl },
  title:            { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.sm },
  subtitle:         { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 4 },
  pickerRow:        { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  pickerCard:       { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pickerIcon:       { fontSize: 36, marginBottom: spacing.sm },
  pickerLabel:      { fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center' },
  previewContainer: { borderRadius: 16, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  preview:          { width: '100%', height: 280, backgroundColor: colors.border },
  changeBtn:        { padding: spacing.sm, alignItems: 'center', backgroundColor: colors.card },
  changeBtnText:    { color: colors.primary, fontWeight: '600' },
  cta:              { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md },
  ctaText:          { color: '#fff', fontSize: 17, fontWeight: '700' },
  demoBtn:          { padding: spacing.md, alignItems: 'center' },
  demoBtnText:      { color: colors.textMuted, fontSize: 12 },
  processingBox:    { alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  processingText:   { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' },
  processingHint:   { fontSize: 13, color: colors.textMuted },
  errorBox:         { alignItems: 'center', padding: spacing.lg, backgroundColor: '#FEF2F2', borderRadius: 16, borderWidth: 1, borderColor: '#FECACA' },
  errorIcon:        { fontSize: 32, marginBottom: spacing.sm },
  errorText:        { fontSize: 14, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retryBtn:         { backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryBtnText:     { color: '#fff', fontWeight: '700' },
  tips:             { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  tipsTitle:        { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tipItem:          { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
});
```

---

## STEP 4: Processing Screen — `app/processing/[id].tsx`

This screen is an optional animated waiting screen. The upload screen navigates directly to results when the Edge Function returns, so this screen is only used if you want to poll for status asynchronously. Implement it as a polling fallback.

```typescript
// app/processing/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';
import { copy } from '../../constants/copy';

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  // Cycle through processing step labels
  useEffect(() => {
    const labelTimer = setInterval(() => {
      setStepIndex(i => (i + 1) % copy.processingSteps.length);
    }, 2500);
    const dotTimer = setInterval(() => {
      setDotCount(d => (d % 3) + 1);
    }, 500);
    return () => { clearInterval(labelTimer); clearInterval(dotTimer); };
  }, []);

  // Poll submission status every 2 seconds
  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('income_submissions')
        .select('status, id')
        .eq('id', id)
        .single();

      if (data?.status === 'complete') {
        clearInterval(poll);
        router.replace(`/results/${id}`);
      } else if (data?.status === 'failed') {
        clearInterval(poll);
        router.replace('/(tabs)/upload');
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [id]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🤖</Text>
      <Text style={styles.label}>{copy.processingSteps[stepIndex]}{''.padEnd(dotCount, '.')}</Text>
      <Text style={styles.hint}>MiniMax M3 is reading your earnings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji:     { fontSize: 64, marginBottom: spacing.lg },
  label:     { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  hint:      { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
```

---

## STEP 5: Results Screen — `app/results/[id].tsx`

The centrepiece of Phase 2. Loads the `income_submission` record and displays all intelligence metrics.

```typescript
// app/results/[id].tsx
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';
import type { IncomeSubmission } from '../../lib/types';
import { ScoreBadge } from '../../components/ScoreBadge';
import { PlatformBadge } from '../../components/PlatformBadge';
import { IncomeChart } from '../../components/IncomeChart';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [submission, setSubmission] = useState<IncomeSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load submission from Supabase
  useEffect(() => {
    if (!id) return;
    loadSubmission();
  }, [id]);

  async function loadSubmission() {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('income_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setSubmission(data as IncomeSubmission);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  if (error || !submission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error || 'Results not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // NBFC verdict display config
  const verdictConfig = {
    STRONG:   { color: colors.success,  emoji: '💪', label: 'Strong Profile' },
    MODERATE: { color: colors.warning,  emoji: '👍', label: 'Moderate Profile' },
    WEAK:     { color: colors.danger,   emoji: '⚠️', label: 'Weak Profile' },
  };
  const verdict = verdictConfig[submission.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <PlatformBadge platform={submission.platform} />
        <Text style={styles.title}>Income Analysis</Text>
        <Text style={styles.subtitle}>{submission.months_data?.length ?? 0} months analysed</Text>
      </View>

      {/* NBFC Verdict Banner */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color, backgroundColor: verdict.color + '15' }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
        <View>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
          <Text style={styles.verdictSub}>Loan eligibility assessment</Text>
        </View>
      </View>

      {/* 3 Key Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            ₹{submission.avg_monthly_income?.toLocaleString('en-IN') ?? '—'}
          </Text>
          <Text style={styles.metricLabel}>Avg / Month</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: (submission.trend_pct ?? 0) >= 0 ? colors.success : colors.danger }]}>
            {(submission.trend_pct ?? 0) >= 0 ? '+' : ''}{submission.trend_pct?.toFixed(1) ?? '0'}%
          </Text>
          <Text style={styles.metricLabel}>Income Trend</Text>
        </View>
        <View style={styles.metricCard}>
          <ScoreBadge score={submission.consistency_score ?? 0} />
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* Income Bar Chart */}
      {submission.months_data && submission.months_data.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Earnings</Text>
          <IncomeChart months={submission.months_data} avgMonthly={submission.avg_monthly_income} />
        </View>
      )}

      {/* Monthly Breakdown Table */}
      <View style={styles.tableCard}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        {(submission.months_data ?? []).map((month, i) => {
          const deviation = ((month.amount - submission.avg_monthly_income) / submission.avg_monthly_income * 100);
          const label = new Date(month.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          return (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={styles.tableMonth}>{label}</Text>
              <Text style={styles.tableAmount}>₹{month.amount.toLocaleString('en-IN')}</Text>
              <Text style={[styles.tableDeviation, { color: deviation >= 0 ? colors.success : colors.danger }]}>
                {deviation >= 0 ? '+' : ''}{deviation.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Seasonality flags */}
      {(submission.seasonality_flags ?? []).length > 0 && (
        <View style={styles.flagsCard}>
          <Text style={styles.sectionTitle}>⚡ Notable Months</Text>
          {submission.seasonality_flags.map((flag, i) => (
            <Text key={i} style={styles.flagItem}>• {flag}</Text>
          ))}
        </View>
      )}

      {/* Generate Certificate CTA */}
      <TouchableOpacity
        style={styles.certCta}
        onPress={() => router.push(`/certificate/generate?submissionId=${id}`)}
      >
        <Text style={styles.certCtaText}>📄 Generate Certificate</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home')}>
        <Text style={styles.backLinkText}>← Back to Home</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: spacing.md, paddingBottom: spacing.xl },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:     { marginTop: spacing.md, color: colors.textMuted, fontSize: 15 },
  errorText:       { fontSize: 16, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  header:          { marginBottom: spacing.md },
  title:           { fontSize: 26, fontWeight: 'bold', color: colors.text, marginTop: 4 },
  subtitle:        { fontSize: 13, color: colors.textMuted },
  verdictBanner:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 14, borderWidth: 2, marginBottom: spacing.md },
  verdictEmoji:    { fontSize: 36 },
  verdictLabel:    { fontSize: 18, fontWeight: '800' },
  verdictSub:      { fontSize: 12, color: colors.textMuted },
  metricsRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:      { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricValue:     { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metricLabel:     { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  chartCard:       { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  tableCard:       { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tableRow:        { flexDirection: 'row', paddingVertical: 8 },
  tableRowAlt:     { backgroundColor: colors.background, borderRadius: 6 },
  tableMonth:      { flex: 2, fontSize: 13, color: colors.text },
  tableAmount:     { flex: 2, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  tableDeviation:  { flex: 1, fontSize: 12, textAlign: 'right', fontWeight: '600' },
  flagsCard:       { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  flagItem:        { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  certCta:         { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.sm },
  certCtaText:     { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn:         { backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  backBtnText:     { color: colors.text, fontWeight: '600' },
  backLink:        { padding: spacing.md, alignItems: 'center' },
  backLinkText:    { color: colors.textMuted, fontSize: 14 },
});
```

---

## STEP 6: Income Chart Component — `components/IncomeChart.tsx`

Bar chart showing monthly earnings with average line.

```typescript
// components/IncomeChart.tsx
// Bar chart of monthly earnings using react-native-svg (no Victory Native dependency needed)

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import type { MonthData } from '../lib/types';
import { colors } from '../constants/theme';

interface Props {
  months: MonthData[];
  avgMonthly: number;
}

export function IncomeChart({ months, avgMonthly }: Props) {
  const W = 320, H = 160;
  const paddingLeft = 48, paddingBottom = 28, paddingTop = 12;
  const chartW = W - paddingLeft - 8;
  const chartH = H - paddingBottom - paddingTop;

  const sorted = [...months].sort((a, b) => a.period.localeCompare(b.period));
  const maxAmount = Math.max(...sorted.map(m => m.amount)) * 1.1;
  const barWidth = (chartW / sorted.length) * 0.6;
  const barGap = chartW / sorted.length;

  // Y scale
  const yScale = (val: number) => chartH - (val / maxAmount) * chartH;
  // Average line Y
  const avgY = yScale(avgMonthly) + paddingTop;

  return (
    <View style={styles.container}>
      <Svg width={W} height={H}>
        {/* Average line */}
        <Line
          x1={paddingLeft} y1={avgY}
          x2={W - 8} y2={avgY}
          stroke={colors.warning} strokeWidth={1.5} strokeDasharray="4,3"
        />
        <SvgText x={paddingLeft - 4} y={avgY - 4} fontSize={9} fill={colors.warning} textAnchor="end">
          avg
        </SvgText>

        {sorted.map((m, i) => {
          const barH = (m.amount / maxAmount) * chartH;
          const x = paddingLeft + i * barGap + (barGap - barWidth) / 2;
          const y = paddingTop + chartH - barH;
          const isAboveAvg = m.amount >= avgMonthly;
          const shortLabel = new Date(m.period + '-01').toLocaleDateString('en-IN', { month: 'short' });

          return (
            <View key={m.period}>
              <Rect
                x={x} y={y}
                width={barWidth} height={barH}
                rx={3}
                fill={isAboveAvg ? colors.success : colors.primary}
                opacity={0.85}
              />
              <SvgText
                x={x + barWidth / 2} y={H - paddingBottom + 12}
                fontSize={9} fill={colors.textMuted} textAnchor="middle"
              >
                {shortLabel}
              </SvgText>
            </View>
          );
        })}

        {/* Y-axis labels */}
        {[0, 0.5, 1].map(frac => {
          const val = maxAmount * frac;
          const y = paddingTop + chartH - frac * chartH;
          return (
            <SvgText key={frac} x={paddingLeft - 4} y={y + 4} fontSize={9} fill={colors.textMuted} textAnchor="end">
              {val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`}
            </SvgText>
          );
        })}
      </Svg>
      <Text style={styles.legend}>
        <Text style={{ color: colors.success }}>■</Text> Above avg  {'  '}
        <Text style={{ color: colors.primary }}>■</Text> Below avg  {'  '}
        <Text style={{ color: colors.warning }}>- -</Text> Average
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend:    { fontSize: 10, color: colors.textMuted, marginTop: 4 },
});
```

**Install react-native-svg if not already installed:**
```bash
npx expo install react-native-svg
```

---

## STEP 7: Update `app/(tabs)/home.tsx`

Update the home screen to show a list of past submissions (with real data from Supabase), not just an empty state.

Add this `loadSubmissions` function and replace the empty state card with a mapped list of `EarningsCard` components. The existing file from Phase 1 is the base — only **add** to it, do not rewrite the whole screen.

Key changes:
1. Add `useEffect` to fetch `income_submissions` for the current user (ordered by `created_at` desc, limit 10)
2. If `submissions.length === 0` → show existing empty state card
3. If `submissions.length > 0` → render `EarningsCard` for each, then "View All" link
4. Each `EarningsCard` should be `onPress={() => router.push('/results/' + submission.id)}`

---

## STEP 8: Install Missing Dependency

```bash
npx expo install react-native-svg
```

If `victory-native` was installed in Phase 1 but `react-native-svg` is missing, this will fix the chart rendering.

---

## FILE CHECKLIST

When you are done, every file in this list must exist and be non-empty:

```
supabase/functions/parse-screenshot/index.ts   ← NEW (Deno Edge Function)
lib/upload.ts                                  ← NEW
app/(tabs)/upload.tsx                          ← REPLACED (was placeholder)
app/processing/[id].tsx                        ← NEW
app/results/[id].tsx                           ← NEW
components/IncomeChart.tsx                     ← NEW
```

Modified (add functionality, do not rewrite):
```
app/(tabs)/home.tsx                            ← add submissions list
```

---

## DELIVERABLES — Confirm all before ending Phase 2

1. ✅ `supabase/functions/parse-screenshot/index.ts` deployed and responding to `supabase functions serve`
2. ✅ Upload screen shows camera + gallery picker with working permissions
3. ✅ Selecting an image previews it correctly
4. ✅ Tapping "Kamai Jodein" uploads to Supabase Storage `screenshots/` bucket
5. ✅ Edge Function receives the image, calls MiniMax M3, returns structured JSON
6. ✅ `income_submissions` row created in DB with `status: 'complete'`
7. ✅ App navigates to `/results/[id]` after successful parse
8. ✅ Results screen shows: NBFC verdict, avg monthly income, trend %, consistency score
9. ✅ Results screen shows monthly breakdown table with deviation % per month
10. ✅ `IncomeChart` renders bar chart of all months
11. ✅ "Generate Certificate" CTA navigates to `/certificate/generate` (placeholder OK — Phase 3 builds it)
12. ✅ Long-press on upload CTA loads demo data (Raju Kumar, Swiggy, 6 months) without camera
13. ✅ Home screen shows list of past submissions when they exist
14. ✅ Error state handled: screenshot unreadable → user sees clear error message with retry option

Update `PROGRESS.md`: check off all Phase 2 items and add handoff note for Phase 3 (Certificate PDF + share).

---

## HANDOFF NOTE FOR PHASE 3

Phase 3 builds:
- `supabase/functions/generate-certificate/index.ts` — pdf-lib PDF generation + SHA-256 hash + Supabase Storage upload
- `supabase/functions/verify-certificate/index.ts` — public QR lookup
- `app/certificate/[id].tsx` — certificate viewer (metrics, QR code, share button)
- `app/verify/[id].tsx` — public lender verification page (no auth required)
- `lib/share.ts` — download PDF + WhatsApp share sheet

The `certificate/generate` route targeted by the "Generate Certificate" CTA in this phase's results screen will be built in Phase 3. A placeholder screen at `app/certificate/generate.tsx` with "Coming Soon" text is acceptable for now.

---

*GigPay Phase 2 — iQOO PayBazaar PS3 Hackathon | June 2025*
