// Custom HTTPS Supabase Client for Railway
// Evidence: undici IPv4 Agent failed, need to bypass undici entirely
// Solution: Use Node.js native https module

import { createClient } from '@supabase/supabase-js';
import https from 'https';
import { URL } from 'url';

/**
 * Creates a Supabase client with custom HTTPS implementation
 * Bypasses undici completely using Node.js native https module
 */
export function createSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Custom fetch implementation using Node.js https module
  const customFetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        const requestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: options.method || 'GET',
          family: 4, // Force IPv4 at the Node.js level
          headers: {
            'Host': parsedUrl.hostname,
            'User-Agent': 'MovieGenius-Railway-Custom/1.0.0',
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
              headers: new Map(Object.entries(res.headers || {})),
              json: async () => JSON.parse(data),
              text: async () => data,
            };
            resolve(response);
          });
        });

        req.on('error', (error) => {
          console.error('Custom HTTPS request error:', error.message);
          reject(error);
        });

        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        if (options.body) {
          req.write(options.body);
        }
        
        req.end();
      } catch (error) {
        console.error('Custom HTTPS setup error:', error.message);
        reject(error);
      }
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
        fetch: customFetch,
        headers: { 
          'x-my-custom-header': 'moviegenius-railway-custom-https' 
        } 
      }
    }
  );
}

// Default export for convenience  
export default createSupabaseClient;