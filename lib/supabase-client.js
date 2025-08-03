// Absolute Minimal Supabase Client - Zero Configuration
// Remove ALL custom options to match 30-day-ago working pattern

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with absolutely no custom configuration
 * Exact same pattern that worked 30 days ago
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Zero configuration - exactly as it was 30 days ago
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Default export for convenience  
export default createSupabaseClient;