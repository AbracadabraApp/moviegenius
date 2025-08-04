#!/usr/bin/env node

/**
 * Predictive Cache Warming Script
 *
 * Pre-generates responses for common film questions to enable instant responses.
 * Run this script during deployment or low-traffic periods.
 */

import { startPredictiveCacheWarming, getPredictiveCacheManager } from '../lib/predictive-cache.js';

async function main() {
  console.log('🚀 Starting predictive cache warming for Ask system...');
  console.log('This will pre-generate responses for common film questions.\n');

  const manager = getPredictiveCacheManager();

  try {
    // Start warming process
    await startPredictiveCacheWarming();

    // Monitor progress
    const checkProgress = setInterval(() => {
      const status = manager.getWarmingStatus();

      if (status.isWarming) {
        console.log(
          `⏳ Progress: ${status.progress.toFixed(1)}% (${status.commonQuestionsCached} total questions)`
        );
      } else {
        console.log('✅ Predictive cache warming completed!');
        console.log('🚀 Common questions will now have instant responses.');
        clearInterval(checkProgress);
        process.exit(0);
      }
    }, 2000);

    // Timeout after 10 minutes
    setTimeout(
      () => {
        console.log('⏰ Warming process timed out after 10 minutes');
        clearInterval(checkProgress);
        process.exit(1);
      },
      10 * 60 * 1000
    );
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
