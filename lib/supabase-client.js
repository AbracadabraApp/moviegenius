// Shared Supabase Client with IPv4-only fetch for Railway compatibility
// Fixes "TypeError: fetch failed" in production due to Railway's lack of IPv6 support

import { createClient } from '@supabase/supabase-js';
import { Agent } from 'undici';

/**
 * Creates a Supabase client with IPv4-only networking
 * Prevents IPv6 connection attempts that fail on Railway hosting
 */
export function createSupabaseClient() {
  // Custom fetch that forces IPv4 connections only
  const customFetch = (url, options = {}) => fetch(url, {
    ...options,
    dispatcher: new Agent({ 
      connect: { 
        family: 4  // Force IPv4 only - bypass Railway IPv6 limitation
      } 
    })
  });

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { 
      global: { 
        fetch: customFetch 
      } 
    }
  );
}

// Default export for convenience
export default createSupabaseClient;