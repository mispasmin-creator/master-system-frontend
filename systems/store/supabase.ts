import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Supabase has been removed from the store app — all data now goes through the backend API.
// This file is kept only because tsconfig maps @/supabase here.
// The env vars are commented out in .env so this client is intentionally inert.
if (typeof window !== 'undefined' && (!SUPABASE_URL || !SUPABASE_KEY)) {
    console.warn('[store] Supabase client is inert — env vars not set. This is expected after migration.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export const supabaseEnabled = !!SUPABASE_URL && !!SUPABASE_KEY;
