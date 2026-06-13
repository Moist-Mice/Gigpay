import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

type Verdict = 'STRONG' | 'MODERATE' | 'WEAK';

interface ScoreBadgeProps {
  verdict: Verdict;
  score?: number;  // 0–100 consistency score
  size?: 'sm' | 'md' | 'lg';
}

const VERDICT_CONFIG: Record<Verdict, {
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  text: string;
  emoji: string;
}> = {
  STRONG: {
    label:    'STRONG',
    sublabel: 'Loan ke liye bahut accha',
    bg:       '#DCFCE7',
    border:   '#86EFAC',
    text:     '#15803D',
    emoji:    '💪',
  },
  MODERATE: {
    label:    'MODERATE',
    sublabel: 'Theek hai, improve karo',
    bg:       '#FEF3C7',
    border:   '#FCD34D',
    text:     '#D97706',
    emoji:    '📈',
  },
  WEAK: {
    label:    'WEAK',
    sublabel: 'Income badhani padegi',
    bg:       '#FEE2E2',
    border:   '#FCA5A5',
    text:     '#DC2626',
    emoji:    '⚠️',
  },
};

/**
 * Displays NBFC verdict badge with colour-coded background and label.
 */
export function ScoreBadge({ verdict, score, size = 'md' }: ScoreBadgeProps) {
  const cfg = VERDICT_CONFIG[verdict];
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      isLg && styles.badgeLg,
      isSm && styles.badgeSm,
    ]}>
      <Text style={isSm ? styles.emojiSm : styles.emoji}>{cfg.emoji}</Text>
      <View>
        <Text style={[styles.label, { color: cfg.text }, isLg && styles.labelLg, isSm && styles.labelSm]}>
          {cfg.label}
          {score !== undefined ? ` · ${score}/100` : ''}
        </Text>
        {!isSm && (
          <Text style={[styles.sublabel, { color: cfg.text }]}>{cfg.sublabel}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:      { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignSelf: 'flex-start' },
  badgeLg:    { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  badgeSm:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  emoji:      { fontSize: 20 },
  emojiSm:    { fontSize: 13 },
  label:      { fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  labelLg:    { fontSize: 17 },
  labelSm:    { fontSize: 11 },
  sublabel:   { fontSize: 11, fontWeight: '500', opacity: 0.85, marginTop: 1 },
});
