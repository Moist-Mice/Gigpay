import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../../constants/theme';

export default function PhoneScreen() {
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLoaded = signInLoaded && signUpLoaded;

  // Send OTP — tries sign-in first, falls back to sign-up for new users
  async function handleSendOTP() {
    if (phone.length !== 10) {
      setError('Sahi 10-digit mobile number darj karein');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Try sign-in first (returning user)
      await signIn!.create({ identifier: '+91' + phone });
      const firstFactor = signIn!.supportedFirstFactors?.find(
        (f: any) => f.strategy === 'phone_code'
      ) as any;
      await signIn!.prepareFirstFactor({
        strategy: 'phone_code',
        phoneNumberId: firstFactor.phoneNumberId,
      });
      router.push({ pathname: '/(auth)/otp', params: { phone, flow: 'signIn' } });
    } catch (e: any) {
      // If user doesn't exist, create a new account
      const code = e.errors?.[0]?.code ?? '';
      if (code === 'form_identifier_not_found' || code === 'form_password_incorrect') {
        try {
          await signUp!.create({ phoneNumber: '+91' + phone });
          await signUp!.preparePhoneNumberVerification({ strategy: 'phone_code' });
          router.push({ pathname: '/(auth)/otp', params: { phone, flow: 'signUp' } });
        } catch (signUpErr: any) {
          setError(signUpErr.errors?.[0]?.message || 'Account banana mushkil ho gaya. Dobara try karein.');
        }
      } else {
        setError(e.errors?.[0]?.message || e.message || 'OTP bhejne mein dikkat aayi');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
          <Text style={styles.logo}>GigPay</Text>
          <Text style={styles.tagline}>Apni kamai ka certificate</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
            <View style={styles.prefixBadge}>
              <Text style={styles.prefixFlag}>🇮🇳</Text>
              <Text style={styles.prefixCode}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={t => { setPhone(t); setError(''); }}
              editable={!loading}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, (loading || !isLoaded) && styles.buttonDisabled]}
            onPress={handleSendOTP}
            disabled={loading || !isLoaded}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>OTP Bhejein →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Trust signals */}
        <View style={styles.trustRow}>
          {['🔒 Secure', '🇮🇳 India Only', '✅ Free'].map(item => (
            <View key={item} style={styles.trustBadge}>
              <Text style={styles.trustText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>Kaise kaam karta hai?</Text>
          {[
            { icon: '📱', text: 'Apni Swiggy/Zomato kamai screen ki photo lo' },
            { icon: '🤖', text: 'AI turant income analyse karta hai' },
            { icon: '📄', text: 'Certificate banao, lender ko bhejo' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1, backgroundColor: colors.background },
  container:       { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  header:          { alignItems: 'center', paddingVertical: spacing.xl },
  logoContainer:   { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  logoEmoji:       { fontSize: 36 },
  logo:            { fontSize: 42, fontWeight: '800', color: colors.primary, letterSpacing: -1 },
  tagline:         { fontSize: 16, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  card:            { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  label:           { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#F9FAFB', marginBottom: spacing.md, overflow: 'hidden' },
  inputRowError:   { borderColor: colors.danger },
  prefixBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, backgroundColor: '#F3F4F6', borderRightWidth: 1, borderRightColor: colors.border, gap: 4 },
  prefixFlag:      { fontSize: 18 },
  prefixCode:      { fontSize: 16, fontWeight: '700', color: colors.text },
  input:           { flex: 1, fontSize: 20, paddingHorizontal: spacing.md, paddingVertical: 14, fontWeight: '600', color: colors.text, letterSpacing: 2 },
  error:           { color: colors.danger, fontSize: 13, marginBottom: spacing.sm, marginTop: -spacing.sm },
  button:          { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  buttonDisabled:  { opacity: 0.55 },
  buttonText:      { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  trustRow:        { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  trustBadge:      { backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: '#DCFCE7' },
  trustText:       { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  howCard:         { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  howTitle:        { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  step:            { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm, gap: spacing.sm },
  stepIcon:        { fontSize: 22, lineHeight: 26 },
  stepText:        { fontSize: 14, color: colors.textMuted, flex: 1, lineHeight: 20 },
});
