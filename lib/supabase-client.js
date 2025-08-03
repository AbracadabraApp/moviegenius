// Railway-Compatible Supabase Client
// Uses Node.js https module to bypass Railway's undici networking issues

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { URL } from 'url';

/**
 * Creates a Supabase client compatible with Railway's production environment
 * Bypasses undici by using Node.js native https module
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Railway production environment needs to bypass undici entirely
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Create a custom fetch implementation using Node.js https module
    const customFetch = async (url, options = {}) => {
      return new Promise((resolve, reject) => {
        try {
          const parsedUrl = new URL(url);
          const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: {
              'Host': parsedUrl.hostname,
              'User-Agent': 'MovieGenius-Railway/1.0.0',
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...options.headers,
            },
          };

          const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              // Create a fetch-like response object
              const response = {
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                statusText: res.statusMessage,
                headers: new Map(Object.entries(res.headers)),
                json: async () => JSON.parse(data),
                text: async () => data,
              };
              resolve(response);
            });
          });

          req.on('error', (error) => {
            console.error('Railway HTTPS request error:', error.message);
            reject(error);
          });

          if (options.body) {
            req.write(options.body);
          }
          
          req.end();
        } catch (error) {
          console.error('Railway HTTPS setup error:', error.message);
          reject(error);
        }
      });
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