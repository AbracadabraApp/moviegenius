#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function debugIterator() {
  try {
    const batchInfo = JSON.parse(readFileSync('./batch-info.json', 'utf8'));
    console.log(`🔍 Testing batch results iterator: ${batchInfo.id}`);
    
    const results = await anthropic.beta.messages.batches.results(batchInfo.id);
    
    console.log('Results type:', typeof results);
    console.log('Has Symbol.asyncIterator:', typeof results[Symbol.asyncIterator]);
    
    console.log('\n🔄 Testing iteration (first 3 results):');
    let count = 0;
    
    for await (const result of results) {
      count++;
      console.log(`Result ${count}:`);
      console.log(`- custom_id: ${result.custom_id}`);
      console.log(`- result type: ${result.result?.type}`);
      
      if (count >= 3) {
        break;
      }
    }
    
    console.log(`\n✅ Iterator works! Processed ${count} results.`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugIterator();