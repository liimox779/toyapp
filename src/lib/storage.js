import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const BUCKET = 'product-images';

// We only use Storage (no Realtime features), but supabase-js still
// constructs a Realtime client internally and needs a WebSocket
// implementation to do so — Node's global WebSocket isn't available
// until v22, and we're pinned to v20 for Prisma compatibility.
const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
        realtime: { transport: WebSocket },
      })
    : null;

// Uploads a file buffer to Supabase Storage and returns its public URL.
export async function uploadToStorage(filename, buffer, contentType) {
  if (!supabase) {
    throw new Error('Supabase Storage is not configured (missing SUPABASE_URL / SUPABASE_SECRET_KEY)');
  }

  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

// Deletes a file from Supabase Storage given its public URL (no-op if the
// URL doesn't point into our bucket, e.g. legacy /images/... paths).
export async function deleteFromStorage(publicUrl) {
  if (!supabase || !publicUrl) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

export const isStorageConfigured = !!supabase;
