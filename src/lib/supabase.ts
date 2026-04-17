// Re-export the canonical Supabase client to avoid duplicate instances.
// Always use this one — it has persistSession and autoRefreshToken enabled.
export { supabase } from '../integrations/supabase/client';
