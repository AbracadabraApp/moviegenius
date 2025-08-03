// Supabase Client with Railway Production Configuration
// Based on TROUBLESHOOTING.md recommended configuration

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with Railway-optimized configuration
 * Using configuration from troubleshooting guide (line 354-359)
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Use troubleshooting guide configuration for Railway production
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { 
        schema: 'public' 
      },
      auth: { 
        persistSession: false 
      },
      global: { 
        headers: { 
          'x-my-custom-header': 'moviegenius-railway' 
        } 
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;