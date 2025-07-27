#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🔍 Debugging batch API methods...');

try {
  console.log('anthropic.beta:', typeof anthropic.beta);
  console.log('anthropic.beta.messages:', typeof anthropic.beta.messages);
  console.log('anthropic.beta.messages.batches:', typeof anthropic.beta.messages.batches);
  
  const batchObj = anthropic.beta.messages.batches;
  console.log('\nAvailable methods on anthropic.beta.messages.batches:');
  Object.getOwnPropertyNames(Object.getPrototypeOf(batchObj)).forEach(method => {
    if (typeof batchObj[method] === 'function') {
      console.log(`- ${method}()`);
    }
  });
  
} catch (error) {
  console.error('Error:', error);
}