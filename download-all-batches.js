#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '.env.local') });

import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function downloadAllBatches() {
  console.log('📥 Loading batch IDs from batch-progress.json...');

  // Read all batch IDs from batch-progress.json
  const batchData = JSON.parse(fs.readFileSync('batch-progress.json', 'utf8'));
  const batchIds = batchData.map(r => r.id);

  console.log(`📊 Found ${batchIds.length} batch IDs to download`);
  console.log('📥 Starting batch downloads...\n');

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < batchIds.length; i++) {
    const batchId = batchIds[i];
    const filename = `batch-results-${batchId}.jsonl`;

    console.log(`[${i + 1}/${batchIds.length}] ${batchId}`);

    // Skip if already exists
    if (existsSync(filename)) {
      console.log('  ⏭️ Already exists');
      skipped++;
      continue;
    }

    try {
      // Download results using Anthropic SDK
      const results = await anthropic.beta.messages.batches.results(batchId);

      // Convert stream to string
      let resultsContent = '';
      for await (const chunk of results) {
        resultsContent += JSON.stringify(chunk) + '\n';
      }

      // Save to file
      writeFileSync(filename, resultsContent);

      // Count lines
      const lines = resultsContent.trim().split('\n').length;
      console.log(`  ✅ Downloaded ${lines} results`);
      downloaded++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      errors++;
    }

    // Progress update every 50 batches
    if ((i + 1) % 50 === 0) {
      console.log(`\n--- PROGRESS: ${i + 1}/${batchIds.length} ---`);
      console.log(`Downloaded: ${downloaded}, Skipped: ${skipped}, Errors: ${errors}\n`);
    }
  }

  console.log(`\n🎉 DOWNLOAD COMPLETE`);
  console.log(`📊 Downloaded: ${downloaded}`);
  console.log(`📊 Skipped: ${skipped}`);
  console.log(`📊 Errors: ${errors}`);
  console.log(`📊 Total: ${downloaded + skipped + errors}/${batchIds.length}`);
}

// Fix import issue
import fs from 'fs';

downloadAllBatches()
  .then(() => {
    console.log('\n✅ All batches processed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Download failed:', error.message);
    process.exit(1);
  });