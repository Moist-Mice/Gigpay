import { useUser } from '@clerk/clerk-expo';
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';

const PLATFORMS = [
  { id: 'swiggy', label: 'Swiggy', emoji: '🟠', color: '#FF6900' },
  { id: 'zomato', label: 'Zomato', emoji: '🔴', color: '#E23744' },
  { id: 'rapido', label: 'Rapido', emoji: '🟡', color: '#F7C948' },
  { id: 'other',  label: 'Other',  emoji: '➕', color: colors.textMuted },
] as const;

export default function NameScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save user profile to Supabase users table
  async function handleSubmit() {
    if (!name.trim() || !platform) return;
    setLoading(true);
    setError('');
    try {
      const { error: insertError } = await supabase.from('users').insert({
        clerk_user_id: user!.id,
        phone: '+91' + phone,
        name: name.trim(),
        platform,
      });
      if (insertError) throw insertError;
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Profile save nahi ho paya. Dobara try karein.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && platform !== '' && !loading;

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
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>GigPay mein{'\n'}Swagat hai!</Text>
        <Text style={styles.subtitle}>Apna profile set karein — ek baar hi karna hai</Text>

        {/* Name input */}
        <Text style={styles.label}>Aapka naam</Text>
        <TextInput
          style={[styles.input, error && styles.inputError]}
          placeholder="Raju Kumar"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={t => { setName(t); setError(''); }}
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Platform selector */}
        <Text style={[styles.label, { marginTop: spacing.lg }]}>
          Kaun si platform pe kaam karte ho?
        </Text>
        <View style={styles.grid}>
          {PLATFORMS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.platformCard,
                platform === p.id && { borderColor: p.color, backgroundColor: p.color + '12' },
              ]}
              onPress={() => setPlatform(p.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.platformEmoji}>{p.emoji}</Text>
              <Text style={[
                styles.platformLabel,
                platform === p.id && { color: p.color, fontWeight: '700' },
              ]}>
                {p.label}
              </Text>
              {platform === p.id && (
                <View style={[styles.checkDot, { backgroundColor: p.color }]}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Shuru Karein →</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>
          Aapka phone number: +91 {phone}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: colors.background },
  container:      { flexGrow: 1, padding: spacing.md, paddingTop: 60, paddingBottom: spacing.xl },
  emoji:          { fontSize: 48, marginBottom: spacing.sm },
  title:          { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, lineHeight: 38 },
  subtitle:       { fontSize: 15, color: colors.textMuted, marginBottom: spacing.xl },
  label:          { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14, fontSize: 18, fontWeight: '600', backgroundColor: colors.card, color: colors.text, marginBottom: spacing.sm },
  inputError:     { borderColor: colors.danger },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  platformCard:   { width: '47%', padding: spacing.md, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card, position: 'relative', minHeight: 90, justifyContent: 'center' },
  platformEmoji:  { fontSize: 30, marginBottom: 6 },
  platformLabel:  { fontWeight: '600', color: colors.textMuted, fontSize: 15 },
  checkDot:       { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  checkMark:      { color: '#fff', fontSize: 11, fontWeight: '800' },
  error:          { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  button:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, marginBottom: spacing.md },
  buttonDisabled: { opacity: 0.4 },
  buttonText:     { color: '#fff', fontSize: 18, fontWeight: '800' },
  hint:           { textAlign: 'center', color: colors.textMuted, fontSize: 13 },
});
