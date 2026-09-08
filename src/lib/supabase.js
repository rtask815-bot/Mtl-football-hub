import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
        "[v0] Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
}

// Single shared browser client (singleton) for the whole app.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
