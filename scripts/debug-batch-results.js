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

async function debugResults() {
  try {
    const batchInfo = JSON.parse(readFileSync('./batch-info.json', 'utf8'));
    console.log(`🔍 Debugging batch results: ${batchInfo.id}`);
    
    const results = await anthropic.beta.messages.batches.results(batchInfo.id);
    
    console.log('Type of results:', typeof results);
    console.log('Results is array:', Array.isArray(results));
    console.log('Results keys:', Object.keys(results || {}));
    console.log('Results length/size:', results?.length || 'no length property');
    
    if (results && results.data) {
      console.log('Results has data property, length:', results.data.length);
      console.log('First result sample:', results.data[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugResults();