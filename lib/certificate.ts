// lib/certificate.ts
// Helpers for certificate ID generation and formatting

/** Generate a human-readable certificate ID: GIG-2025-XXXXX */
export function generateHumanId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GIG-${year}-${random}`;
}

/** Format a certificate ID for display (already human-readable) */
export function formatCertId(humanId: string): string {
  return humanId;
}

/** Get public verify URL for a certificate (deep link into app) */
export function getVerifyUrl(humanId: string): string {
  // Uses gigpay:// deep link scheme for in-app navigation via QR scan
  const base = process.env.EXPO_PUBLIC_APP_URL ?? 'gigpay://';
  // Prefer deep link for QR (so QR opens the app on device)
  return `gigpay://verify/${humanId}`;
}

/** Get web verify URL (for sharing as text link) */
export function getWebVerifyUrl(humanId: string): string {
  const base = process.env.EXPO_PUBLIC_APP_URL ?? 'https://gigpay.app';
  return `${base}/verify/${humanId}`;
}

/** Mask a phone number for display: +91 98765XXXXX */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  return `+91 ${digits.slice(-10, -5)}XXXXX`;
}

/** Platform display name */
export const platformNames: Record<string, string> = {
  swiggy: 'Swiggy Delivery',
  zomato: 'Zomato Delivery',
  rapido: 'Rapido Captain',
  other:  'Gig Platform',
};
