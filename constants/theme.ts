// Brand colors and spacing for GigPay — saffron orange as primary
export const colors = {
  primary:     '#FF7A00',  // Saffron neon-orange — premium high-contrast accent
  primaryDark: '#D85F00',
  background:  '#090A0F',  // Sleek deep space/midnight black
  card:        '#131520',  // Rich dark navy-charcoal card background
  text:        '#F3F4F6',  // Crisp off-white
  textMuted:   '#9CA3AF',  // Muted grey
  success:     '#10B981',  // Emerald green
  danger:      '#EF4444',  // Rose red
  warning:     '#F59E0B',  // Amber orange
  border:      '#202438',  // Sleek dark navy border
  surfaceOrange: '#2C1B12', // Warm ambient orange tint
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
