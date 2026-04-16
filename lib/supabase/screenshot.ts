import { supabase } from "./client";

const BUCKET = "trade-screenshots";

/** Upload screenshot to storage + update trade record. Returns the storage path. */
export async function uploadTradeScreenshot(
  userId: string,
  tradeId: string,
  file: File
): Promise<string> {
  const ext = file.type === "image/png" ? "png" : "jpg";
  const path = `${userId}/${tradeId}.${ext}`;

  // Remove existing file if any (upsert)
  await supabase.storage.from(BUCKET).remove([path]);

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { error: dbErr } = await supabase
    .from("journal_trades")
    .update({ screenshot_path: path })
    .eq("id", tradeId);

  if (dbErr) throw new Error(`DB update failed: ${dbErr.message}`);

  return path;
}

/** Delete screenshot from storage + clear trade record. */
export async function deleteTradeScreenshot(
  userId: string,
  tradeId: string,
  currentPath: string
): Promise<void> {
  await supabase.storage.from(BUCKET).remove([currentPath]);

  await supabase
    .from("journal_trades")
    .update({ screenshot_path: null })
    .eq("id", tradeId);
}

/** Get signed URL (1h TTL). Returns null on error. */
export async function getScreenshotUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
