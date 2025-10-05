require('dotenv').config({path:'.env.local'});
const { Anthropic } = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({apiKey: process.env.ANTHROPIC_API_KEY});

const batchIds = [
  'msgbatch_01Mb3K1X77iq3ggc1sGaj3Cb',
  'msgbatch_01LqmNT6wXoUagRtmmLXXvzf',
  'msgbatch_011zvcRxTxgTtcikctZoNm1f',
  'msgbatch_01X1ZLnfDAcC1A3u4xYCp1PV',
  'msgbatch_01RkgtJr3xR7dtVYekBartDs'
];

async function testBatchSample() {
  console.log('Testing 5 September batch IDs...\n');

  let accessible = 0;
  let totalSuccessful = 0;

  for (const batchId of batchIds) {
    console.log(`Testing: ${batchId}`);
    try {
      const batch = await anthropic.beta.messages.batches.retrieve(batchId);
      const successCount = batch.request_counts?.succeeded || 0;

      console.log(`  Status: ${batch.processing_status}`);
      console.log(`  Successful results: ${successCount}`);
      console.log(`  Created: ${batch.created_at}`);

      if (batch.processing_status === 'ended' && successCount > 0) {
        accessible++;
        totalSuccessful += successCount;
        console.log('  ✅ Results available for download');
      } else {
        console.log('  ❌ No downloadable results');
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
    console.log('---');
  }

  console.log(`\nSUMMARY:`);
  console.log(`Accessible batches: ${accessible}/5`);
  console.log(`Total recoverable analyses: ${totalSuccessful}`);
  console.log(`Average per batch: ${totalSuccessful/accessible || 0}`);
}

testBatchSample();