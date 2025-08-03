// Simple Supabase Client - No Custom Networking
// Use standard Supabase client with minimal configuration

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with standard configuration
 * No custom networking to avoid webpack issues
 */
export function createSupabaseClient() {
  console.log('DEBUG: Supabase client creation');
  console.log('DEBUG: NEXT_PUBLIC_SUPABASE_URL =', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY length =', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { 
        schema: 'public' 
      },
      auth: { 
        persistSession: false 
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;