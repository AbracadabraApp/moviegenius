/**
 * Environment setup for integration tests
 * Loads the same environment variables used by the application
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local (production database)
const envPath = path.resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Verify required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for integration tests');
}

if (!process.env.NEXT_PUBLIC_TMDB_API_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_TMDB_API_KEY not set - trailer tests may fail');
}

console.log('🔧 Integration test environment loaded');
console.log('📊 Database:', process.env.DATABASE_URL ? 'Connected' : 'Missing');
console.log('🎬 TMDB API:', process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'Available' : 'Missing');