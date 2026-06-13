// lib/share.ts
// PDF download from Supabase Storage + WhatsApp / system share sheet

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Linking } from 'react-native';

/** Download PDF to device cache, then open system share sheet */
export async function sharePDF(pdfUrl: string, humanId: string): Promise<void> {
  try {
    const localPath = `${FileSystem.cacheDirectory}${humanId}.pdf`;

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(localPath);

    if (!fileInfo.exists) {
      // Download from Supabase Storage public URL
      const downloadResult = await FileSystem.downloadAsync(pdfUrl, localPath);
      if (downloadResult.status !== 200) {
        throw new Error('Download failed');
      }
    }

    // Check sharing is available (Android requires it)
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Sharing not available', 'Please update your device to enable file sharing.');
      return;
    }

    // Open system share sheet — user can pick WhatsApp, email, Drive, etc.
    await Sharing.shareAsync(localPath, {
      mimeType: 'application/pdf',
      dialogTitle: `Share GigPay Certificate ${humanId}`,
      UTI: 'com.adobe.pdf', // iOS
    });
  } catch (err: any) {
    Alert.alert('Share failed', err.message ?? 'Could not share the certificate. Please try again.');
    throw err;
  }
}

/** Share a certificate link (text) via native Share sheet */
export async function shareCertificate(pdfUrl: string, humanId: string): Promise<void> {
  // Re-exported for backward compatibility — delegates to sharePDF
  return sharePDF(pdfUrl, humanId);
}

/** Share directly to WhatsApp with pre-filled message */
export async function shareToWhatsApp(pdfUrl: string, humanId: string): Promise<void> {
  const message = encodeURIComponent(
    `Namaste! Mera GigPay Income Certificate:\n${humanId}\n${pdfUrl}\n\nVerify at: https://gigpay.app/verify/${humanId}`
  );
  const url = `whatsapp://send?text=${message}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // WhatsApp not installed — fall back to system share sheet
    await sharePDF(pdfUrl, humanId);
  }
}

/** Open verify URL in default browser */
export function openVerifyUrl(verifyUrl: string): void {
  Linking.openURL(verifyUrl).catch(() => {
    Alert.alert('Could not open link', verifyUrl);
  });
}
