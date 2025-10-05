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

async function downloadBatchResults() {
  try {
    const batchId = 'msgbatch_01Mb3K1X77iq3ggc1sGaj3Cb';
    console.log(`📥 Downloading results for batch: ${batchId}`);

    // Get batch info
    const batch = await anthropic.beta.messages.batches.retrieve(batchId);
    console.log(`📊 Found ${batch.request_counts.succeeded} successful results`);

    // Download results
    const results = await anthropic.beta.messages.batches.results(batchId);

    console.log(`✅ Downloaded batch results`);

    // Convert stream to string
    let resultsContent = '';
    for await (const chunk of results) {
      resultsContent += chunk;
    }

    // Save results to file
    const filename = `batch-results-${batchId}.jsonl`;
    writeFileSync(filename, resultsContent);

    console.log(`💾 Saved results to: ${filename}`);

    // Parse and preview first few results
    const lines = resultsContent.trim().split('\n');
    console.log(`📄 Total result lines: ${lines.length}`);

    if (lines.length > 0) {
      console.log('\n--- PREVIEW OF FIRST RESULT ---');
      try {
        const firstResult = JSON.parse(lines[0]);
        console.log('Result type:', firstResult.result?.type);
        console.log('Custom ID:', firstResult.custom_id);

        if (firstResult.result?.message?.content) {
          const content = firstResult.result.message.content[0].text;
          console.log('Content preview:', content.substring(0, 200) + '...');
        }
      } catch (e) {
        console.log('First line:', lines[0].substring(0, 200) + '...');
      }
    }

  } catch (error) {
    console.error('❌ Error downloading batch results:', error.message);
    if (error.status === 404) {
      console.log('🗑️ Batch results no longer available');
    }
  }
}

downloadBatchResults();