import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { lazy } from "@/lib/lazy";

const globalForSupabase = globalThis as unknown as { supabase?: SupabaseClient };

function createStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — copy .env.example to .env and fill them in."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabase: SupabaseClient = lazy(() => {
  globalForSupabase.supabase ??= createStorageClient();
  return globalForSupabase.supabase;
});

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "documents";

/** Uploads a document into the private bucket. Path convention: {firmId}/{matterId}/{documentId}/{fileName} */
export async function uploadDocumentFile(
  storagePath: string,
  file: Buffer | Uint8Array,
  contentType: string
) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

/**
 * Short-lived URL the browser can PUT a file to directly.
 *
 * Routing the bytes around the server is not an optimisation — a Vercel
 * serverless function caps request bodies at 4.5 MB (and Next.js caps server
 * actions at 1 MB by default), so a real PDF cannot physically reach the
 * server action. The browser uploads straight to Supabase and the server only
 * ever handles the resulting storage path.
 *
 * The service-role key never leaves the server; the returned URL is scoped to
 * this one path and expires.
 */
export async function createDocumentUploadUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    throw new Error(
      `Could not create upload URL: ${error?.message ?? "no data"}`
    );
  }
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

/** Confirms an object actually exists at the path before ingesting it. */
export async function documentFileExists(storagePath: string): Promise<boolean> {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = storagePath.slice(0, lastSlash);
  const name = storagePath.slice(lastSlash + 1);
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { search: name, limit: 1 });
  if (error) return false;
  return (data ?? []).some((item) => item.name === name);
}

export async function downloadDocumentFile(storagePath: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Signed URL for temporary read access (e.g. viewing a source document). */
export async function getDocumentSignedUrl(storagePath: string, expiresInSeconds = 600) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) {
    throw new Error(`Could not create signed URL: ${error?.message ?? "no data"}`);
  }
  return data.signedUrl;
}
