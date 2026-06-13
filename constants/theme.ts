// Brand colors and spacing for GigPay — saffron orange as primary
export const colors = {
  primary:     '#F97316',  // saffron orange — all CTAs, accents
  primaryDark: '#EA580C',
  background:  '#FAFAFA',
  card:        '#FFFFFF',
  text:        '#1A1A1A',
  textMuted:   '#6B7280',
  success:     '#16A34A',
  danger:      '#DC2626',
  warning:     '#D97706',
  border:      '#E5E7EB',
  surfaceOrange: '#FFF7ED', // light orange tint for selected states
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const typography = {
  h1:   { fontSize: 32, fontWeight: '800' as const, color: colors.text },
  h2:   { fontSize: 26, fontWeight: '700' as const, color: colors.text },
  h3:   { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  sm:   { fontSize: 13, fontWeight: '400' as const, color: colors.textMuted },
  label:{ fontSize: 15, fontWeight: '600' as const, color: colors.text },
};
