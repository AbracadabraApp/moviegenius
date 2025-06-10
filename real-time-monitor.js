// Real-Time Movie Content Generation Monitor
// Live dashboard showing script progress, logs, and performance metrics

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🔍 Real-Time Movie Content Generation Monitor');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Configuration
const CONFIG = {
  LOG_FILE: './content-generation.log',
  PROGRESS_FILE: './content-generation-progress.json',
  REFRESH_INTERVAL: 2000, // 2 seconds
  MAX_LOG_LINES: 20,
  SHOW_TIMESTAMPS: true
};

// State tracking
let lastLogPosition = 0;
let lastProgressUpdate = null;
let logLines = [];
let isRunning = true;

/**
 * Clear screen and move cursor to top
 */
function clearScreen() {
  process.stdout.write('\u001b[2J\u001b[0;0H');
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Format duration in human readable format
 */
function formatDuration(ms) {
  if (!ms) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Create progress bar visual
 */
function createProgressBar(current, total, width = 40) {
  if (total === 0) return '░'.repeat(width);
  
  const percentage = current / total;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Read and parse progress file
 */
function readProgress() {
  try {
    if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
      const content = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    // Progress file not ready yet
  }
  return null;
}

/**
 * Read new log entries
 */
function readLogUpdates() {
  try {
    if (!fs.existsSync(CONFIG.LOG_FILE)) {
      return [];
    }
    
    const stats = fs.statSync(CONFIG.LOG_FILE);
    if (stats.size <= lastLogPosition) {
      return [];
    }
    
    const stream = fs.createReadStream(CONFIG.LOG_FILE, {
      start: lastLogPosition,
      encoding: 'utf8'
    });
    
    let data = '';
    stream.on('data', chunk => {
      data += chunk;
    });
    
    return new Promise((resolve) => {
      stream.on('end', () => {
        lastLogPosition = stats.size;
        const newLines = data.split('\n').filter(line => line.trim());
        resolve(newLines);
      });
    });
    
  } catch (error) {
    return [];
  }
}

/**
 * Display real-time dashboard
 */
function displayDashboard(progress, recentLogs) {
  clearScreen();
  
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  
  console.log('🔍 Real-Time Movie Content Generation Monitor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📅 ${now.toLocaleDateString()} ${timestamp} | 🔄 Auto-refresh every ${CONFIG.REFRESH_INTERVAL/1000}s`);
  
  if (progress) {
    const elapsed = progress.startTime ? Date.now() - new Date(progress.startTime).getTime() : 0;
    const rate = elapsed > 0 ? progress.completed / (elapsed / 1000) : 0;
    const eta = progress.total > progress.completed ? (progress.total - progress.completed) / rate * 1000 : 0;
    const percent = progress.total > 0 ? (progress.completed / progress.total * 100).toFixed(1) : '0.0';
    
    console.log('\n┌─────────────────────── 📊 LIVE PROGRESS ───────────────────────┐');
    console.log('│                                                                │');
    console.log(`│  📈 Progress: ${progress.completed}/${progress.total} (${percent}%)`.padEnd(65) + '│');
    console.log(`│  ${createProgressBar(progress.completed, progress.total, 50)}`.padEnd(65) + '│');
    console.log('│                                                                │');
    console.log(`│  ✅ Successful: ${progress.successful || 0}`.padEnd(65) + '│');
    console.log(`│  ❌ Failed: ${progress.failed || 0}`.padEnd(65) + '│');
    console.log(`│  🔄 Fresh Content: ${progress.fresh || 0}`.padEnd(65) + '│');
    console.log(`│  💾 Cached: ${progress.cached || 0}`.padEnd(65) + '│');
    console.log('│                                                                │');
    console.log(`│  ⏱️  Rate: ${rate.toFixed(2)} movies/sec`.padEnd(65) + '│');
    console.log(`│  🕐 Elapsed: ${formatDuration(elapsed)}`.padEnd(65) + '│');
    console.log(`│  ⏰ ETA: ${formatDuration(eta)}`.padEnd(65) + '│');
    
    if (progress.estimatedCost) {
      console.log(`│  💰 Cost: $${progress.estimatedCost.toFixed(4)}`.padEnd(65) + '│');
    }
    
    console.log('│                                                                │');
    console.log('└────────────────────────────────────────────────────────────────┘');
    
    // Current activity
    if (progress.currentActivity) {
      console.log(`\n🔄 Current: ${progress.currentActivity}`);
    }
    
  } else {
    console.log('\n📊 Waiting for progress data...');
    console.log('   Make sure the content generator script is running');
  }
  
  // Recent activity log
  console.log('\n┌─────────────────────── 📝 RECENT ACTIVITY ─────────────────────┐');
  
  if (recentLogs && recentLogs.length > 0) {
    const displayLogs = recentLogs.slice(-CONFIG.MAX_LOG_LINES);
    displayLogs.forEach((line, index) => {
      if (line.trim()) {
        const truncated = line.length > 62 ? line.substring(0, 59) + '...' : line;
        console.log(`│ ${truncated}`.padEnd(65) + '│');
      }
    });
    
    // Fill empty space
    for (let i = displayLogs.length; i < Math.min(CONFIG.MAX_LOG_LINES, 10); i++) {
      console.log('│'.padEnd(65) + '│');
    }
  } else {
    console.log('│ No recent activity...'.padEnd(65) + '│');
    for (let i = 1; i < 10; i++) {
      console.log('│'.padEnd(65) + '│');
    }
  }
  
  console.log('└────────────────────────────────────────────────────────────────┘');
  
  // Performance metrics
  if (progress && progress.completed > 0) {
    const successRate = ((progress.successful / progress.completed) * 100).toFixed(1);
    const avgTime = progress.results ? 
      progress.results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / progress.results.length : 0;
    
    console.log('\n📈 Performance Metrics:');
    console.log(`   Success Rate: ${successRate}% | Avg Response Time: ${avgTime.toFixed(0)}ms`);
  }
  
  // Controls
  console.log('\n🎮 Controls: [Ctrl+C] Stop monitoring | [R] Refresh now | [L] Show full logs');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Monitor loop
 */
async function monitorLoop() {
  while (isRunning) {
    try {
      // Read latest progress
      const progress = readProgress();
      
      // Read new log entries
      const newLogs = await readLogUpdates();
      if (newLogs.length > 0) {
        logLines.push(...newLogs);
        // Keep only recent logs
        if (logLines.length > CONFIG.MAX_LOG_LINES * 2) {
          logLines = logLines.slice(-CONFIG.MAX_LOG_LINES);
        }
      }
      
      // Update display
      displayDashboard(progress, logLines);
      
      // Check if script has completed
      if (progress && progress.completed >= progress.total) {
        console.log('\n🎉 Content generation completed!');
        console.log('Press any key to exit...');
        break;
      }
      
    } catch (error) {
      console.error('Monitor error:', error.message);
    }
    
    // Wait before next refresh
    await new Promise(resolve => setTimeout(resolve, CONFIG.REFRESH_INTERVAL));
  }
}

/**
 * Handle keyboard input
 */
function setupKeyboardHandlers() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const keyStr = key.toString();
    
    if (keyStr === '\u0003') { // Ctrl+C
      console.log('\n👋 Monitoring stopped');
      process.exit(0);
    } else if (keyStr.toLowerCase() === 'r') {
      // Force refresh
      return;
    } else if (keyStr.toLowerCase() === 'l') {
      // Show full logs
      if (fs.existsSync(CONFIG.LOG_FILE)) {
        console.log('\n📝 Full logs:');
        console.log(fs.readFileSync(CONFIG.LOG_FILE, 'utf8'));
        console.log('\nPress any key to return to dashboard...');
      }
    }
  });
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting real-time monitor...');
  console.log(`📁 Progress file: ${CONFIG.PROGRESS_FILE}`);
  console.log(`📁 Log file: ${CONFIG.LOG_FILE}`);
  console.log('');
  
  // Check for existing files
  if (!fs.existsSync(CONFIG.PROGRESS_FILE) && !fs.existsSync(CONFIG.LOG_FILE)) {
    console.log('⚠️  No progress or log files found yet.');
    console.log('   Make sure the content generator script is running in another terminal.');
    console.log('');
  }
  
  setupKeyboardHandlers();
  
  console.log('⏳ Waiting for data... (press Ctrl+C to exit)');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await monitorLoop();
}

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n👋 Monitor stopped');
  process.exit(0);
});

main().catch(error => {
  console.error('Monitor failed:', error);
  process.exit(1);
});