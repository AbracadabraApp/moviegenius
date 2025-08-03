// Railway-Compatible Supabase Client
// Addresses Railway's undici networking limitations with custom fetch

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client compatible with Railway's production environment
 * Uses native Node.js fetch bypass to avoid undici networking issues
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Railway production environment needs custom fetch to bypass undici issues
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Create a custom fetch function that uses different networking approach
    const customFetch = async (url, options = {}) => {
      try {
        // For Railway, we need to bypass Next.js/undici fetch and use a more basic approach
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'User-Agent': 'MovieGenius-Railway/1.0.0',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        return response;
      } catch (error) {
        console.error('Railway networking error:', error.message);
        // Retry once with different headers
        try {
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              'User-Agent': 'curl/7.68.0',
              'Accept': '*/*',
            },
          });
          return retryResponse;
        } catch (retryError) {
          console.error('Railway networking retry failed:', retryError.message);
          throw retryError;
        }
      }
    };

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
        global: {
          fetch: customFetch,
        },
      }
    );
  } else {
    // Development - use standard configuration
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
}

// Default export for convenience  
export default createSupabaseClient;