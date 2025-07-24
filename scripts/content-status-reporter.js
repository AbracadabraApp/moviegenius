#!/usr/bin/env node
/**
 * Content Status Reporter
 * 
 * Provides comprehensive reporting on movie content status using the enhanced
 * content tracking system. Helps identify gaps, failures, and completion rates.
 * 
 * Features:
 * - Dashboard overview with completion percentages
 * - Detailed gap analysis by content type
 * - Failure analysis and retry recommendations
 * - Quality score distribution
 * - Progress tracking over time
 * 
 * Usage: node scripts/content-status-reporter.js [--format=json|table] [--gaps-only] [--export]
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
const args = process.argv.slice(2);
const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'table';
const gapsOnly = args.includes('--gaps-only');
const exportResults = args.includes('--export');

class ContentStatusReporter {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.report = {
      generated_at: this.timestamp,
      summary: {},
      gaps: {},
      failures: {},
      quality: {},
      recommendations: []
    };
  }

  async generateReport() {
    console.log('📊 Content Status Analysis Report');
    console.log('=================================');
    console.log(`Generated: ${new Date().toLocaleString()}\n`);

    try {
      // Generate comprehensive status report
      await this.generateDashboardSummary();
      await this.analyzeContentGaps();
      await this.analyzeFailures();
      await this.analyzeQuality();
      await this.generateRecommendations();

      // Output results
      if (format === 'json') {
        this.outputJSON();
      } else {
        this.outputTable();
      }

      // Export if requested
      if (exportResults) {
        this.exportReport();
      }

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      throw error;
    }
  }

  async generateDashboardSummary() {
    console.log('📈 Content Status Dashboard');
    console.log('---------------------------');

    const { data: dashboard, error } = await supabase
      .from('content_status_dashboard')
      .select('*')
      .single();

    if (error) throw error;

    this.report.summary = dashboard;

    // Calculate completion rates for each stage
    const rates = {
      analysis_rate: ((dashboard.analysis_complete / dashboard.total_items) * 100).toFixed(1),
      links_rate: ((dashboard.links_processed / dashboard.total_items) * 100).toFixed(1),
      slugs_rate: ((dashboard.slugs_generated / dashboard.total_items) * 100).toFixed(1),
      validation_rate: ((dashboard.validation_passed / dashboard.total_items) * 100).toFixed(1),
      overall_completion: dashboard.completion_percentage
    };

    if (!gapsOnly) {
      console.log(`Total Movies: ${dashboard.total_items.toLocaleString()}`);
      console.log(`Analysis Complete: ${dashboard.analysis_complete.toLocaleString()} (${rates.analysis_rate}%)`);
      console.log(`Links Processed: ${dashboard.links_processed.toLocaleString()} (${rates.links_rate}%)`);
      console.log(`Slugs Generated: ${dashboard.slugs_generated.toLocaleString()} (${rates.slugs_rate}%)`);
      console.log(`Content Complete: ${dashboard.content_complete.toLocaleString()}`);
      console.log(`Display Ready: ${dashboard.display_ready.toLocaleString()} (${rates.overall_completion}%)`);
      console.log(`Validation Passed: ${dashboard.validation_passed.toLocaleString()} (${rates.validation_rate}%)`);
      console.log(`Failed Items: ${dashboard.failed_items.toLocaleString()}`);
      console.log(`Avg Quality Score: ${dashboard.avg_quality_score}/100\n`);
    }

    this.report.summary.completion_rates = rates;
  }

  async analyzeContentGaps() {
    console.log('🔍 Content Gap Analysis');
    console.log('-----------------------');

    const gaps = {
      needing_analysis: await this.getGapCount('movies_needing_analysis'),
      needing_links: await this.getGapCount('movies_needing_links'),
      needing_slugs: await this.getGapCount('movies_needing_slugs'),
      needing_review: await this.getGapCount('movies_needing_review')
    };

    this.report.gaps = gaps;

    console.log(`Movies Needing Analysis: ${gaps.needing_analysis.toLocaleString()}`);
    console.log(`Movies Needing Links: ${gaps.needing_links.toLocaleString()}`);
    console.log(`Movies Needing Slugs: ${gaps.needing_slugs.toLocaleString()}`);
    console.log(`Movies Needing Review: ${gaps.needing_review.toLocaleString()}\n`);

    // Show top movies in each gap category
    if (!gapsOnly) {
      await this.showTopGapExamples();
    }
  }

  async getGapCount(viewName) {
    const { count, error } = await supabase
      .from(viewName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn(`Warning: Could not count ${viewName}: ${error.message}`);
      return 0;
    }

    return count || 0;
  }

  async showTopGapExamples() {
    console.log('🎬 Sample Movies in Each Gap Category');
    console.log('------------------------------------');

    const categories = [
      { view: 'movies_needing_analysis', title: 'Needing Analysis' },
      { view: 'movies_needing_links', title: 'Needing Links' },
      { view: 'movies_needing_slugs', title: 'Needing Slugs' },
      { view: 'movies_needing_review', title: 'Needing Review' }
    ];

    for (const category of categories) {
      const { data: examples, error } = await supabase
        .from(category.view)
        .select('title, year, gap_type, last_failure_reason')
        .limit(3);

      if (error || !examples || examples.length === 0) continue;

      console.log(`\n${category.title} (Top 3):`);
      examples.forEach(movie => {
        const failure = movie.last_failure_reason ? ` - ${movie.last_failure_reason}` : '';
        console.log(`  • ${movie.title} (${movie.year})${failure}`);
      });
    }
    console.log('');
  }

  async analyzeFailures() {
    console.log('❌ Failure Analysis');
    console.log('-------------------');

    // Get failure reasons and counts
    const { data: failures, error } = await supabase
      .from('movies')
      .select('last_failure_reason, failure_count')
      .not('last_failure_reason', 'is', null)
      .gt('failure_count', 0);

    if (error) {
      console.warn('Warning: Could not analyze failures');
      return;
    }

    // Group by failure reason
    const failureStats = {};
    let totalFailures = 0;
    let totalRetries = 0;

    failures.forEach(failure => {
      const reason = failure.last_failure_reason || 'Unknown';
      if (!failureStats[reason]) {
        failureStats[reason] = { count: 0, totalRetries: 0 };
      }
      failureStats[reason].count++;
      failureStats[reason].totalRetries += failure.failure_count;
      totalFailures++;
      totalRetries += failure.failure_count;
    });

    this.report.failures = {
      total_failed_movies: totalFailures,
      total_retry_attempts: totalRetries,
      failure_reasons: failureStats
    };

    console.log(`Total Failed Movies: ${totalFailures.toLocaleString()}`);
    console.log(`Total Retry Attempts: ${totalRetries.toLocaleString()}`);

    if (Object.keys(failureStats).length > 0) {
      console.log('\nTop Failure Reasons:');
      Object.entries(failureStats)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 5)
        .forEach(([reason, stats]) => {
          const avgRetries = (stats.totalRetries / stats.count).toFixed(1);
          console.log(`  • ${reason}: ${stats.count} movies (avg ${avgRetries} retries)`);
        });
    }
    console.log('');
  }

  async analyzeQuality() {
    console.log('⭐ Quality Score Analysis');
    console.log('-------------------------');

    const { data: qualityData, error } = await supabase
      .from('movies')
      .select('quality_score')
      .gt('quality_score', 0);

    if (error || !qualityData || qualityData.length === 0) {
      console.log('No quality score data available\n');
      return;
    }

    const scores = qualityData.map(m => m.quality_score).sort((a, b) => a - b);
    const total = scores.length;
    const avg = scores.reduce((sum, score) => sum + score, 0) / total;
    const median = scores[Math.floor(total / 2)];

    // Score distribution
    const distribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      acceptable: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length
    };

    this.report.quality = {
      total_scored: total,
      average_score: Math.round(avg * 10) / 10,
      median_score: median,
      distribution
    };

    console.log(`Total Scored Movies: ${total.toLocaleString()}`);
    console.log(`Average Score: ${avg.toFixed(1)}/100`);
    console.log(`Median Score: ${median}/100`);
    console.log('\nScore Distribution:');
    console.log(`  Excellent (90-100): ${distribution.excellent} (${((distribution.excellent/total)*100).toFixed(1)}%)`);
    console.log(`  Good (70-89): ${distribution.good} (${((distribution.good/total)*100).toFixed(1)}%)`);
    console.log(`  Acceptable (50-69): ${distribution.acceptable} (${((distribution.acceptable/total)*100).toFixed(1)}%)`);
    console.log(`  Poor (<50): ${distribution.poor} (${((distribution.poor/total)*100).toFixed(1)}%)\n`);
  }

  async generateRecommendations() {
    const recommendations = [];

    // Analyze gaps and suggest priorities
    if (this.report.gaps.needing_analysis > 1000) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Run bulk analysis batch processing',
        reason: `${this.report.gaps.needing_analysis} movies need analysis`,
        command: 'node scripts/optimized-analysis-batch.js'
      });
    }

    if (this.report.gaps.needing_links > 500) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Process movie links for existing analyses',
        reason: `${this.report.gaps.needing_links} analyses need link processing`,
        command: 'node scripts/process-analysis-links.js'
      });
    }

    if (this.report.gaps.needing_slugs > 300) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Generate missing slugs',
        reason: `${this.report.gaps.needing_slugs} movies need slugs`,
        command: 'node scripts/generate-missing-slugs.js'
      });
    }

    if (this.report.failures.total_failed_movies > 50) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and retry failed movies',
        reason: `${this.report.failures.total_failed_movies} movies have processing failures`,
        command: 'node scripts/retry-failed-movies.js'
      });
    }

    // Quality-based recommendations
    if (this.report.quality.distribution?.poor > 100) {
      recommendations.push({
        priority: 'LOW',
        action: 'Review low-quality content',
        reason: `${this.report.quality.distribution.poor} movies have quality scores below 50`,
        command: 'SELECT * FROM movies_needing_review LIMIT 20;'
      });
    }

    this.report.recommendations = recommendations;

    if (recommendations.length > 0) {
      console.log('💡 Recommendations');
      console.log('------------------');
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
        console.log(`   Reason: ${rec.reason}`);
        console.log(`   Command: ${rec.command}\n`);
      });
    }
  }

  outputJSON() {
    console.log(JSON.stringify(this.report, null, 2));
  }

  outputTable() {
    // Table output already handled in individual methods
  }

  exportReport() {
    const filename = `content-status-report-${new Date().toISOString().split('T')[0]}.json`;
    writeFileSync(filename, JSON.stringify(this.report, null, 2));
    console.log(`📄 Report exported to: ${filename}`);
  }
}

// Execute reporter
if (import.meta.url === `file://${process.argv[1]}`) {
  const reporter = new ContentStatusReporter();
  
  reporter.generateReport()
    .then(() => {
      console.log('✅ Content status report completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    });
}

export { ContentStatusReporter };