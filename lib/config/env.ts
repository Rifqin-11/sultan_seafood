export function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("placeholder") || anonKey === "placeholder-key") {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return { url, anonKey };
}
