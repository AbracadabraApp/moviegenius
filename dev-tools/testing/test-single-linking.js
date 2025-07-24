#!/usr/bin/env node

import fs from 'fs';

// Load environment variables from .env.local
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
    console.log('✅ Environment variables loaded');
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
  }
}

loadEnvFile();

// Import and test
const { testMovieAnalysisLinking } = await import('./lib/movie-analysis-linker.js');

// Test content from file 1040 (The Leopard)
const testContent = `**The Leopard** (1963) stands as Luchino Visconti's masterful adaptation of Giuseppe Tomasi di Lampedusa's novel, capturing Sicily's aristocratic decline with breathtaking 70mm cinematography. Burt Lancaster delivers a commanding performance as Prince Don Fabrizio Salina, embodying the fading nobility with dignified resignation. The film's legendary 45-minute ballroom sequence rivals the opulence of **La Grande Illusion** (1937) and foreshadows the decadent decline portrayed in **The Garden of the Finzi-Continis** (1970). Visconti's attention to period detail and social commentary influenced later historical epics like **Barry Lyndon** (1975) and **The Age of Innocence** (1993).`;

console.log('🧪 Testing movie analysis linking on The Leopard content...\n');
await testMovieAnalysisLinking(testContent, 'The Leopard');
