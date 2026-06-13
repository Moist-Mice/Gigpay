# Antigravity Prompt — GigPay Phase 1: Foundation + Auth

> Read GIGPAY_MASTER_PLAN.md first. That is the single source of truth.
> This prompt builds the Expo scaffold, Clerk phone OTP auth, Supabase DB, and base navigation.

---

## CONTEXT

You are building **GigPay** — a React Native + Expo app for Indian gig workers (Swiggy/Zomato/Rapido) to generate a tamper-proof income certificate from a screenshot of their earnings. The certificate can be shared with NBFCs (lenders) via WhatsApp.

**Auth**: Clerk (phone OTP — India +91 only). NOT Supabase Auth.  
**Backend**: Supabase (DB + Storage only). Edge Functions for AI calls.  
**AI**: MiniMax M3 via OpenRouter (server-side only, never in client).

---

## STEP 1: Supabase Setup

Run this SQL in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: clerk_user_id TEXT (not FK to auth.users — we use Clerk, not Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  platform TEXT CHECK (platform IN ('swiggy', 'zomato', 'rapido', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE income_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT,
  screenshot_url TEXT,
  raw_parsed_json JSONB,
  months_data JSONB,
  avg_monthly_income NUMERIC,
  trend_pct NUMERIC,
  consistency_score NUMERIC,
  seasonality_flags JSONB DEFAULT '[]',
  nbfc_verdict TEXT CHECK (nbfc_verdict IN ('STRONG', 'MODERATE', 'WEAK')),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  human_id TEXT UNIQUE NOT NULL,
  submission_id UUID REFERENCES income_submissions(id),
  user_id UUID REFERENCES users(id),
  pdf_url TEXT,
  sha256_hash TEXT NOT NULL,
  qr_data TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  verified_count INT DEFAULT 0
);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID REFERENCES certificates(id),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verifier_ip TEXT
);

-- RLS disabled — auth enforced at Edge Function layer via Clerk JWT
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
ALTER TABLE verifications DISABLE ROW LEVEL SECURITY;
```

Create Storage buckets:
- `screenshots` — Private, 10MB limit, MIME: image/jpeg,image/png,image/webp
- `pdfs` — Public, 5MB limit, MIME: application/pdf

---

## STEP 2: Expo Project

```bash
npx create-expo-app gigpay --template blank-typescript
cd gigpay

# Router + navigation
npx expo install expo-router react-native-safe-area-context react-native-screens

# Clerk auth
npx expo install @clerk/clerk-expo expo-secure-store

# Supabase
npm install @supabase/supabase-js

# Camera + file handling
npx expo install expo-camera expo-image-picker expo-file-system expo-sharing

# Charts + QR
npm install victory-native react-native-svg react-native-qrcode-svg

# Async storage
npm install @react-native-async-storage/async-storage
```

Configure `app.json`:
```json
{
  "expo": {
    "name": "GigPay",
    "slug": "gigpay",
    "scheme": "gigpay",
    "plugins": [
      "expo-router",
      "expo-camera",
      ["expo-image-picker", { "photosPermission": "GigPay needs access to select your earnings screenshot." }]
    ]
  }
}
```

---

## STEP 3: File Structure to Create

```
gigpay/
├── app/
│   ├── _layout.tsx             ← ClerkProvider + auth gate
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx           ← Phone entry
│   │   └── otp.tsx             ← OTP verify
│   ├── (tabs)/
│   │   ├── _layout.tsx         ← Bottom tab navigator
│   │   ├── home.tsx
│   │   ├── upload.tsx
│   │   └── certificates.tsx
│   ├── onboarding/
│   │   └── name.tsx            ← Name + platform setup
│   ├── certificate/
│   │   └── [id].tsx
│   └── verify/
│       └── [id].tsx
├── components/
│   ├── EarningsCard.tsx
│   ├── CertificateCard.tsx
│   ├── ScoreBadge.tsx
│   └── PlatformBadge.tsx
├── lib/
│   ├── supabase.ts             ← Supabase client (DB + Storage only)
│   ├── intelligence.ts
│   ├── share.ts
│   └── types.ts
├── constants/
│   ├── theme.ts
│   └── copy.ts
└── .env.local
```

---

## STEP 4: Core Files to Write

### `constants/theme.ts`
```typescript
export const colors = {
  primary:     '#F97316',
  primaryDark: '#EA580C',
  background:  '#FAFAFA',
  card:        '#FFFFFF',
  text:        '#1A1A1A',
  textMuted:   '#6B7280',
  success:     '#16A34A',
  danger:      '#DC2626',
  warning:     '#D97706',
  border:      '#E5E7EB',
};
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
```

### `constants/copy.ts`
```typescript
export const copy = {
  tagline:         'Apni kamai ka certificate',
  addEarnings:     'Kamai Jodein (Add Earnings)',
  generateCert:    'Certificate Banayein',
  shareWhatsApp:   'WhatsApp pe Bhejein',
  emptyState:      'No earnings added yet',
  processingSteps: [
    'Reading your earnings...',
    'AI is analysing the data...',
    'Calculating your income score...',
  ],
};
```

### `lib/types.ts`
```typescript
export interface User {
  id: string;
  clerk_user_id: string;
  phone: string;
  name: string;
  platform: 'swiggy' | 'zomato' | 'rapido' | 'other';
  created_at: string;
}

export interface MonthData {
  period: string;   // "YYYY-MM"
  amount: number;
  trips?: number;
}

export interface IncomeSubmission {
  id: string;
  user_id: string;
  platform: string;
  screenshot_url: string;
  months_data: MonthData[];
  avg_monthly_income: number;
  trend_pct: number;
  consistency_score: number;
  seasonality_flags: string[];
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  status: 'processing' | 'complete' | 'failed';
  created_at: string;
}

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

### `lib/supabase.ts`
```typescript
// Supabase client — DB + Storage only. Auth is handled by Clerk.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### `app/_layout.tsx` — Root Layout with Clerk
```typescript
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';

// Secure token cache for Clerk
const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
};

