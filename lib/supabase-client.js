// Shared Supabase Client with IPv4-only fetch for Railway compatibility
// Fixes "TypeError: fetch failed" in production due to Railway's lack of IPv6 support

import { createClient } from '@supabase/supabase-js';
import { Agent } from 'undici';

/**
 * Creates a Supabase client with IPv4-only networking
 * Prevents IPv6 connection attempts that fail on Railway hosting
 */
export function createSupabaseClient() {
  // Create IPv4-only agent
  const ipv4Agent = new Agent({ 
    connect: { 
      family: 4  // Force IPv4 only - bypass Railway IPv6 limitation
    } 
  });

  // Custom fetch that forces IPv4 connections only
  const customFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      dispatcher: ipv4Agent
    });
  };

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