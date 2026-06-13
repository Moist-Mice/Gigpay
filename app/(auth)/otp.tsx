import { useSignIn, useSignUp } from '../../lib/auth';
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

export default function OTPScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const { phone, flow } = useLocalSearchParams<{ phone: string; flow: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleVerify() {
    const token = otp.join('');
    if (token.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      if (flow === 'signUp') {
        // New user — verify phone and complete sign-up
        console.log('Verifying phone verification code for signup');
        const result = await signUp!.attemptPhoneNumberVerification({ code: token });
        if (result.status === 'complete') {
          await setSignUpActive!({ session: result.createdSessionId });
          // New user always goes to onboarding
          router.replace({ pathname: '/onboarding/name', params: { phone } });
        }
      } else {
        // Returning user — verify via sign-in
        console.log('Verifying phone verification code for signin');
        const result = await signIn!.attemptFirstFactor({
          strategy: 'phone_code',
          code: token,
        });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });

          // Check if user has a profile in our DB
          const isClerkTest = /^\d{3}55501\d{2}$/.test(phone);
          const prefix = isClerkTest ? '+1' : '+91';
          const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('phone', prefix + phone)
              .maybeSingle();

          if (existingUser) {
            router.replace('/(tabs)/home');
          } else {
            router.replace({ pathname: '/onboarding/name', params: { phone } });
          }
        }
      }
    } catch (e: any) {
      console.warn('Clerk OTP Verification Error:', JSON.stringify(e, null, 2));
      setError('OTP galat hai. Dobara try karein.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  function handleChange(text: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    // Auto-advance to next box
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
    // Auto-submit when all 6 filled
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      setTimeout(() => handleVerify(), 100);
    }
  }

  function handleKeyPress(key: string, index: number) {
    // Backspace on empty box → go back
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    try {
      const isClerkTest = /^\d{3}55501\d{2}$/.test(phone);
      const prefix = isClerkTest ? '+1' : '+91';
      const fullPhone = prefix + phone;
      console.log('Attempting sign-in resend for:', fullPhone);
      await signIn!.create({ identifier: fullPhone });
      const firstFactor = signIn!.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'phone_code'
      ) as any;
      await signIn!.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: firstFactor.phoneNumberId,
      });
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (e: any) {
      console.warn('Clerk Resend Error:', JSON.stringify(e, null, 2));
      setError('OTP resend nahi ho paya. Dobara try karein.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Wapas</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>OTP Darj Karein</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.boldPhone}>+91 {phone}</Text> pe bheja gaya hai
        </Text>

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => { inputs.current[i] = r; }}
              style={[
                styles.otpBox,
                focusedIndex === i && styles.otpBoxFocused,
                digit && styles.otpBoxFilled,
                error && styles.otpBoxError,
              ]}
              value={digit}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.button, (loading || otp.join('').length < 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.join('').length < 6}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Verify ✓</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={countdown > 0}
        >
          <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
            {countdown > 0
              ? `OTP mila nahi? ${countdown}s mein dobara bhejein`
              : 'OTP Dobara Bhejein'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.background },
  container:      { flex: 1, padding: spacing.md, paddingTop: 60 },
  backBtn:        { marginBottom: spacing.xl },
  backText:       { color: colors.primary, fontSize: 16, fontWeight: '600' },
  title:          { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  subtitle:       { fontSize: 15, color: colors.textMuted, marginBottom: spacing.xl },
  boldPhone:      { fontWeight: '700', color: colors.text },
  otpRow:         { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md, gap: spacing.sm },
  otpBox:         { flex: 1, aspectRatio: 0.9, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, textAlign: 'center', fontSize: 26, fontWeight: '800', color: colors.text, backgroundColor: colors.card },
  otpBoxFocused:  { borderColor: colors.primary, backgroundColor: '#FFF7ED' },
  otpBoxFilled:   { borderColor: colors.primaryDark, backgroundColor: '#FFF7ED' },
  otpBoxError:    { borderColor: colors.danger, backgroundColor: '#FEF2F2' },
  error:          { color: colors.danger, marginBottom: spacing.md, textAlign: 'center', fontSize: 14, fontWeight: '500' },
  button:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md, shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  buttonDisabled: { opacity: 0.45 },
  buttonText:     { color: '#fff', fontSize: 18, fontWeight: '800' },
  resendBtn:      { alignItems: 'center', paddingVertical: spacing.sm },
  resendText:     { color: colors.primary, fontWeight: '600', fontSize: 14 },
  resendDisabled: { color: colors.textMuted },
});