// Auth gate — redirect based on sign-in state
function AuthGate() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/');
    }
  }, [isSignedIn, isLoaded]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <AuthGate />
    </ClerkProvider>
  );
}
```

### `app/(auth)/index.tsx` — Phone Entry
```typescript
import { useSignIn } from '@clerk/clerk-expo';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../constants/theme';

export default function PhoneScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Send OTP via Clerk
  async function handleSendOTP() {
    if (phone.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    setError('');
    try {
      await signIn!.create({ identifier: '+91' + phone });
      const firstFactor = signIn!.supportedFirstFactors.find(
        (f: any) => f.strategy === 'phone_code'
      ) as any;
      await signIn!.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: firstFactor.phoneNumberId,
      });
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>GigPay</Text>
      <Text style={styles.tagline}>Apni kamai ka certificate</Text>

      <Text style={styles.label}>Enter your mobile number</Text>
      <View style={styles.inputRow}>
        <Text style={styles.prefix}>🇮🇳 +91</Text>
        <TextInput
          style={styles.input}
          placeholder="9876543210"
          keyboardType="number-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading || !isLoaded}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' },
  logo:           { fontSize: 40, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 8 },
  tagline:        { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  label:          { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  inputRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.card },
  prefix:         { fontSize: 16, color: colors.text, marginRight: 8 },
  input:          { flex: 1, fontSize: 18, paddingVertical: 14, letterSpacing: 2 },
  error:          { color: colors.danger, marginBottom: spacing.sm, fontSize: 13 },
  button:         { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

### `app/(auth)/otp.tsx` — OTP Verification
```typescript
import { useSignIn, useAuth } from '@clerk/clerk-expo';
import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';

export default function OTPScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<TextInput[]>([]);

  // Countdown for resend
  useEffect(() => {
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.every(d => d !== '')) handleVerify();
  }, [otp]);

  async function handleVerify() {
    const token = otp.join('');
    if (token.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const result = await signIn!.attemptFirstFactor({ strategy: 'phone_code', code: token });
      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        // Check if user profile exists in our users table
        const clerkUserId = result.createdSessionId; // Use actual Clerk user ID
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('phone', '+91' + phone)
          .single();

        if (existingUser) {
          router.replace('/(tabs)/home');
        } else {
          router.replace({ pathname: '/onboarding/name', params: { phone } });
        }
      }
    } catch (e: any) {
      setError('Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleChange(text: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={r => { if (r) inputs.current[i] = r; }}
            style={styles.otpBox}
            value={digit}
            onChangeText={t => handleChange(t.slice(-1), i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity disabled={countdown > 0} onPress={() => { /* resend */ setCountdown(30); }}>
        <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' },
  title:          { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle:       { fontSize: 15, color: colors.textMuted, marginBottom: spacing.xl },
  otpRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  otpBox:         { width: 48, height: 56, borderWidth: 2, borderColor: colors.border, borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '700', backgroundColor: colors.card },
  error:          { color: colors.danger, marginBottom: spacing.sm, textAlign: 'center' },
  button:         { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  resend:         { textAlign: 'center', color: colors.primary, fontWeight: '600' },
  resendDisabled: { color: colors.textMuted },
});
```

### `app/onboarding/name.tsx` — Name + Platform Setup
```typescript
import { useUser } from '@clerk/clerk-expo';
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';

const platforms = [
  { id: 'swiggy', label: 'Swiggy', emoji: '🟠' },
  { id: 'zomato', label: 'Zomato', emoji: '🔴' },
  { id: 'rapido', label: 'Rapido', emoji: '🟡' },
  { id: 'other',  label: 'Other',  emoji: '➕' },
] as const;

export default function NameScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !platform) return;
    setLoading(true);
    try {
      await supabase.from('users').insert({
        clerk_user_id: user!.id,
        phone: '+91' + phone,
        name: name.trim(),
        platform,
      });
      router.replace('/(tabs)/home');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to GigPay! 👋</Text>
      <Text style={styles.label}>Your name</Text>
      <TextInput
        style={styles.input}
        placeholder="Raju Kumar"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Text style={[styles.label, { marginTop: spacing.lg }]}>Which platform do you work on?</Text>
      <View style={styles.platformGrid}>
        {platforms.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[styles.platformCard, platform === p.id && styles.platformCardSelected]}
            onPress={() => setPlatform(p.id)}
          >
            <Text style={styles.platformEmoji}>{p.emoji}</Text>
            <Text style={[styles.platformLabel, platform === p.id && styles.platformLabelSelected]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.button, (!name.trim() || !platform || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!name.trim() || !platform || loading}
      >
        <Text style={styles.buttonText}>Let's Go →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: colors.background, padding: spacing.md, justifyContent: 'center' },
  title:                  { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: spacing.lg },
  label:                  { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  input:                  { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, fontSize: 17, backgroundColor: colors.card, marginBottom: spacing.sm },
  platformGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  platformCard:           { flex: 1, minWidth: '44%', padding: spacing.md, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  platformCardSelected:   { borderColor: colors.primary, backgroundColor: '#FFF7ED' },
  platformEmoji:          { fontSize: 28, marginBottom: 4 },
  platformLabel:          { fontWeight: '600', color: colors.textMuted },
  platformLabelSelected:  { color: colors.primary },
  button:                 { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  buttonDisabled:         { opacity: 0.4 },
  buttonText:             { color: '#fff', fontSize: 18, fontWeight: '700' },
});
```

### `app/(tabs)/home.tsx` — Home Dashboard (initial shell)
```typescript
import { useUser } from '@clerk/clerk-expo';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../constants/theme';
import { copy } from '../../constants/copy';

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>
        Namaste, {user?.firstName ?? 'there'} 👋
      </Text>
      <Text style={styles.subtitle}>Your income, verified.</Text>

      {/* Empty state */}
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>📄</Text>
        <Text style={styles.emptyTitle}>{copy.emptyState}</Text>
        <Text style={styles.emptyBody}>Photograph your earnings screen to get started.</Text>
      </View>

      <TouchableOpacity style={styles.cta} onPress={() => router.push('/(tabs)/upload')}>
        <Text style={styles.ctaText}>{copy.addEarnings}</Text>
      </TouchableOpacity>

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>How it works</Text>
        {[
          { icon: '📷', text: 'Photograph your earnings screen' },
          { icon: '🤖', text: 'AI reads and analyses your income' },
          { icon: '📄', text: 'Get a certificate to share with lenders' },
        ].map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  content:     { padding: spacing.md },
  greeting:    { fontSize: 26, fontWeight: 'bold', color: colors.text, marginTop: spacing.md },
  subtitle:    { fontSize: 15, color: colors.textMuted, marginBottom: spacing.lg },
  emptyCard:   { backgroundColor: colors.card, borderRadius: 16, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  emptyEmoji:  { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle:  { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 6 },
  emptyBody:   { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  cta:         { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.xl },
  ctaText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
  howItWorks:  { backgroundColor: colors.card, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  howTitle:    { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  step:        { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  stepIcon:    { fontSize: 22, marginRight: spacing.sm },
  stepText:    { fontSize: 14, color: colors.textMuted, flex: 1 },
});
```

### `app/(tabs)/_layout.tsx` — Bottom Tab Navigator
```typescript
import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      headerShown: false,
    }}>
      <Tabs.Screen name="home"          options={{ title: 'Home',         tabBarIcon: () => null }} />
      <Tabs.Screen name="upload"        options={{ title: 'Add',          tabBarIcon: () => null }} />
      <Tabs.Screen name="certificates"  options={{ title: 'Certificates', tabBarIcon: () => null }} />
    </Tabs>
  );
}
```

### Placeholder screens (upload.tsx, certificates.tsx)
Both should render a simple screen with "Coming in Phase 2" text so the tab navigator doesn't crash.

### `lib/intelligence.ts`
Implement the full `analyseIncome` function exactly as documented in GIGPAY_MASTER_PLAN.md under "Income Intelligence Engine".

---

## STEP 5: Environment Variables

Create `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_APP_URL=https://gigpay.app
```

---

## DELIVERABLES

When done, confirm:
1. ✅ `npx expo start` runs without errors
2. ✅ Phone entry screen shows with +91 prefix
3. ✅ OTP sent via Clerk (check Clerk dashboard for test delivery)
4. ✅ New user → name + platform screen → home
5. ✅ Returning user → straight to home
6. ✅ Bottom tabs navigate without crashing
7. ✅ `lib/intelligence.ts` exports `analyseIncome` function
8. ✅ Supabase tables created and accessible

Update PROGRESS.md: check off Phase 1 items, add handoff note describing current state.
