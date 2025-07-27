#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.local') });

console.log('🔍 Debugging Anthropic client initialization...');
console.log('');

console.log('Environment variables:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET (length: ' + process.env.ANTHROPIC_API_KEY.length + ')' : 'MISSING');
console.log('');

try {
  console.log('Testing Anthropic import...');
  const { Anthropic } = await import('@anthropic-ai/sdk');
  console.log('✅ Anthropic imported successfully');
  
  console.log('Testing Anthropic client creation...');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✅ Anthropic client created successfully');
  
  console.log('Testing client properties...');
  console.log('anthropic:', typeof anthropic);
  console.log('anthropic.batches:', typeof anthropic.batches);
  console.log('anthropic.batches.create:', typeof anthropic.batches?.create);
  
  if (anthropic.batches?.create) {
    console.log('✅ All anthropic client properties accessible');
  } else {
    console.log('❌ anthropic.batches.create is not accessible');
  }
  
} catch (error) {
  console.error('❌ Error during Anthropic setup:', error);
}