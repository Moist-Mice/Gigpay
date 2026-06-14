// components/IncomeChart.tsx
// Bar chart of monthly earnings using react-native-svg

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

  // Y scale: returns px offset from top of chart area
  const yScale = (val: number) => chartH - (val / maxAmount) * chartH;
  // Average line Y (absolute, including paddingTop)
  const avgY = yScale(avgMonthly) + paddingTop;

  return (
    <View style={styles.container}>
      <Svg width={W} height={H}>
        {/* Average dashed line */}
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

        {/* Y-axis labels at 0%, 50%, 100% */}
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

      {/* Legend */}
      <Text style={styles.legend}>
        <Text style={{ color: colors.success }}>■</Text> Above avg{'   '}
        <Text style={{ color: colors.primary }}>■</Text> Below avg{'   '}
        <Text style={{ color: colors.warning }}>- -</Text> Average
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend:    { fontSize: 10, color: colors.textMuted, marginTop: 4 },
});
