// Shared Supabase Client with IPv4-only fetch for Railway compatibility
// Fixes "TypeError: fetch failed" in production due to Railway's lack of IPv6 support

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';

/**
 * Creates a Supabase client with IPv4-only networking
 * Prevents IPv6 connection attempts that fail on Railway hosting
 */
export function createSupabaseClient() {
  // Create IPv4-only agents for HTTP and HTTPS
  const httpsAgent = new https.Agent({
    family: 4  // Force IPv4 only
  });
  
  const httpAgent = new http.Agent({
    family: 4  // Force IPv4 only
  });

  // Custom fetch that forces IPv4 connections using Node.js agents
  const customFetch = async (url, options = {}) => {
    const isHttps = url.startsWith('https://');
    
    return fetch(url, {
      ...options,
      agent: isHttps ? httpsAgent : httpAgent
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