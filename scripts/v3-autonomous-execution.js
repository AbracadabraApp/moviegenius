#!/usr/bin/env node
/**
 * V3 Autonomous Execution Script
 *
 * Set it in motion, walk away, come back to results.
 * No confirmation prompts - executes based on V3 architecture plan.
 *
 * Usage:
 *   node scripts/v3-autonomous-execution.js --phase all
 *   node scripts/v3-autonomous-execution.js --phase database
 *   node scripts/v3-autonomous-execution.js --phase generation --dry-run
 *
 * Progress logged to: ./logs/v3-execution-TIMESTAMP.log
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// Configuration from V3 Architecture plan
const V3_CONFIG = {
  database: {
    addColumn: true,
    columnName: 'analysis_data_v3',
    columnType: 'JSONB',
    testMovies: [550, 278, 238, 424, 680, 13, 19404, 155, 98, 11],
  },

  generation: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    batchSize: 100,
    concurrency: 5,
    totalMovies: 'all', // or specific number
    costPerMovie: 0.0045,
    targetWordCount: 200,
  },

  validation: {
    sampleSize: 50,
    requiredFields: ['analysis', 'featuredFilms', 'mood'],
    maxRetries: 3,
  },

  logging: {
    directory: './logs',
    verbose: true,
    saveProgress: true,
  }
};

// V3 Analysis Prompt (from MOVIEGENIUS_V3_ARCHITECTURE.md)
const V3_ANALYSIS_PROMPT = `You are writing a concise 200-word analysis for film lovers who want deeper context about a movie.

Movie: {TITLE} ({YEAR})

Write exactly 200 words in 3 paragraphs. Use a warm, engaging tone.

CRITICAL: Include 2-4 related films using EXACTLY this format: **Movie Title (Year)**
Example: Compare to **The Godfather (1972)** and **Goodfellas (1990)**.

OUTPUT as JSON:
{
  "analysis": "3 paragraphs with inline **Movie (Year)** references",
  "featuredFilms": [
    {"title": "Movie Title", "year": 2020, "connection": "why it's related"},
    {"title": "Another Film", "year": 2019, "connection": "thematic parallel"}
  ],
  "mood": ["genre", "tone", "theme"]
}

Rules:
- EXACTLY 200 words (+/- 10 words)
- NO generic phrases ("masterclass", "tour de force")
- YES specific details (director choices, cinematography, themes)
- Include inline **Movie (Year)** references in analysis text
- featuredFilms should be 2-4 related movies
- mood should be 2-4 descriptive tags`;

class V3AutonomousExecutor {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.phase = options.phase || 'all';
    this.startTime = Date.now();

    // Setup logging
    this.logFile = path.join(
      V3_CONFIG.logging.directory,
      `v3-execution-${new Date().toISOString().replace(/:/g, '-')}.log`
    );
    this.ensureLogDirectory();

    // Progress tracking
    this.progress = {
      phase: null,
      completed: 0,
      total: 0,
      errors: [],
      skipped: [],
      successful: [],
    };

    // Database connection
    this.db = null;
    this.anthropic = null;

    this.log('🚀 V3 Autonomous Executor initialized');
    this.log(`📋 Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    this.log(`📍 Phase: ${this.phase}`);
  }

  ensureLogDirectory() {
    const dir = V3_CONFIG.logging.directory;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(logMessage);

    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async connect() {
    this.log('🔌 Connecting to Railway PostgreSQL...');

    if (this.dryRun) {
      this.log('⚠️  DRY RUN: Skipping database connection');
      return;
    }

    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Test connection
    try {
      const result = await this.db.query('SELECT COUNT(*) FROM movies');
      this.log(`✅ Connected to database (${result.rows[0].count} movies)`);
    } catch (error) {
      this.log(`❌ Database connection failed: ${error.message}`, 'ERROR');
      throw error;
    }

    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.log('✅ Anthropic client initialized');
  }

  async disconnect() {
    if (this.db) {
      await this.db.end();
      this.log('🔌 Database connection closed');
    }
  }

  // ==================== PHASE 1: DATABASE ====================

  async executeDatabasePhase() {
    this.log('');
    this.log('='.repeat(60));
    this.log('PHASE 1: DATABASE MIGRATION');
    this.log('='.repeat(60));

    this.progress.phase = 'database';

    // Step 1: Check if column exists
    const columnExists = await this.checkColumnExists();

    if (columnExists) {
      this.log('✅ Column analysis_data_v3 already exists');
      return;
    }

    // Step 2: Add column
    await this.addAnalysisV3Column();

    // Step 3: Test on sample movies
    await this.testDatabaseColumn();

    this.log('✅ Database phase complete');
  }

  async checkColumnExists() {
    if (this.dryRun) {
      this.log('⚠️  DRY RUN: Would check if analysis_data_v3 column exists');
      return false;
    }

    const result = await this.db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'movie_analyses'
        AND column_name = 'analysis_data_v3'
    `);

    return result.rows.length > 0;
  }

  async addAnalysisV3Column() {
    this.log('➕ Adding analysis_data_v3 column to movie_analyses table...');

    if (this.dryRun) {
      this.log('⚠️  DRY RUN: Would execute:');
      this.log('   ALTER TABLE movie_analyses ADD COLUMN analysis_data_v3 JSONB');
      return;
    }

    try {
      await this.db.query(`
        ALTER TABLE movie_analyses
        ADD COLUMN analysis_data_v3 JSONB
      `);
      this.log('✅ Column added successfully');
    } catch (error) {
      this.log(`❌ Failed to add column: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testDatabaseColumn() {
    this.log(`🧪 Testing column with ${V3_CONFIG.database.testMovies.length} sample movies...`);

    if (this.dryRun) {
      this.log('⚠️  DRY RUN: Would insert test data for movies:', V3_CONFIG.database.testMovies);
      return;
    }

    const testData = {
      analysis: "This is a test V3 analysis (200 words).",
      featuredFilms: [
        { title: "Test Movie", year: 2020, connection: "thematic parallel" }
      ],
      mood: ["test", "sample", "validation"]
    };

    for (const tmdbId of V3_CONFIG.database.testMovies) {
      try {
        await this.db.query(`
          UPDATE movie_analyses
          SET analysis_data_v3 = $1
          WHERE tmdb_id = $2
        `, [JSON.stringify(testData), tmdbId]);

        this.log(`  ✓ Test data written for movie ${tmdbId}`);
      } catch (error) {
        this.log(`  ✗ Failed for movie ${tmdbId}: ${error.message}`, 'WARN');
      }
    }

    this.log('✅ Database column test complete');
  }

  // ==================== PHASE 2: GENERATION ====================

  async executeGenerationPhase() {
    this.log('');
    this.log('='.repeat(60));
    this.log('PHASE 2: V3 ANALYSIS GENERATION');
    this.log('='.repeat(60));

    this.progress.phase = 'generation';

    // Step 1: Get list of movies to generate
    const movies = await this.getMoviesToGenerate();
    this.progress.total = movies.length;

    const estimatedCost = movies.length * V3_CONFIG.generation.costPerMovie;
    const estimatedTime = (movies.length / V3_CONFIG.generation.batchSize) * 2; // ~2min per batch

    this.log(`📊 Generation Plan:`);
    this.log(`   Movies: ${movies.length}`);
    this.log(`   Estimated cost: $${estimatedCost.toFixed(2)}`);
    this.log(`   Estimated time: ${Math.ceil(estimatedTime)} minutes`);
    this.log(`   Batch size: ${V3_CONFIG.generation.batchSize}`);
    this.log(`   Concurrency: ${V3_CONFIG.generation.concurrency}`);

    if (this.dryRun) {
      this.log('⚠️  DRY RUN: Would generate analyses for these movies');
      this.log(`   Sample: ${movies.slice(0, 5).map(m => m.tmdb_id).join(', ')}...`);
      return;
    }

    // Step 2: Process in batches
    await this.generateBatches(movies);

    this.log('✅ Generation phase complete');
  }

  async getMoviesToGenerate() {
    if (this.dryRun) {
      return [
        { tmdb_id: 550, title: 'Fight Club', year: 1999 },
        { tmdb_id: 278, title: 'The Shawshank Redemption', year: 1994 },
      ];
    }

    // Get all movies with existing analysis but no V3 data
    const result = await this.db.query(`
      SELECT m.tmdb_id, m.title, m.year
      FROM movies m
      INNER JOIN movie_analyses ma ON m.tmdb_id = ma.tmdb_id
      WHERE ma.analysis_data_v3 IS NULL
      ORDER BY m.tmdb_id
      ${V3_CONFIG.generation.totalMovies === 'all' ? '' : `LIMIT ${V3_CONFIG.generation.totalMovies}`}
    `);

    return result.rows;
  }

  async generateBatches(movies) {
    const batches = this.chunkArray(movies, V3_CONFIG.generation.batchSize);

    this.log(`📦 Processing ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.log(`\n📦 Batch ${i + 1}/${batches.length} (${batch.length} movies)`);

      await this.processBatch(batch);

      // Save progress checkpoint
      if (V3_CONFIG.logging.saveProgress) {
        this.saveProgress();
      }

      // Brief pause between batches
      if (i < batches.length - 1) {
        await this.sleep(2000);
      }
    }
  }

  async processBatch(movies) {
    // Process movies with concurrency control
    const chunks = this.chunkArray(movies, V3_CONFIG.generation.concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(movie => this.generateAnalysis(movie));
      await Promise.all(promises);
    }
  }

  async generateAnalysis(movie) {
    const startTime = Date.now();

    try {
      // Build prompt
      const prompt = V3_ANALYSIS_PROMPT
        .replace('{TITLE}', movie.title)
        .replace('{YEAR}', movie.year);

      // Call Claude
      const response = await this.anthropic.messages.create({
        model: V3_CONFIG.generation.model,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0].text;

      // Parse JSON response
      let analysisData;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        analysisData = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }

      // Validate response
      this.validateAnalysis(analysisData);

      // Save to database
      await this.db.query(`
        UPDATE movie_analyses
        SET analysis_data_v3 = $1
        WHERE tmdb_id = $2
      `, [JSON.stringify(analysisData), movie.tmdb_id]);

      const elapsed = Date.now() - startTime;
      this.progress.completed++;
      this.progress.successful.push(movie.tmdb_id);

      this.log(`  ✓ ${movie.tmdb_id} - ${movie.title} (${elapsed}ms)`);

    } catch (error) {
      this.progress.errors.push({
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        error: error.message
      });

      this.log(`  ✗ ${movie.tmdb_id} - ${movie.title}: ${error.message}`, 'ERROR');
    }

    // Progress indicator
    const percent = (this.progress.completed / this.progress.total * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${percent}% (${this.progress.completed}/${this.progress.total})`);
  }

  validateAnalysis(data) {
    // Check required fields
    for (const field of V3_CONFIG.validation.requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Check word count
    const wordCount = data.analysis.split(/\s+/).length;
    if (wordCount < 180 || wordCount > 220) {
      throw new Error(`Word count ${wordCount} outside target range (180-220)`);
    }

    // Check for **Movie (Year)** references
    const movieRefs = (data.analysis.match(/\*\*[^*]+\(\d{4}\)\*\*/g) || []).length;
    if (movieRefs < 2) {
      throw new Error(`Only ${movieRefs} movie references found (need 2+)`);
    }

    // Check featuredFilms
    if (data.featuredFilms.length < 2 || data.featuredFilms.length > 4) {
      throw new Error(`featuredFilms count ${data.featuredFilms.length} outside range (2-4)`);
    }
  }

  // ==================== PHASE 3: VALIDATION ====================

  async executeValidationPhase() {
    this.log('');
    this.log('='.repeat(60));
    this.log('PHASE 3: VALIDATION');
    this.log('='.repeat(60));

    this.progress.phase = 'validation';

    // Sample random movies
    const sample = await this.getValidationSample();

    this.log(`🧪 Validating ${sample.length} random movies...`);

    let passed = 0;
    let failed = 0;

    for (const movie of sample) {
      const valid = await this.validateMovie(movie);
      if (valid) {
        passed++;
        this.log(`  ✓ ${movie.tmdb_id} - ${movie.title}`);
      } else {
        failed++;
        this.log(`  ✗ ${movie.tmdb_id} - ${movie.title}`, 'WARN');
      }
    }

    const passRate = (passed / sample.length * 100).toFixed(1);
    this.log(`\n📊 Validation Results: ${passed}/${sample.length} passed (${passRate}%)`);

    if (passRate < 95) {
      this.log(`⚠️  Pass rate below 95% - review errors`, 'WARN');
    } else {
      this.log('✅ Validation phase complete');
    }
  }

  async getValidationSample() {
    if (this.dryRun) {
      return [{ tmdb_id: 550, title: 'Fight Club' }];
    }

    const result = await this.db.query(`
      SELECT m.tmdb_id, m.title, ma.analysis_data_v3
      FROM movies m
      INNER JOIN movie_analyses ma ON m.tmdb_id = ma.tmdb_id
      WHERE ma.analysis_data_v3 IS NOT NULL
      ORDER BY RANDOM()
      LIMIT $1
    `, [V3_CONFIG.validation.sampleSize]);

    return result.rows;
  }

  async validateMovie(movie) {
    try {
      const data = movie.analysis_data_v3;
      this.validateAnalysis(data);
      return true;
    } catch (error) {
      this.progress.errors.push({
        tmdb_id: movie.tmdb_id,
        error: error.message
      });
      return false;
    }
  }

  // ==================== UTILITIES ====================

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  saveProgress() {
    const progressFile = path.join(
      V3_CONFIG.logging.directory,
      'v3-progress.json'
    );

    fs.writeFileSync(progressFile, JSON.stringify({
      ...this.progress,
      timestamp: new Date().toISOString(),
      elapsed: Date.now() - this.startTime
    }, null, 2));
  }

  // ==================== MAIN EXECUTION ====================

  async execute() {
    try {
      await this.connect();

      // Execute requested phases
      if (this.phase === 'all' || this.phase === 'database') {
        await this.executeDatabasePhase();
      }

      if (this.phase === 'all' || this.phase === 'generation') {
        await this.executeGenerationPhase();
      }

      if (this.phase === 'all' || this.phase === 'validation') {
        await this.executeValidationPhase();
      }

      // Final summary
      this.printSummary();

    } catch (error) {
      this.log(`\n❌ FATAL ERROR: ${error.message}`, 'ERROR');
      this.log(error.stack, 'ERROR');
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }

  printSummary() {
    const elapsed = (Date.now() - this.startTime) / 1000;

    this.log('');
    this.log('='.repeat(60));
    this.log('EXECUTION SUMMARY');
    this.log('='.repeat(60));
    this.log(`⏱️  Total time: ${elapsed.toFixed(1)}s`);
    this.log(`✅ Successful: ${this.progress.successful.length}`);
    this.log(`❌ Errors: ${this.progress.errors.length}`);
    this.log(`📊 Success rate: ${(this.progress.successful.length / (this.progress.successful.length + this.progress.errors.length) * 100).toFixed(1)}%`);

    if (this.progress.errors.length > 0) {
      this.log('\n❌ Error Summary:');
      this.progress.errors.slice(0, 10).forEach(err => {
        this.log(`   ${err.tmdb_id}: ${err.error}`);
      });
      if (this.progress.errors.length > 10) {
        this.log(`   ... and ${this.progress.errors.length - 10} more`);
      }
    }

    this.log(`\n📋 Full log: ${this.logFile}`);
    this.log('='.repeat(60));
  }
}

// ==================== CLI ====================

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  phase: args.includes('--phase') ? args[args.indexOf('--phase') + 1] : 'all'
};

const executor = new V3AutonomousExecutor(options);
executor.execute();
