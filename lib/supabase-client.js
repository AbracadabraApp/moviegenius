// IPv4-Only Supabase Client for Railway
// Evidence: "TypeError: fetch failed" in undici confirms networking issue
// Solution: Force IPv4 connections to bypass Railway IPv6 limitations

import { createClient } from '@supabase/supabase-js';
import { Agent } from 'undici';

/**
 * Creates a Supabase client with IPv4-only networking
 * Evidence-based fix for confirmed Railway undici fetch failures
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Custom fetch with IPv4-only undici Agent
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
      db: { 
        schema: 'public' 
      },
      auth: { 
        persistSession: false 
      },
      global: { 
        fetch: customFetch,
        headers: { 
          'x-my-custom-header': 'moviegenius-railway-ipv4' 
        } 
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;