#!/bin/bash

# Auto-Restart Enhanced Analysis Batch Processing
# This script automatically restarts the batch processing if it crashes

LOG_FILE="batch-progress.log"
RESTART_COUNT=0
MAX_RESTARTS=10

echo "🔄 Auto-Restart Batch Processing Starting..."
echo "📊 Log file: $LOG_FILE"
echo "🔁 Max restarts: $MAX_RESTARTS"
echo ""

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
    echo "🚀 Starting batch processing (attempt $((RESTART_COUNT + 1))/$MAX_RESTARTS)..."
    echo "⏰ Started at: $(date)"

    # Run the batch script
    node --env-file=.env.local scripts/batch-enhanced-analysis-haiku-optimized.js 2>&1 | tee -a "$LOG_FILE"

    # Check exit code
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Batch processing completed successfully!"
        break
    else
        RESTART_COUNT=$((RESTART_COUNT + 1))
        echo "❌ Batch processing crashed (exit code: $EXIT_CODE)"
        echo "🔄 Restarting in 10 seconds... (attempt $RESTART_COUNT/$MAX_RESTARTS)"

        if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
            sleep 10
        fi
    fi
done

if [ $RESTART_COUNT -eq $MAX_RESTARTS ]; then
    echo "⚠️  Maximum restarts reached ($MAX_RESTARTS). Manual intervention required."
    exit 1
fi

echo "🎉 Auto-restart batch processing completed!"