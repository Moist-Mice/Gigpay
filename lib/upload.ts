// lib/upload.ts
// Handles: image upload to Supabase Storage + parse-screenshot Edge Function call

import { supabase } from './supabase';
import type { IncomeSubmission } from './types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface UploadResult {
  submission_id: string;
  storage_path: string;
}

/** Upload a screenshot image URI to Supabase Storage and trigger parse-screenshot */
export async function uploadAndParse(
  imageUri: string,
  clerkToken: string,
  userId: string,
  platformHint?: string,
): Promise<IncomeSubmission> {
  // 1. Read file as blob
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';

  // 2. Generate unique storage path
  const timestamp = Date.now();
  const storagePath = `${userId}/${timestamp}.${ext}`;

  // 3. Upload to Supabase Storage (screenshots bucket — private)
  const { error: uploadError } = await supabase
    .storage
    .from('screenshots')
    .upload(storagePath, blob, {
      contentType: blob.type,
      upsert: false,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // 4. Call parse-screenshot Edge Function with Clerk JWT
  const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/parse-screenshot`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${clerkToken}`,
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      storage_path: storagePath,
      user_id: userId,
      platform_hint: platformHint,
    }),
  });

  if (!parseResponse.ok) {
    const err = await parseResponse.json();
    throw new Error(err.error ?? `Parse failed: ${parseResponse.status}`);
  }

  const result = await parseResponse.json();
  return result as IncomeSubmission;
}
