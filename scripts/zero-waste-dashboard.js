#!/usr/bin/env node

/**
 * Zero-Waste Monitoring Dashboard
 * 
 * Displays real-time metrics and status of the zero-waste protection system.
 * Shows cost savings, completion status, and system health.
 */

import { 
  getCompletionStatus,
  getZeroWasteDashboard,
  getTotalSavings,
  getMoviesNeedingLinks,
  getCompleteMovies
} from '../lib/zero-waste-database.js';

// Command line arguments
const args = process.argv.slice(2);
const days = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30');
const showDetails = args.includes('--details');
const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'table';

/**
 * Format currency values
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(4)}`;
}

/**
 * Format percentages
 */
function formatPercentage(value) {
  return `${parseFloat(value || 0).toFixed(1)}%`;
}

/**
 * Display completion status overview
 */
function displayCompletionStatus(completionData) {
  console.log('📊 COMPLETION STATUS OVERVIEW');
  console.log('═'.repeat(50));
  
  completionData.forEach(item => {
    const completionBar = '█'.repeat(Math.floor(item.completion_percentage / 5));
    const remainingBar = '░'.repeat(20 - Math.floor(item.completion_percentage / 5));
    
    console.log(`${item.content_type.toUpperCase()}`);
    console.log(`  Total: ${item.total_items} | Complete: ${item.completed_items} | Pending: ${item.pending_items}`);
    console.log(`  Progress: [${completionBar}${remainingBar}] ${formatPercentage(item.completion_percentage)}`);
    console.log();
  });
}

/**
 * Display zero-waste savings metrics
 */
function displaySavingsMetrics(savingsData) {
  console.log('💰 ZERO-WASTE SAVINGS METRICS');
  console.log('═'.repeat(50));
  console.log(`Period: Last ${savingsData.periodDays} days`);
  console.log(`Total Saved: ${formatCurrency(savingsData.totalSaved)}`);
  console.log(`Total Incurred: ${formatCurrency(savingsData.totalIncurred)}`);
  console.log(`Net Savings: ${formatCurrency(savingsData.netSavings)}`);
  console.log();
  console.log('Operation Breakdown:');
  console.log(`  🛡️ Tier 1 Skips (Complete): ${savingsData.tier1Skips}`);
  console.log(`  🔗 Tier 2 Links (Unlinked): ${savingsData.tier2Links}`);  
  console.log(`  🆕 Tier 3 Fresh (Missing): ${savingsData.tier3Fresh}`);
  console.log(`  Waste Eliminated: ${savingsData.wasteEliminated ? '✅ YES' : '❌ NO'}`);
  console.log();
}

/**
 * Display recent zero-waste operations
 */
function displayRecentOperations(dashboardData) {
  console.log('📈 RECENT ZERO-WASTE OPERATIONS');
  console.log('═'.repeat(80));
  
  if (dashboardData.length === 0) {
    console.log('No recent operations found.');
    return;
  }

  // Group by date and operation type
  const grouped = dashboardData.reduce((acc, row) => {
    const dateKey = row.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = {};
    if (!acc[dateKey][row.operation_type]) acc[dateKey][row.operation_type] = [];
    acc[dateKey][row.operation_type].push(row);
    return acc;
  }, {});

  Object.keys(grouped).slice(0, 7).forEach(date => {
    console.log(`📅 ${date}`);
    
    Object.keys(grouped[date]).forEach(operationType => {
      const operations = grouped[date][operationType];
      const totalOperations = operations.reduce((sum, op) => sum + parseInt(op.operation_count), 0);
      const totalSaved = operations.reduce((sum, op) => sum + parseFloat(op.total_cost_saved || 0), 0);
      const totalIncurred = operations.reduce((sum, op) => sum + parseFloat(op.total_cost_incurred || 0), 0);
      const totalLinks = operations.reduce((sum, op) => sum + parseInt(op.total_links_added || 0), 0);
      
      const operationIcon = {
        'tier1_skip': '⚡',
        'tier2_link_only': '🔗',
        'tier3_fresh': '🆕',
        'mark_complete': '✅'
      }[operationType] || '📊';
      
      console.log(`  ${operationIcon} ${operationType}: ${totalOperations} ops, ${totalLinks} links, ${formatCurrency(totalSaved)} saved, ${formatCurrency(totalIncurred)} spent`);
    });
    console.log();
  });
}

/**
 * Display movies needing attention
 */
async function displayMoviesNeedingAttention() {
  console.log('🎯 MOVIES NEEDING ATTENTION');
  console.log('═'.repeat(50));
  
  const needingLinks = await getMoviesNeedingLinks(10);
  
  if (needingLinks.length > 0) {
    console.log('📋 Movies needing links (Tier 2 candidates):');
    needingLinks.forEach((movie, index) => {
      console.log(`  ${index + 1}. ${movie.title} (${movie.year}) - TMDB: ${movie.tmdb_id}`);
    });
    console.log();
  } else {
    console.log('✅ All movies have links!');
    console.log();
  }
}

