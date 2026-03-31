#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const GENRES = [
  'Action',
  'Adventure', 
  'Animation',
  'Comedy',
  'Crime',
  'Drama',
  'Fantasy',
  'Horror',
  'Musical',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'Western'
];

class MultiGenreAutomation {
  constructor() {
    this.logFile = './multi-genre-automation.log';
    this.summaryFile = './multi-genre-summary.json';
  }
  
  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    console.log(logEntry);
    
    // Append to log file
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }
  
  async run() {
    this.log('INFO', '🎬 Starting Multi-Genre List Generation Automation');
    this.log('INFO', `Processing ${GENRES.length} genres sequentially`);
    
    const results = {
      startTime: new Date().toISOString(),
      genres: {},
      totalCost: 0,
      totalLists: 0,
      totalMovies: 0,
      completedGenres: [],
      failedGenres: []
    };
    
    for (let i = 0; i < GENRES.length; i++) {
      const genre = GENRES[i];
      this.log('INFO', `\n${'='.repeat(50)}`);
      this.log('INFO', `🎭 GENRE ${i + 1}/${GENRES.length}: ${genre.toUpperCase()}`);
      this.log('INFO', `${'='.repeat(50)}`);
      
      try {
        const genreResult = await this.processGenre(genre);
        results.genres[genre] = genreResult;
        results.completedGenres.push(genre);
        results.totalCost += genreResult.totalCost || 0;
        results.totalLists += genreResult.totalLists || 0;
        results.totalMovies += genreResult.totalMovies || 0;
        
        this.log('INFO', `✅ ${genre} completed successfully`);
        this.log('INFO', `   Cost: $${(genreResult.totalCost || 0).toFixed(4)}`);
        this.log('INFO', `   Lists: ${genreResult.totalLists || 0}`);
        this.log('INFO', `   Movies: ${genreResult.totalMovies || 0}`);
        
      } catch (error) {
        this.log('ERROR', `❌ ${genre} failed: ${error.message}`);
        results.failedGenres.push({ genre, error: error.message });
      }
      
      // Save progress after each genre
      results.endTime = new Date().toISOString();
      this.saveSummary(results);
      
      // Brief pause between genres
      if (i < GENRES.length - 1) {
        this.log('INFO', 'Pausing 5 seconds before next genre...');
        await this.sleep(5000);
      }
    }
    
    this.log('INFO', '\n🎉 MULTI-GENRE AUTOMATION COMPLETE!');
    this.log('INFO', `✅ Completed: ${results.completedGenres.length} genres`);
    this.log('INFO', `❌ Failed: ${results.failedGenres.length} genres`);
    this.log('INFO', `💰 Total cost: $${results.totalCost.toFixed(4)}`);
    this.log('INFO', `📋 Total lists: ${results.totalLists}`);
    this.log('INFO', `🎬 Total movies: ${results.totalMovies}`);
    
    if (results.failedGenres.length > 0) {
      this.log('WARN', 'Failed genres:');
      results.failedGenres.forEach(failure => {
        this.log('WARN', `  - ${failure.genre}: ${failure.error}`);
      });
    }
  }
  
  async processGenre(genre) {
    const genreLower = genre.toLowerCase();
    const dataFile = `./${genreLower}-test-data.json`;
    const progressFile = `./${genreLower}-fresh-start/${genreLower}-progress.json`;
    const listsFile = `./${genreLower}-fresh-start/${genreLower}-lists.json`;
    
    // Generate data file from database if it doesn't exist
    if (!fs.existsSync(dataFile)) {
      this.log('INFO', `Generating ${genre} data from database...`);
      await this.generateGenreDataFile(genre, dataFile);
    }
    
    // Create genre directory if needed
    const genreDir = `./${genreLower}-fresh-start`;
    if (!fs.existsSync(genreDir)) {
      fs.mkdirSync(genreDir, { recursive: true });
      this.log('INFO', `Created directory: ${genreDir}`);
    }
    
    // Run production list analyzer  
    this.log('INFO', `Running production list analyzer for ${genre}...`);
    
    try {
      const command = `node production-list-analyzer.js "${genre}" "${dataFile}" 0 "" "${genreDir}"`;
      this.log('INFO', `Executing: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 7200000, // 2 hour timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      this.log('INFO', `Production analyzer output:`);
      this.log('INFO', output);
      
    } catch (error) {
      // If command failed, try to extract results anyway
      this.log('WARN', `Production analyzer had issues: ${error.message}`);
    }
    
    // Extract results
    const result = { genre };
    
    try {
      if (fs.existsSync(progressFile)) {
        const progressData = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
        result.totalCost = progressData.totalCost || 0;
        result.totalLists = progressData.masterLists?.length || 0;
        result.totalMovies = progressData.totalMoviesProcessed || 0;
        result.successRate = progressData.totalMoviesProcessed && progressData.failures ? 
          ((progressData.totalMoviesProcessed - progressData.failures.length) / progressData.totalMoviesProcessed * 100).toFixed(1) + '%' : 'Unknown';
        result.status = 'completed';
        
        this.log('INFO', `Loaded results from ${progressFile}`);
      } else {
        throw new Error('Progress file not found after execution');
      }
    } catch (error) {
      this.log('WARN', `Could not load results: ${error.message}`);
      result.status = 'partial';
      result.error = error.message;
    }
    
    return result;
  }
  
  saveSummary(results) {
    try {
      fs.writeFileSync(this.summaryFile, JSON.stringify(results, null, 2));
    } catch (error) {
      this.log('ERROR', `Failed to save summary: ${error.message}`);
    }
  }
  
  async generateGenreDataFile(genre, outputFile) {
    try {
      this.log('INFO', `Loading ${genre} movie IDs from categorization...`);
      
      // Load the movie categorization
      const categorization = JSON.parse(fs.readFileSync('./movie-categorization.json', 'utf8'));
      const movieIds = categorization.categories[genre] || [];
      
      if (movieIds.length === 0) {
        throw new Error(`No movies found for genre: ${genre}`);
      }
      
      this.log('INFO', `Found ${movieIds.length} ${genre} movie IDs, querying database...`);
      
      // Query database for movie details
      const { getPool } = await import('./lib/railway-db.js');
      const pool = getPool();
      
      // Create placeholders for IN clause
      const placeholders = movieIds.map((_, index) => `$${index + 1}`).join(',');
      
      const result = await pool.query(`
        SELECT id, tmdb_id, title, year, official_title, poster_url
        FROM movies 
        WHERE id = ANY($1::uuid[])
        ORDER BY year, title
      `, [movieIds]);
      
      const movies = result.rows.map(row => ({
        id: row.id,
        tmdbId: row.tmdb_id,
        title: row.title,
        year: row.year,
        overview: '', // Not stored in current schema
        posterPath: row.poster_url || ''
      }));
      
      const genreData = {
        category: genre,
        movieCount: movies.length,
        movieData: movies,
        generatedAt: new Date().toISOString(),
        sourceIds: movieIds.length
      };
      
      fs.writeFileSync(outputFile, JSON.stringify(genreData, null, 2));
      this.log('INFO', `Generated ${outputFile} with ${movies.length}/${movieIds.length} ${genre.toLowerCase()} movies`);
      
      if (movies.length < movieIds.length) {
        this.log('WARN', `${movieIds.length - movies.length} movie IDs not found in database`);
      }
      
    } catch (error) {
      this.log('ERROR', `Failed to generate ${genre} data: ${error.message}`);
      throw error;
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const automation = new MultiGenreAutomation();
  automation.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default MultiGenreAutomation;