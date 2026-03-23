#!/usr/bin/env node
/**
 * V3 Prompt Testing Script
 *
 * Tests prompt variations on curated movie sets to validate:
 * - NO recommendation rate (target: 15-30%)
 * - Quality differentiation within franchises
 * - Discernment vs star-worship
 * - Output format compliance
 *
 * Usage:
 *   node scripts/v3-test-prompt.js --prompt current
 *   node scripts/v3-test-prompt.js --prompt lenient --categories starWars,shrek
 *   node scripts/v3-test-prompt.js --all
 */

const { Pool } = require('pg');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// Load config
const configPath = path.join(__dirname, '..', 'v3-test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

class V3PromptTester {
  constructor(options = {}) {
    this.promptName = options.prompt || 'current';
    this.categories = options.categories || Object.keys(config.testCategories);
    this.dryRun = options.dryRun || false;

    // Get prompt template
    this.promptTemplate = config.promptVariations[this.promptName];
    if (!this.promptTemplate) {
      throw new Error(`Prompt "${this.promptName}" not found in config`);
    }

    // Results tracking
    this.results = {
      promptName: this.promptName,
      timestamp: new Date().toISOString(),
      categories: {},
      overall: {
        total: 0,
        yes: 0,
        no: 0,
        errors: 0,
        noRate: 0
      },
      validationErrors: [],
      examples: {
        yes: [],
        no: []
      }
    };

    // Setup
    this.db = null;
    this.anthropic = null;

    this.log(`🧪 V3 Prompt Tester initialized`);
    this.log(`📋 Prompt: ${this.promptTemplate.name}`);
    this.log(`📁 Categories: ${this.categories.join(', ')}`);
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp.split('T')[1].slice(0, 8)}] ${message}`);
  }

  async connect() {
    this.log('🔌 Connecting to database...');

    this.db = new Pool({
      connectionString: process.env.DATABASE_URL
    });

    await this.db.query('SELECT 1');
    this.log('✅ Database connected');

    if (!this.dryRun) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      this.log('✅ Anthropic client initialized');
    }
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
    }
  }

  async runTests() {
    this.log('');
    this.log('='.repeat(60));
    this.log('STARTING PROMPT TESTS');
    this.log('='.repeat(60));

    for (const categoryName of this.categories) {
      await this.testCategory(categoryName);
    }

    this.calculateOverallStats();
    this.generateReport();
  }

  async testCategory(categoryName) {
    const category = config.testCategories[categoryName];
    if (!category) {
      this.log(`⚠️  Category "${categoryName}" not found`, 'WARN');
      return;
    }

    this.log('');
    this.log(`📦 Testing: ${category.name}`);
    this.log(`   ${category.description}`);

    // Get movies for this category
    let movies = [];
    if (category.queryDB) {
      movies = await this.getMoviesFromDB(category.query);
      this.log(`   Found ${movies.length} movies from database`);
    } else {
      movies = category.movies;
    }

    // Initialize category results
    this.results.categories[categoryName] = {
      name: category.name,
      description: category.description,
      total: movies.length,
      yes: 0,
      no: 0,
      errors: 0,
      movies: []
    };

    // Test each movie
    for (const movie of movies) {
      await this.testMovie(movie, categoryName);
    }

    // Category summary
    const catResults = this.results.categories[categoryName];
    const noRate = (catResults.no / catResults.total * 100).toFixed(1);

    this.log(`   Results: ${catResults.yes} YES, ${catResults.no} NO (${noRate}% NO rate)`);
  }

  async getMoviesFromDB(query) {
    const result = await this.db.query(query);
    return result.rows;
  }

  async testMovie(movie, categoryName) {
    const { tmdb_id, title, year } = movie;

    try {
      // Build prompt
      const prompt = this.promptTemplate.template
        .replace('{TITLE}', title)
        .replace('{YEAR}', year);

      if (this.dryRun) {
        this.log(`   [DRY RUN] Would test: ${title} (${year})`);
        return;
      }

      // Call Claude
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0].text;

      // Parse JSON
      let result;
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        result = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      } catch (parseError) {
        throw new Error(`JSON parse failed: ${parseError.message}`);
      }

      // Validate output
      const validation = this.validateOutput(result, title, year);

      if (!validation.valid) {
        this.results.validationErrors.push({
          movie: `${title} (${year})`,
          errors: validation.errors
        });
      }

      // Record result
      const movieResult = {
        tmdb_id,
        title,
        year,
        recommendation: result.recommendation,
        reasons: result.reasons,
        context: result.context,
        validationErrors: validation.errors,
        expectedQuality: movie.expectedQuality
      };

      this.results.categories[categoryName].movies.push(movieResult);
      this.results.overall.total++;

      if (result.recommendation === 'YES') {
        this.results.categories[categoryName].yes++;
        this.results.overall.yes++;

        // Save example
        if (this.results.examples.yes.length < 10) {
          this.results.examples.yes.push(movieResult);
        }
      } else {
        this.results.categories[categoryName].no++;
        this.results.overall.no++;

        // Save example
        if (this.results.examples.no.length < 10) {
          this.results.examples.no.push(movieResult);
        }
      }

      // Brief pause
      await this.sleep(200);

    } catch (error) {
      this.log(`   ✗ ${title} (${year}): ${error.message}`, 'ERROR');
      this.results.categories[categoryName].errors++;
      this.results.overall.errors++;
    }
  }

  validateOutput(result, title, year) {
    const errors = [];
    const rules = config.validationRules;

    // Check required fields
    for (const field of rules.requiredFields) {
      if (!result[field]) {
        errors.push(`Missing field: ${field}`);
      }
    }

    // Check recommendation value
    if (result.recommendation !== 'YES' && result.recommendation !== 'NO') {
      errors.push(`Invalid recommendation: ${result.recommendation} (must be YES or NO)`);
    }

    // Check reasons
    if (result.reasons) {
      if (result.reasons.length < rules.reasonsCountMin || result.reasons.length > rules.reasonsCountMax) {
        errors.push(`Reasons count ${result.reasons.length} outside range (${rules.reasonsCountMin}-${rules.reasonsCountMax})`);
      }

      for (const reason of result.reasons) {
        const wordCount = reason.split(/\s+/).length;
        if (wordCount < rules.reasonWordCountMin || wordCount > rules.reasonWordCountMax) {
          errors.push(`Reason "${reason}" has ${wordCount} words (target: ${rules.reasonWordCountMin}-${rules.reasonWordCountMax})`);
        }
      }
    }

    // Check context word count
    if (result.context) {
      const wordCount = result.context.split(/\s+/).length;
      if (wordCount < rules.contextWordCountMin || wordCount > rules.contextWordCountMax) {
        errors.push(`Context has ${wordCount} words (target: ${rules.contextWordCountMin}-${rules.contextWordCountMax})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  calculateOverallStats() {
    const total = this.results.overall.total;
    if (total > 0) {
      this.results.overall.noRate = (this.results.overall.no / total * 100).toFixed(1);
    }
  }

  generateReport() {
    this.log('');
    this.log('='.repeat(60));
    this.log('TEST RESULTS SUMMARY');
    this.log('='.repeat(60));

    // Overall stats
    const overall = this.results.overall;
    this.log(`\n📊 Overall Results:`);
    this.log(`   Total movies tested: ${overall.total}`);
    this.log(`   YES recommendations: ${overall.yes} (${(overall.yes / overall.total * 100).toFixed(1)}%)`);
    this.log(`   NO recommendations: ${overall.no} (${overall.noRate}%)`);
    this.log(`   Errors: ${overall.errors}`);

    // Target comparison
    const targetLow = config.testSettings.targetNoRateLow;
    const targetHigh = config.testSettings.targetNoRateHigh;
    const noRate = parseFloat(overall.noRate);

    this.log(`\n🎯 Target NO Rate: ${targetLow}-${targetHigh}%`);
    if (noRate < targetLow) {
      this.log(`   ⚠️  NO rate too low (${noRate}%) - Prompt may be too lenient`, 'WARN');
    } else if (noRate > targetHigh) {
      this.log(`   ⚠️  NO rate too high (${noRate}%) - Prompt may be too harsh`, 'WARN');
    } else {
      this.log(`   ✅ NO rate within target range (${noRate}%)`);
    }

    // Category breakdown
    this.log(`\n📦 Results by Category:`);
    for (const [catName, catResults] of Object.entries(this.results.categories)) {
      const catNoRate = (catResults.no / catResults.total * 100).toFixed(1);
      this.log(`   ${catResults.name}: ${catResults.yes} YES, ${catResults.no} NO (${catNoRate}%)`);
    }

    // Validation errors
    if (this.results.validationErrors.length > 0) {
      this.log(`\n⚠️  Validation Errors (${this.results.validationErrors.length}):`);
      this.results.validationErrors.slice(0, 5).forEach(err => {
        this.log(`   ${err.movie}: ${err.errors.join(', ')}`);
      });
      if (this.results.validationErrors.length > 5) {
        this.log(`   ... and ${this.results.validationErrors.length - 5} more`);
      }
    }

    // Examples
    if (config.outputSettings.showExamples) {
      this.log(`\n✅ Example YES Recommendations:`);
      this.results.examples.yes.slice(0, 3).forEach(movie => {
        this.log(`   ${movie.title} (${movie.year})`);
        movie.reasons.forEach(r => this.log(`      • ${r}`));
        this.log(`      "${movie.context}"`);
      });

      this.log(`\n❌ Example NO Recommendations:`);
      this.results.examples.no.slice(0, 3).forEach(movie => {
        this.log(`   ${movie.title} (${movie.year})`);
        movie.reasons.forEach(r => this.log(`      • ${r}`));
        this.log(`      "${movie.context}"`);
      });
    }

    // Save results
    if (config.testSettings.saveResults) {
      this.saveResults();
    }

    this.log('');
    this.log('='.repeat(60));
  }

  saveResults() {
    // Ensure logs directory
    const logsDir = path.dirname(config.outputSettings.resultsFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Save JSON
    fs.writeFileSync(
      config.outputSettings.resultsFile,
      JSON.stringify(this.results, null, 2)
    );
    this.log(`💾 Results saved to ${config.outputSettings.resultsFile}`);

    // Generate markdown report
    this.generateMarkdownReport();
  }

  generateMarkdownReport() {
    const md = [];

    md.push(`# V3 Prompt Test Results`);
    md.push(`\n**Prompt:** ${this.promptTemplate.name}`);
    md.push(`**Date:** ${this.results.timestamp}`);

    md.push(`\n## Overall Results\n`);
    md.push(`- **Total:** ${this.results.overall.total} movies`);
    md.push(`- **YES:** ${this.results.overall.yes} (${(this.results.overall.yes / this.results.overall.total * 100).toFixed(1)}%)`);
    md.push(`- **NO:** ${this.results.overall.no} (${this.results.overall.noRate}%)`);
    md.push(`- **Errors:** ${this.results.overall.errors}`);

    const noRate = parseFloat(this.results.overall.noRate);
    const targetLow = config.testSettings.targetNoRateLow;
    const targetHigh = config.testSettings.targetNoRateHigh;

    if (noRate >= targetLow && noRate <= targetHigh) {
      md.push(`\n✅ **NO rate within target range (${targetLow}-${targetHigh}%)**`);
    } else if (noRate < targetLow) {
      md.push(`\n⚠️ **NO rate too low** - Prompt may be too lenient`);
    } else {
      md.push(`\n⚠️ **NO rate too high** - Prompt may be too harsh`);
    }

    md.push(`\n## Results by Category\n`);
    for (const [catName, catResults] of Object.entries(this.results.categories)) {
      const catNoRate = (catResults.no / catResults.total * 100).toFixed(1);
      md.push(`### ${catResults.name}`);
      md.push(`*${catResults.description}*\n`);
      md.push(`- YES: ${catResults.yes}`);
      md.push(`- NO: ${catResults.no} (${catNoRate}%)`);
      md.push(``);
    }

    md.push(`\n## Example YES Recommendations\n`);
    this.results.examples.yes.slice(0, 5).forEach(movie => {
      md.push(`### ${movie.title} (${movie.year})\n`);
      movie.reasons.forEach(r => md.push(`- ${r}`));
      md.push(`\n> ${movie.context}\n`);
    });

    md.push(`\n## Example NO Recommendations\n`);
    this.results.examples.no.slice(0, 5).forEach(movie => {
      md.push(`### ${movie.title} (${movie.year})\n`);
      movie.reasons.forEach(r => md.push(`- ${r}`));
      md.push(`\n> ${movie.context}\n`);
    });

    fs.writeFileSync(
      config.outputSettings.reportFile,
      md.join('\n')
    );
    this.log(`📄 Markdown report saved to ${config.outputSettings.reportFile}`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute() {
    try {
      await this.connect();
      await this.runTests();
    } catch (error) {
      this.log(`\n❌ FATAL ERROR: ${error.message}`, 'ERROR');
      console.error(error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// CLI
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  prompt: args.includes('--prompt') ? args[args.indexOf('--prompt') + 1] : 'current',
  categories: args.includes('--categories')
    ? args[args.indexOf('--categories') + 1].split(',')
    : null
};

if (args.includes('--all')) {
  options.categories = Object.keys(config.testCategories);
}

const tester = new V3PromptTester(options);
tester.execute();
