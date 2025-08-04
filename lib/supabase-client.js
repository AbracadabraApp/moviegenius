// IPv4-Only Supabase Client for Railway IPv6 Limitation
// Forces IPv4 connections to bypass Railway's IPv6 connectivity issues

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with IPv4-only networking
 * This fixes Railway's IPv6 outbound connection limitation
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // IPv4-only fetch configuration for Railway compatibility
  const customFetch = async (url, options = {}) => {
    const { Agent } = await import('undici');
    
    const agent = new Agent({
      connect: {
        family: 4 // Force IPv4 only
      }
    });

    return fetch(url, {
      ...options,
      dispatcher: agent
    });
  };

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
        fetch: customFetch
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;