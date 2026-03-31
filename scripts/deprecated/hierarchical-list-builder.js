#!/usr/bin/env node

/**
 * Hierarchical List Builder - Scales to handle 4k+ movies per genre
 * 
 * Strategy:
 * 1. For large genres (>1000 movies), sample 500-1000 core movies first
 * 2. Build foundational thematic lists from core sample  
 * 3. Process remaining movies in sequential chunks of 200-300
 * 4. Use existing lists as foundation to reduce new list creation
 * 
 * This approach maintains sequential processing while building manageable
 * foundational themes that can absorb thousands of additional movies.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration for hierarchical processing
const CONFIG = {
  // Core sample sizes for foundation building
  LARGE_GENRE_THRESHOLD: 1000,
  CORE_SAMPLE_SIZE: 800,        // Build foundation from 800 movies
  EXPANSION_CHUNK_SIZE: 300,    // Process remaining in chunks of 300
  
  // Medium genre handling
  MEDIUM_GENRE_THRESHOLD: 500,
  MEDIUM_CHUNK_SIZE: 500,       // Process medium genres in single batch
  
  // Small genre handling  
  SMALL_CHUNK_SIZE: 300,        // Process small genres in single batch
  
  // Timeout and retry settings
  CHUNK_TIMEOUT: 30 * 60 * 1000,  // 30 minutes per chunk
  MAX_RETRIES: 2
};

class HierarchicalListBuilder {
  constructor() {
    this.logFile = null;
    this.startTime = Date.now();
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logLine = `${timestamp} [${level}] ${message}${Object.keys(data).length ? ' ' + JSON.stringify(data) : ''}`;
    
    console.log(logLine);
    
    if (this.logFile) {
      fs.appendFileSync(this.logFile, logLine + '\n');
    }
  }

  // Load and sample movies for hierarchical processing
  sampleMovies(allMovies, sampleSize, strategy = 'diverse') {
    if (allMovies.length <= sampleSize) {
      return { core: allMovies, remaining: [] };
    }

    let core = [];
    
    if (strategy === 'diverse') {
      // Take every nth movie to get diverse sample across the dataset
      const step = Math.floor(allMovies.length / sampleSize);
      for (let i = 0; i < allMovies.length && core.length < sampleSize; i += step) {
        core.push(allMovies[i]);
      }
    } else {
      // Simple random sample
      const shuffled = [...allMovies].sort(() => Math.random() - 0.5);
      core = shuffled.slice(0, sampleSize);
    }

    const remaining = allMovies.filter(movie => !core.includes(movie));
    
    return { core, remaining };
  }

  // Run production-list-analyzer with specific parameters
  async runAnalyzer(genre, dataFile, startIndex, existingDir, outputDir, timeout = CONFIG.CHUNK_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const command = 'node';
      const args = ['production-list-analyzer.js', genre, dataFile, startIndex.toString(), existingDir, outputDir];
      
      this.log('INFO', `Running analyzer: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: ['inherit', 'inherit', 'inherit'],
        cwd: __dirname
      });

      const timeoutHandle = setTimeout(() => {
        this.log('ERROR', `Analyzer timeout after ${timeout/1000}s for ${genre}`);
        process.kill('SIGTERM');
        reject(new Error(`Process timeout after ${timeout/1000} seconds`));
      }, timeout);

      process.on('close', (code) => {
        clearTimeout(timeoutHandle);
        if (code === 0) {
          this.log('INFO', `Analyzer completed successfully for ${genre}`);
          resolve(code);
        } else {
          this.log('ERROR', `Analyzer failed with code ${code} for ${genre}`);
          reject(new Error(`Process failed with exit code ${code}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeoutHandle);
        this.log('ERROR', `Analyzer process error: ${error.message}`);
        reject(error);
      });
    });
  }

  // Create data file for a movie subset
  createChunkDataFile(movieIds, chunkIndex, genre, baseDir) {
    const chunkData = { movieIds };
    const fileName = `${genre.toLowerCase()}-chunk-${chunkIndex}.json`;
    const filePath = path.join(baseDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(chunkData, null, 2));
    this.log('INFO', `Created chunk data file: ${fileName} (${movieIds.length} movies)`);
    
    return filePath;
  }

  // Process a single genre hierarchically
  async processGenreHierarchically(genre, movieIds) {
    this.log('INFO', `=== STARTING HIERARCHICAL PROCESSING: ${genre} (${movieIds.length} movies) ===`);
    
    const genreDir = path.join(__dirname, `${genre.toLowerCase()}-hierarchical`);
    if (!fs.existsSync(genreDir)) {
      fs.mkdirSync(genreDir, { recursive: true });
    }

    const totalMovies = movieIds.length;
    let processedCount = 0;

    try {
      if (totalMovies >= CONFIG.LARGE_GENRE_THRESHOLD) {
        // LARGE GENRE: Hierarchical processing
        this.log('INFO', `Large genre detected: ${totalMovies} movies. Using hierarchical approach.`);
        
        // Phase 1: Build foundation with core sample
        const { core, remaining } = this.sampleMovies(movieIds, CONFIG.CORE_SAMPLE_SIZE, 'diverse');
        this.log('INFO', `Phase 1: Foundation building with ${core.length} core movies`);
        
        const coreDataFile = this.createChunkDataFile(core, 'core', genre, genreDir);
        await this.runAnalyzer(genre, coreDataFile, 0, '', genreDir);
        processedCount += core.length;
        
        // Phase 2: Process remaining movies in chunks using existing lists
        this.log('INFO', `Phase 2: Processing ${remaining.length} remaining movies in chunks of ${CONFIG.EXPANSION_CHUNK_SIZE}`);
        
        for (let i = 0; i < remaining.length; i += CONFIG.EXPANSION_CHUNK_SIZE) {
          const chunk = remaining.slice(i, i + CONFIG.EXPANSION_CHUNK_SIZE);
          const chunkIndex = Math.floor(i / CONFIG.EXPANSION_CHUNK_SIZE) + 1;
          
          this.log('INFO', `Processing expansion chunk ${chunkIndex}: ${chunk.length} movies (${i + 1}-${i + chunk.length} of ${remaining.length})`);
          
          const chunkDataFile = this.createChunkDataFile(chunk, `expansion-${chunkIndex}`, genre, genreDir);
          await this.runAnalyzer(genre, chunkDataFile, processedCount, genreDir, genreDir);
          
          processedCount += chunk.length;
          this.log('INFO', `Chunk ${chunkIndex} complete. Total processed: ${processedCount}/${totalMovies}`);
        }
        
      } else if (totalMovies >= CONFIG.MEDIUM_GENRE_THRESHOLD) {
        // MEDIUM GENRE: Single batch processing
        this.log('INFO', `Medium genre detected: ${totalMovies} movies. Using single batch approach.`);
        
        const dataFile = this.createChunkDataFile(movieIds, 'full', genre, genreDir);
        await this.runAnalyzer(genre, dataFile, 0, '', genreDir);
        processedCount = totalMovies;
        
      } else {
        // SMALL GENRE: Direct processing
        this.log('INFO', `Small genre detected: ${totalMovies} movies. Using direct approach.`);
        
        const dataFile = this.createChunkDataFile(movieIds, 'full', genre, genreDir);
        await this.runAnalyzer(genre, dataFile, 0, '', genreDir);
        processedCount = totalMovies;
      }

      this.log('INFO', `=== COMPLETED: ${genre} - ${processedCount}/${totalMovies} movies processed ===`);
      return { success: true, processed: processedCount, total: totalMovies };
      
    } catch (error) {
      this.log('ERROR', `Genre ${genre} failed: ${error.message}`);
      return { success: false, processed: processedCount, total: totalMovies, error: error.message };
    }
  }

  // Main execution function
  async run() {
    const genreArg = process.argv[2];
    
    if (!genreArg) {
      console.log(`
Usage: node hierarchical-list-builder.js <genre>

Examples:
  node hierarchical-list-builder.js Drama
  node hierarchical-list-builder.js Comedy
  node hierarchical-list-builder.js Action

This script uses hierarchical processing to handle genres of any size:
- Large genres (>1000): Core sample + expansion chunks  
- Medium genres (500-1000): Single batch processing
- Small genres (<500): Direct processing
`);
      process.exit(1);
    }

    // Setup logging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(__dirname, `hierarchical-${genreArg.toLowerCase()}-${timestamp}.log`);
    
    this.log('INFO', `=== HIERARCHICAL LIST BUILDER STARTED ===`);
    this.log('INFO', `Genre: ${genreArg}`);
    this.log('INFO', `Configuration: Large threshold=${CONFIG.LARGE_GENRE_THRESHOLD}, Core sample=${CONFIG.CORE_SAMPLE_SIZE}, Chunk size=${CONFIG.EXPANSION_CHUNK_SIZE}`);

    // Load categorization data
    let categorization;
    try {
      categorization = JSON.parse(fs.readFileSync('./movie-categorization.json', 'utf8'));
      this.log('INFO', `Loaded categorization data with ${Object.keys(categorization.categories).length} categories`);
    } catch (error) {
      this.log('ERROR', `Failed to load movie-categorization.json: ${error.message}`);
      process.exit(1);
    }

    // Get movie IDs for the specified genre
    const movieIds = categorization.categories[genreArg];
    if (!movieIds || movieIds.length === 0) {
      this.log('ERROR', `No movies found for genre: ${genreArg}`);
      this.log('INFO', `Available genres: ${Object.keys(categorization.categories).join(', ')}`);
      process.exit(1);
    }

    // Process the genre
    const result = await this.processGenreHierarchically(genreArg, movieIds);
    
    const duration = (Date.now() - this.startTime) / 1000;
    this.log('INFO', `=== FINAL RESULT ===`);
    this.log('INFO', `Genre: ${genreArg}`);
    this.log('INFO', `Success: ${result.success}`);
    this.log('INFO', `Processed: ${result.processed}/${result.total} movies`);
    this.log('INFO', `Duration: ${Math.round(duration)}s`);
    
    if (!result.success) {
      this.log('ERROR', `Error: ${result.error}`);
      process.exit(1);
    }

    this.log('INFO', `=== HIERARCHICAL LIST BUILDER COMPLETED SUCCESSFULLY ===`);
  }
}

// Run the hierarchical list builder
if (require.main === module) {
  const builder = new HierarchicalListBuilder();
  builder.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = HierarchicalListBuilder;