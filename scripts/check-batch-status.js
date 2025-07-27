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

async function checkBatchStatus() {
  try {
    const batchInfo = JSON.parse(readFileSync('./batch-info.json', 'utf8'));
    console.log(`🔍 Checking batch status: ${batchInfo.id}`);
    
    const batch = await anthropic.beta.messages.batches.retrieve(batchInfo.id);
    
    console.log(`📊 Status: ${batch.processing_status}`);
    console.log(`📊 Request counts:`, batch.request_counts);
    
    if (batch.processing_status === 'ended') {
      console.log('✅ Batch ended - ready to process results!');
    } else if (batch.processing_status === 'completed') {
      console.log('✅ Batch completed - ready to process results!');
    } else if (batch.processing_status === 'failed') {
      console.log('❌ Batch failed');
      if (batch.errors) {
        console.log('Errors:', batch.errors);
      }
    } else {
      console.log(`⏳ Still processing: ${batch.processing_status}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking batch:', error.message);
  }
}

checkBatchStatus();