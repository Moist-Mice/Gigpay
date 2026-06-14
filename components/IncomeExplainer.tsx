// components/IncomeExplainer.tsx
// Phase 4: Streaming Hindi explanation component with SSE support

import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import {
  RobotIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
} from './Icons';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface Props {
  submissionId: string;
  token: string;
}

export function IncomeExplainer({ submissionId, token }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');

  async function fetchExplanation() {
    if (explanation) { setExpanded(true); return; }
    setLoading(true);
    setExpanded(true);
    setError('');
    setExplanation('');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/explain-income`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      });

      if (!response.ok) {
        throw new Error(`Explanation failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (contentType.includes('text/event-stream')) {
        // ── Parse SSE stream ─────────────────────────────────────────────────
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.replace('data: ', '');
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.token) {
                setExplanation(prev => prev + parsed.token);
              } else if (parsed.text) {
                // Full-text response (fallback/mock path)
                setExplanation(parsed.text);
              }
            } catch { /* skip malformed */ }
          }
        }
      } else {
        // Non-streaming fallback (edge function returned JSON)
        const data = await response.json();
        setExplanation(data.explanation ?? data.text ?? 'Koi explanation nahi mili.');
      }

    } catch (e: any) {
      setError(e.message ?? 'Explanation load nahi ho paya.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => {
          if (!expanded) fetchExplanation();
          else setExpanded(!expanded);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.triggerLeft}>
          <View style={styles.iconContainer}>
            <RobotIcon size={20} color={colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.triggerTitle}>Samjhao mujhe</Text>
            <Text style={styles.triggerSub}>AI Hindi mein explain karega</Text>
          </View>
        </View>
        <View style={styles.chevronContainer}>
          {expanded ? (
            <ChevronUpIcon size={16} color={colors.textMuted} strokeWidth={2.5} />
          ) : (
            <ChevronDownIcon size={16} color={colors.textMuted} strokeWidth={2.5} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {loading && !explanation && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>AI soch raha hai...</Text>
            </View>
          )}

          {error ? (
            <View style={styles.errorRow}>
              <AlertTriangleIcon size={16} color={colors.danger} strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : explanation ? (
            <Text style={styles.explanationText}>{explanation}</Text>
          ) : null}

          {!loading && explanation && (
            <TouchableOpacity onPress={() => { setExplanation(''); fetchExplanation(); }}>
              <Text style={styles.refreshText}>↻ Dobara samjhao</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { backgroundColor: colors.surfaceOrange, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.25)', marginBottom: spacing.md, overflow: 'hidden' },
  trigger:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  triggerLeft:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconContainer:   { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 122, 0, 0.15)', justifyContent: 'center', alignItems: 'center' },
  triggerTitle:    { fontSize: 14, fontWeight: '700', color: colors.text },
  triggerSub:      { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  chevronContainer: { padding: 4 },
  body:            { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255, 122, 0, 0.15)' },
  loadingRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  loadingText:     { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  errorRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  errorText:       { color: colors.danger, fontSize: 13, flex: 1 },
  explanationText: { fontSize: 14, lineHeight: 22, color: colors.text, marginTop: spacing.sm, letterSpacing: 0.1 },
  refreshText:     { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: spacing.sm, textAlign: 'right' },
});

