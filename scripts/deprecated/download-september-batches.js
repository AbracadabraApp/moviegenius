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

// September batch IDs from batch-results.json
const septemberBatchIds = [
  'msgbatch_01Mb3K1X77iq3ggc1sGaj3Cb',
  'msgbatch_01LqmNT6wXoUagRtmmLXXvzf',
  'msgbatch_011zvcRxTxgTtcikctZoNm1f',
  'msgbatch_01X1ZLnfDAcC1A3u4xYCp1PV',
  'msgbatch_01RkgtJr3xR7dtVYekBartDs'
];

async function downloadAllSeptemberBatches() {
  console.log(`📥 Starting download of ${septemberBatchIds.length} September batches...`);

  let totalDownloaded = 0;
  let successfulBatches = 0;

  for (let i = 0; i < septemberBatchIds.length; i++) {
    const batchId = septemberBatchIds[i];
    const filename = `batch-results-${batchId}.jsonl`;

    console.log(`\n[${i + 1}/${septemberBatchIds.length}] Processing: ${batchId}`);

    // Skip if already downloaded
    if (existsSync(filename)) {
      console.log(`  ⏭️ Already exists: ${filename}`);
      continue;
    }

    try {
      // Get batch info
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      const successCount = batch.request_counts?.succeeded || 0;

      console.log(`  📊 Status: ${batch.processing_status}`);
      console.log(`  📊 Successful results: ${successCount}`);

      if (batch.processing_status !== 'ended' || successCount === 0) {
        console.log(`  ❌ No results available`);
        continue;
      }

      // Download results
      console.log(`  📥 Downloading results...`);
      const results = await anthropic.beta.messages.batches.results(batchId);

      // Convert stream to string
      let resultsContent = '';
      for await (const chunk of results) {
        resultsContent += chunk;
      }

      // Save results to file
      writeFileSync(filename, resultsContent);

      const lines = resultsContent.trim().split('\n').length;
      totalDownloaded += lines;
      successfulBatches++;

      console.log(`  ✅ Saved ${lines} analyses to: ${filename}`);

      // Small delay to be respectful to API
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ❌ Error with batch ${batchId}:`, error.message);
    }
  }

  console.log(`\n🎉 DOWNLOAD COMPLETE`);
  console.log(`📊 Successfully downloaded: ${successfulBatches}/${septemberBatchIds.length} batches`);
  console.log(`📄 Total analyses recovered: ${totalDownloaded}`);
  console.log(`💰 Cost savings: $${(totalDownloaded * 0.002).toFixed(2)} (vs regenerating)`);
}

downloadAllSeptemberBatches();