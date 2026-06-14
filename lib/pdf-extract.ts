// lib/pdf-extract.ts
// Client-side PDF → base64 conversion for bank statement upload

import * as FileSystem from 'expo-file-system/legacy';

/** Read a PDF from device filesystem and return it as a base64 string */
export async function pdfToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

/** Get approximate file size in KB from a URI */
export async function getFileSizeKB(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return 0;
  return Math.round((info as any).size / 1024);
}

/** Guard: returns warning string if file is likely too large for LLM */
export async function checkPdfSize(uri: string): Promise<string | null> {
  const kb = await getFileSizeKB(uri);
  if (kb > 5000) return `File is ${Math.round(kb / 1024)}MB — try a shorter date range (3–6 months).`;
  return null;
}
