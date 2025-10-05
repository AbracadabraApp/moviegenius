#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function downloadBatchTest() {
  const batchId = 'msgbatch_01LqmNT6wXoUagRtmmLXXvzf';
  console.log(`📥 Testing proper download for: ${batchId}`);

  try {
    // Get batch info first
    const batch = await anthropic.beta.messages.batches.retrieve(batchId);
    console.log(`📊 Status: ${batch.processing_status}`);
    console.log(`📊 Results: ${batch.request_counts?.succeeded}`);
    console.log(`📊 Results URL: ${batch.results_url}`);

    // Download results properly
    const results = await anthropic.beta.messages.batches.results(batchId);

    console.log('📥 Downloading stream...');
    console.log('Results type:', typeof results);
    console.log('Results:', results);

    // Convert async iterator properly
    const chunks = [];
    for await (const chunk of results) {
      chunks.push(chunk);
    }

    console.log(`📄 Received ${chunks.length} chunks`);
    console.log('First chunk type:', typeof chunks[0]);
    console.log('First chunk keys:', Object.keys(chunks[0] || {}));

    // Handle JSONL objects properly
    const fullContent = chunks.map(chunk => JSON.stringify(chunk)).join('\n');
    console.log(`📄 Total content length: ${fullContent.length}`);

    // Save raw content
    const filename = `batch-test-${batchId}.jsonl`;
    writeFileSync(filename, fullContent);
    console.log(`💾 Saved to: ${filename}`);

    // Parse and count
    const lines = fullContent.trim().split('\n');
    console.log(`📄 JSONL lines: ${lines.length}`);

    if (lines.length > 0) {
      try {
        const firstResult = JSON.parse(lines[0]);
        console.log('✅ First result structure:');
        console.log('- custom_id:', firstResult.custom_id);
        console.log('- result.type:', firstResult.result?.type);
        console.log('- has message:', !!firstResult.result?.message);
        console.log('- content length:', firstResult.result?.message?.content?.[0]?.text?.length);
      } catch (e) {
        console.log('❌ Parse error:', e.message);
        console.log('First line raw:', lines[0]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

downloadBatchTest();