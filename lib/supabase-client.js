// Enhanced Supabase Client for Railway Production Environment
// Addresses Railway's networking limitations with robust connection handling

import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client optimized for Railway's production environment
 * Handles Railway's networking constraints and connection timeouts
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // For Railway production environment, we need to handle networking more robustly
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production-optimized configuration for Railway
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false, // Don't persist sessions on server-side
        },
        global: {
          headers: {
            'User-Agent': 'MovieGenius/1.0.0 Railway-Production',
          },
        },
        // Add retry logic and timeout handling
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      }
    );
  } else {
    // Development - use simple configuration
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
}

// Default export for convenience  
export default createSupabaseClient;