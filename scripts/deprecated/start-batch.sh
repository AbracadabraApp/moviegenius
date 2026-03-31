#!/bin/bash

# Enhanced Analysis Batch Processing Starter
# This script runs the batch processing and logs everything to a file you can tail

echo "🎬 Starting Enhanced Analysis Batch Processing..."
echo "📊 Log file: batch-progress.log"
echo "👀 To monitor: tail -f batch-progress.log"
echo ""

# Run the batch script with full logging
node --env-file=.env.local scripts/batch-enhanced-analysis-haiku-optimized.js 2>&1 | tee batch-progress.log