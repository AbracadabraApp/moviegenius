// Simple Supabase Client - Direct Connection Pattern
// Uses standard Supabase client without custom networking

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using direct connection pattern
 * Same approach that worked successfully 30 days ago
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Use simple, proven direct connection approach
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false, // Server-side optimization
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;