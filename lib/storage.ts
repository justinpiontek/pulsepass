import { getSupabasePublicEnv } from "@/lib/env";

export const PROFILE_PHOTO_BUCKET = "profile-photos";

export function getPublicStorageUrl(bucket: string, path: string) {
  const env = getSupabasePublicEnv();
  return new URL(`/storage/v1/object/public/${bucket}/${path}`, env.NEXT_PUBLIC_SUPABASE_URL).toString();
}

export function getProfilePhotoUrl(path?: string | null) {
  if (!path) {
    return null;
  }

  return getPublicStorageUrl(PROFILE_PHOTO_BUCKET, path);
}
