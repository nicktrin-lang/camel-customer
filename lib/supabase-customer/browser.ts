import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://guhcavvpuveiovspzxmg.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGNhdnZwdXZlaW92c3B6eG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI5MTAsImV4cCI6MjA4NzU4ODkxMH0.kR82AC-w4DxGsxoOxUHej9ezhgEdx2UHqPPkzb2PxCg";

export function createCustomerBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: false,
      persistSession: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  });
}