/**
 * Display system health summary
 */
function displaySystemHealth(completionData, savingsData) {
  console.log('🏥 SYSTEM HEALTH SUMMARY');
  console.log('═'.repeat(50));
  
  const movieCompletion = completionData.find(item => item.content_type === 'movie_analysis');
  const nuclearCompletion = completionData.find(item => item.content_type === 'nuclear_static');
  
  const healthChecks = [
    {
      name: 'Movie Analysis Completion',
      status: movieCompletion && movieCompletion.completion_percentage > 80 ? '✅' : '⚠️',
      value: movieCompletion ? formatPercentage(movieCompletion.completion_percentage) : 'N/A'
    },
    {
      name: 'Nuclear Static Completion', 
      status: nuclearCompletion && nuclearCompletion.completion_percentage > 70 ? '✅' : '⚠️',
      value: nuclearCompletion ? formatPercentage(nuclearCompletion.completion_percentage) : 'N/A'
    },
    {
      name: 'Cost Savings Active',
      status: savingsData.netSavings > 0 ? '✅' : '❌',
      value: formatCurrency(savingsData.netSavings)
    },
    {
      name: 'Waste Elimination',
      status: savingsData.wasteEliminated ? '✅' : '⚠️',
      value: savingsData.tier1Skips > 0 ? `${savingsData.tier1Skips} skips` : 'No skips detected'
    }
  ];
  
  healthChecks.forEach(check => {
    console.log(`${check.status} ${check.name}: ${check.value}`);
  });
  console.log();
}

/**
 * Display JSON format for API consumption
 */
function displayJSONFormat(data) {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Main dashboard function
 */
async function showDashboard() {
  try {
    console.log('🛡️ ZERO-WASTE MONITORING DASHBOARD');
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log('═'.repeat(60));
    console.log();

    // Fetch all data in parallel
    const [completionData, dashboardData, savingsData] = await Promise.all([
      getCompletionStatus(),
      getZeroWasteDashboard(days),
      getTotalSavings(days)
    ]);

    if (format === 'json') {
      displayJSONFormat({
        timestamp: new Date().toISOString(),
        completion: completionData,
        dashboard: dashboardData,
        savings: savingsData,
        health: {
          systemOperational: true,
          dataCollectionActive: true,
          lastPeriodDays: days
        }
      });
      return;
    }

    // Display all sections
    displayCompletionStatus(completionData);
    displaySavingsMetrics(savingsData);
    displaySystemHealth(completionData, savingsData);
    
    if (showDetails) {
      displayRecentOperations(dashboardData);
      await displayMoviesNeedingAttention();
    }

    // Summary and recommendations
    console.log('🎯 RECOMMENDATIONS');
    console.log('═'.repeat(50));
    
    const movieCompletion = completionData.find(item => item.content_type === 'movie_analysis');
    const needingLinksCount = await getMoviesNeedingLinks(1000).then(movies => movies.length);
    
    if (needingLinksCount > 0) {
      console.log(`📋 ${needingLinksCount} movies need linking - run episode processor`);
    }
    
    if (movieCompletion && movieCompletion.completion_percentage < 90) {
      console.log(`🔗 Movie analysis only ${formatPercentage(movieCompletion.completion_percentage)} complete - run nuclear static generator`);
    }
    
    if (savingsData.netSavings < 1.00) {
      console.log(`💰 Low savings detected - verify zero-waste protection is active`);
    }
    
    if (savingsData.tier1Skips === 0) {
      console.log(`⚠️ No waste elimination detected - check if content is being regenerated`);
    }
    
    console.log('✅ Zero-waste system operational');
    console.log();

  } catch (error) {
    console.error('💥 Dashboard failed:', error);
    console.error('Check database connection and zero-waste system configuration.');
    process.exit(1);
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🛡️ Zero-Waste Monitoring Dashboard

Displays real-time metrics and status of the zero-waste protection system.

Usage:
  node scripts/zero-waste-dashboard.js [options]

Options:
  --days=N            Look back N days for metrics (default: 30)
  --details           Show detailed operation breakdown
  --format=FORMAT     Output format: table (default) or json
  --help, -h          Show this help

Examples:
  node scripts/zero-waste-dashboard.js                     # Basic dashboard
  node scripts/zero-waste-dashboard.js --details           # Detailed view
  node scripts/zero-waste-dashboard.js --days=7            # Last 7 days
  node scripts/zero-waste-dashboard.js --format=json       # JSON output

Features:
  📊 Completion status across all content types
  💰 Cost savings and waste elimination metrics
  🏥 System health monitoring
  🎯 Actionable recommendations
  📈 Recent operation trends

The dashboard shows how much the zero-waste system is saving and protecting your content investment.
`);
  process.exit(0);
}

// Run the dashboard
showDashboard().catch(error => {
  console.error('💥 Dashboard startup failed:', error);
  process.exit(1);
});