#!/usr/bin/env node

/**
 * Demo Status and Configuration Script
 * 
 * Quick status check and configuration management for demo mode
 */

import { getDemoStatus, getDemoConfig, getDemoSafetyMonitor } from '../lib/demo-config.js';

function displayDemoStatus() {
  const status = getDemoStatus();
  const config = getDemoConfig();
  
  console.log('🎯 MovieGenius Demo Mode Status');
  console.log('================================');
  console.log();
  
  // Overall status
  console.log(`📊 Demo Mode: ${status.enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`🌍 Environment: ${status.environment}`);
  console.log(`🔒 Safety Monitoring: ${status.safetyMonitoring ? 'ENABLED' : 'DISABLED'}`);
  console.log();
  
  // Feature status
  console.log('🎛️ Feature Status:');
  console.log(`   • Static Generation: ${status.features.staticGeneration ? '✅' : '❌'}`);
  console.log(`   • Ultra Caching: ${status.features.ultraCaching ? '✅' : '❌'}`);
  console.log(`   • Predictive Loading: ${status.features.predictiveLoading ? '✅' : '❌'}`);
  console.log(`   • Performance Monitoring: ${status.features.monitoring ? '✅' : '❌'}`);
  console.log();
  
  if (status.enabled) {
    // Configuration details
    console.log('⚙️ Configuration:');
    console.log(`   • Pre-generate All Movies: ${config.STATIC_GENERATION.preGenerateAllMovies ? 'YES' : 'NO'}`);
    console.log(`   • Pre-generate Genius: ${config.STATIC_GENERATION.preGenerateGeniusPages ? 'YES' : 'NO'}`);
    console.log(`   • Revalidation Interval: ${config.STATIC_GENERATION.revalidationInterval}s`);
    console.log(`   • MediaCard Cache TTL: ${config.CACHING.mediaCardTTL === 0 ? 'FOREVER' : config.CACHING.mediaCardTTL + 's'}`);
    console.log(`   • Max Cache Memory: ${config.CACHING.maxCacheMemory}MB`);
    console.log(`   • Auto Rollback: ${config.MONITORING.autoRollbackEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log();
    
    // Demo paths
    console.log('🎬 Demo Content:');
    console.log(`   • Popular Movies: ${config.DEMO_PATHS.popularMovies.join(', ')}`);
    console.log(`   • Genius Pages: ${config.DEMO_PATHS.geniusPages.length} pages`);
    console.log(`   • Common Queries: ${config.DEMO_PATHS.commonQueries.length} queries`);
    console.log();
  }
  
  // Safety monitoring
  if (status.features.monitoring) {
    const safetyMonitor = getDemoSafetyMonitor();
    const safetyStatus = safetyMonitor.getSafetyStatus();
    
    console.log('🛡️ Safety Status:');
    console.log(`   • Active Alerts: ${safetyStatus.alerts.length}`);
    console.log(`   • Metrics Tracked: ${Object.keys(safetyStatus.metrics).length}`);
    
    if (safetyStatus.alerts.length > 0) {
      console.log('\n⚠️ Recent Alerts:');
      safetyStatus.alerts.slice(-3).forEach(alert => {
        console.log(`   • ${alert.type}: ${alert.data.message || JSON.stringify(alert.data)}`);
      });
    }
    console.log();
  }
  
  // Recommendations
  console.log('💡 Quick Actions:');
  if (!status.enabled) {
    console.log('   • Enable demo mode: npm run demo:enable');
    console.log('   • Copy demo config: cp .env.demo .env.local');
  } else {
    console.log('   • Measure baseline: npm run demo:baseline');
    console.log('   • Build with demo optimizations: npm run demo:build');
    console.log('   • Disable demo mode: npm run demo:disable');
  }
  console.log('   • Check this status: npm run demo:status');
  console.log();
  
  // Environment variables help
  console.log('🔧 Key Environment Variables:');
  console.log('   • DEMO_MODE=true                 - Enable demo optimizations');
  console.log('   • DEMO_PREGENERATE_ALL=true      - Pre-generate all movie pages');
  console.log('   • DEMO_ULTRA_CACHING=true        - Enable forever caching');
  console.log('   • DEMO_MEDIACARD_TTL=forever     - Never expire MediaCard cache');
  console.log('   • DEMO_AUTO_ROLLBACK=true        - Auto-rollback on performance issues');
}

// Command line argument handling
const command = process.argv[2];

switch (command) {
  case 'status':
  case undefined:
    displayDemoStatus();
    break;
    
  case 'enable':
    console.log('🎯 Enabling demo mode...');
    console.log('Copy .env.demo to .env.local and run: npm run demo:build');
    break;
    
  case 'disable':
    console.log('❌ Disabling demo mode...');
    console.log('Set DEMO_MODE=false in .env.local and run: npm run build');
    break;
    
  case 'help':
    console.log('Demo Status Commands:');
    console.log('  npm run demo:status         - Show current demo status');
    console.log('  npm run demo:baseline       - Measure performance baseline');
    console.log('  npm run demo:build          - Build with demo optimizations');
    console.log('  npm run demo:enable         - Enable demo mode');
    console.log('  npm run demo:disable        - Disable demo mode');
    break;
    
  default:
    console.error(`Unknown command: ${command}`);
    console.log('Run "npm run demo:status help" for available commands');
    process.exit(1);
}

export { displayDemoStatus };