import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (!adminClient) {
    const env = getSupabasePublicEnv();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return adminClient;
}
