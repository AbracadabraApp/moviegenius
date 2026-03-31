#!/usr/bin/env node

import fs from 'fs';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CONFIG = {
  USE_BATCH_API: true,
  USE_PROMPT_CACHING: true,
  MAX_TOKENS: 2500,
  BATCH_TIMEOUT_HOURS: 24,
  BATCH_POLL_INTERVAL_MS: 30000,
};

class MusicalConsolidator {
  constructor() {
    this.progressFile = './musical-consolidation-progress.json';
    this.resultsFile = './musical-consolidation-results.json';
    this.movieDataFile = './musical-test-data.json';
    this.masterListsFile = './musical-fresh-start/musical-progress.json';
  }
  
  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${level}: ${message}`);
  }
  
  async run() {
    this.log('INFO', 'Starting Musical Consolidation Phase 1');
    
    try {
      // Load data
      const movieData = this.loadMovieData();
      const allLists = this.loadMasterLists();
      
      // Filter to small lists (≤9 items)
      const smallLists = this.filterSmallLists(allLists);
      this.log('INFO', `Filtered to ${smallLists.length} small lists (≤9 items) from ${allLists.length} total`);
      
      // Load progress
      let progress = this.loadProgress();
      
      if (CONFIG.USE_BATCH_API) {
        await this.processBatch(movieData, smallLists, progress);
      } else {
        await this.processIndividually(movieData, smallLists, progress);
      }
      
      this.log('INFO', 'Musical consolidation complete');
      
    } catch (error) {
      this.log('ERROR', `Consolidation failed: ${error.message}`);
      throw error;
    }
  }
  
  loadMovieData() {
    try {
      const testData = JSON.parse(fs.readFileSync(this.movieDataFile, 'utf8'));
      this.log('INFO', `Loaded ${testData.movieCount || testData.movieData?.length || 0} musical movies`);
      return testData.movieData || [];
    } catch (error) {
      this.log('ERROR', `Failed to load movie data: ${error.message}`);
      throw error;
    }
  }
  
  loadMasterLists() {
    try {
      const progressData = JSON.parse(fs.readFileSync(this.masterListsFile, 'utf8'));
      this.log('INFO', `Loaded ${progressData.masterLists.length} master lists`);
      return progressData.masterLists;
    } catch (error) {
      this.log('ERROR', `Failed to load master lists: ${error.message}`);
      throw error;
    }
  }
  
  filterSmallLists(allLists) {
    return allLists.filter(list => list.movieIds.length <= 9);
  }
  
  loadProgress() {
    if (!fs.existsSync(this.progressFile)) {
      return {
        assignments: [],
        totalCost: 0,
        lastProcessedIndex: -1,
        totalMoviesProcessed: 0,
        startTime: new Date().toISOString(),
        failures: []
      };
    }
    
    try {
      const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
      this.log('INFO', `Resuming from movie index ${progress.lastProcessedIndex + 1}`);
      this.log('INFO', `Previous cost: $${progress.totalCost.toFixed(6)}, ${progress.totalMoviesProcessed} movies processed`);
      return progress;
    } catch (error) {
      this.log('WARN', `Failed to load progress, starting fresh: ${error.message}`);
      return this.loadProgress();
    }
  }
  
  saveProgress(progress) {
    try {
      fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
    } catch (error) {
      this.log('ERROR', `Failed to save progress: ${error.message}`);
    }
  }
  
  async processBatch(movieData, smallLists, progress) {
    this.log('INFO', 'Using Anthropic Batch API for processing');
    
    // Prepare batch requests (limit to 100 at a time to avoid timeout)
    const requests = [];
    const maxBatchSize = 100;
    const endIndex = Math.min(progress.lastProcessedIndex + 1 + maxBatchSize, movieData.length);
    
    for (let i = progress.lastProcessedIndex + 1; i < endIndex; i++) {
      const movie = movieData[i];
      const { messages } = this.buildConsolidationPrompt(movie, smallLists);
      
      requests.push({
        custom_id: movie.id.toString(),
        params: {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: messages
        }
      });
    }
    
    if (requests.length === 0) {
      this.log('INFO', 'No movies to process - already complete');
      return;
    }
    
    this.log('INFO', `Submitting batch of ${requests.length} requests`);
    this.log('INFO', `Estimated cost: ~$${(requests.length * 0.01).toFixed(2)} (batch pricing)`);
    
    try {
      this.log('INFO', 'Creating batch request...');
      this.log('INFO', `First request sample: ${JSON.stringify(requests[0], null, 2).substring(0, 200)}...`);
      
      // Submit batch with timeout
      const batch = await Promise.race([
        anthropic.beta.messages.batches.create({
          requests: requests
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Batch creation timeout after 30s')), 30000)
        )
      ]);
      
      this.log('INFO', `✅ Batch submitted successfully: ${batch.id}`);
      this.log('INFO', `Batch status: ${batch.processing_status}`);
      
      // Poll for completion
      const completedBatch = await this.pollBatchStatus(batch.id);
      
      // Process results
      const results = await this.processBatchResults(completedBatch, movieData, smallLists);
      
      // Update progress
      progress.assignments.push(...results.assignments);
      progress.totalCost += results.totalCost;
      progress.totalMoviesProcessed = movieData.length;
      progress.lastProcessedIndex = movieData.length - 1;
      progress.failures.push(...results.failures);
      
      this.saveProgress(progress);
      this.saveResults(progress);
      
      this.log('INFO', `Batch complete: ${results.assignments.length} assignments, ${results.failures.length} failures`);
      this.log('INFO', `Total cost: $${progress.totalCost.toFixed(6)}`);
      
    } catch (error) {
      this.log('ERROR', `Batch processing failed: ${error.message}`);
      throw error;
    }
  }
  
  async pollBatchStatus(batchId) {
    const startTime = Date.now();
    const timeoutMs = CONFIG.BATCH_TIMEOUT_HOURS * 60 * 60 * 1000;
    let pollCount = 0;
    
    while (true) {
      try {
        const batch = await anthropic.beta.messages.batches.retrieve(batchId);
        pollCount++;
        
        const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
        this.log('INFO', `Poll #${pollCount} - Status: ${batch.processing_status} (${elapsedMinutes}m elapsed)`);
        
        if (batch.request_counts) {
          this.log('INFO', `Progress: ${batch.request_counts.succeeded || 0} succeeded, ${batch.request_counts.errored || 0} errored, ${batch.request_counts.processing || 0} processing`);
        }
        
        if (batch.processing_status === 'ended') {
          this.log('INFO', `Batch complete after ${elapsedMinutes} minutes`);
          return batch;
        } else if (batch.processing_status === 'canceled') {
          throw new Error(`Batch canceled`);
        }
        
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Batch timeout after ${CONFIG.BATCH_TIMEOUT_HOURS} hours`);
        }
        
        this.log('INFO', `Waiting ${CONFIG.BATCH_POLL_INTERVAL_MS/1000}s before next poll...`);
        await this.sleep(CONFIG.BATCH_POLL_INTERVAL_MS);
        
      } catch (error) {
        this.log('ERROR', `Batch polling failed: ${error.message}`);
        throw error;
      }
    }
  }
  
  async processBatchResults(batch, movieData, smallLists) {
    try {
      this.log('INFO', `Processing batch results: ${batch.id}`);
      
      const batchResults = await anthropic.beta.messages.batches.results(batch.id);
      
      let totalCost = 0;
      const assignments = [];
      const failures = [];
      
      // Create movie lookup
      const movieLookup = {};
      movieData.forEach(movie => {
        movieLookup[movie.id] = movie;
      });
      
      for await (const result of batchResults) {
        const movie = movieLookup[result.custom_id];
        if (!movie) continue;
        
        if (result.result.type === 'succeeded') {
          const response = result.result.message.content[0].text;
          const usage = result.result.message.usage;
          
          // Calculate batch API cost (50% discount) for Haiku
          const inputCost = (usage.input_tokens / 1000000) * 0.125;
          const outputCost = (usage.output_tokens / 1000000) * 0.625;
          const cost = inputCost + outputCost;
          totalCost += cost;
          
          // Parse assignments
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.assignments && Array.isArray(parsed.assignments)) {
                parsed.assignments.forEach(assignment => {
                  assignments.push({
                    movieId: movie.id,
                    movieTitle: movie.title,
                    movieYear: movie.year,
                    listName: assignment.listName
                  });
                });
                continue;
              }
            }
          } catch (parseError) {
            // Fall through to failure handling
          }
        }
        
        failures.push({
          movieId: movie.id,
          title: movie.title,
          error: result.result.error?.message || result.result.type || 'Failed to parse response'
        });
      }
      
      this.log('INFO', `Batch processing complete: ${assignments.length} assignments, ${failures.length} failures`);
      this.log('INFO', `Batch cost: $${totalCost.toFixed(6)} (50% savings applied)`);
      
      return { assignments, totalCost, failures };
      
    } catch (error) {
      this.log('ERROR', `Batch results processing failed: ${error.message}`);
      throw error;
    }
  }
  
  buildConsolidationPrompt(movie, smallLists) {
    const movieText = `UUID:${movie.id} "${movie.title}" (${movie.year})`;
    
    // Create movie lookup for list descriptions
    const movieLookup = {};
    // We'd need to load this from the original data - for now use placeholder
    
    // Build list context with existing movies
    const listsText = smallLists.map(list => {
      const movieCount = list.movieIds.length;
      const description = this.generateListDescription(list.name);
      
      // Get existing movie titles (placeholder for now)
      const existingTitles = list.movieIds.slice(0, 5).map(id => `Movie ${id}`).join(', ');
      const truncated = list.movieIds.length > 5 ? '...' : '';
      
      return `"${list.name}" (${movieCount} movies) - ${description}
  Current titles: ${existingTitles}${truncated}`;
    }).join('\n\n');
    
    const systemPrompt = `You are a film curator analyzing whether musical films belong in existing thematic lists.

You have 467 LISTS below.

For each movie, use your knowledge of the film to:

1. Assign movie to lists where this movie has a strong thematic fit (>65% match required)
2. Skip assignments if the movie is already in that list

Output Format (JSON only):
{
  "assignments": [
    {
      "listName": "Existing List Name", 
      "movieId": "MOVIE_ID"
    }
  ]
}

Lists (467 total):
${listsText}`;

    const userPrompt = `Movie to analyze: ${movieText}

Use your knowledge of this film to make evidence-based categorization decisions.`;
    
    if (CONFIG.USE_PROMPT_CACHING) {
      return {
        messages: [
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' }
              },
              {
                type: 'text', 
                text: userPrompt
              }
            ]
          }
        ]
      };
    } else {
      return {
        messages: [{ role: 'user', content: systemPrompt + '\n\n' + userPrompt }]
      };
    }
  }
  
  generateListDescription(listName) {
    // Simple description generator based on list name keywords
    const name = listName.toLowerCase();
    
    if (name.includes('broadway') || name.includes('stage')) {
      return 'Films adapted from Broadway musicals and stage productions';
    } else if (name.includes('jazz') || name.includes('1920')) {
      return 'Musical films from or about the jazz age era';
    } else if (name.includes('golden age') || name.includes('classic')) {
      return 'Classic Hollywood musical films from the golden age';
    } else if (name.includes('romance') || name.includes('love')) {
      return 'Musical films centered around romantic themes';
    } else if (name.includes('dance') || name.includes('dancing')) {
      return 'Musical films with significant dance sequences';
    } else if (name.includes('christmas') || name.includes('holiday')) {
      return 'Musical films with holiday or seasonal themes';
    } else if (name.includes('comedy') || name.includes('comedies')) {
      return 'Light-hearted and comedic musical films';
    } else if (name.includes('drama') || name.includes('dramas')) {
      return 'Dramatic musical films with serious themes';
    } else if (name.includes('animated') || name.includes('animation')) {
      return 'Animated musical films and cartoons';
    } else if (name.includes('folk') || name.includes('traditional')) {
      return 'Musical films featuring folk or traditional music';
    } else {
      return `Musical films with ${listName.toLowerCase()} themes`;
    }
  }
  
  saveResults(progress) {
    try {
      // Create summary results
      const results = {
        consolidationPhase: 1,
        totalMoviesProcessed: progress.totalMoviesProcessed,
        totalAssignments: progress.assignments.length,
        totalCost: progress.totalCost,
        failures: progress.failures.length,
        startTime: progress.startTime,
        endTime: new Date().toISOString(),
        
        // Assignment analysis
        assignmentsByList: this.analyzeAssignmentsByList(progress.assignments),
        assignmentsByMovie: this.analyzeAssignmentsByMovie(progress.assignments),
        
        // Raw data
        allAssignments: progress.assignments,
        allFailures: progress.failures
      };
      
      fs.writeFileSync(this.resultsFile, JSON.stringify(results, null, 2));
      this.log('INFO', `Results saved to ${this.resultsFile}`);
      
    } catch (error) {
      this.log('ERROR', `Failed to save results: ${error.message}`);
    }
  }
  
  analyzeAssignmentsByList(assignments) {
    const byList = {};
    assignments.forEach(assignment => {
      if (!byList[assignment.listName]) {
        byList[assignment.listName] = [];
      }
      byList[assignment.listName].push({
        movieId: assignment.movieId,
        title: assignment.movieTitle,
        year: assignment.movieYear,
        reason: assignment.reason
      });
    });
    
    // Sort by number of new assignments
    return Object.entries(byList)
      .map(([listName, movies]) => ({ listName, newMovies: movies, count: movies.length }))
      .sort((a, b) => b.count - a.count);
  }
  
  analyzeAssignmentsByMovie(assignments) {
    const byMovie = {};
    assignments.forEach(assignment => {
      const key = `${assignment.movieTitle} (${assignment.movieYear})`;
      if (!byMovie[key]) {
        byMovie[key] = {
          movieId: assignment.movieId,
          title: assignment.movieTitle,
          year: assignment.movieYear,
          lists: []
        };
      }
      byMovie[key].lists.push({
        listName: assignment.listName,
        reason: assignment.reason
      });
    });
    
    return Object.values(byMovie)
      .sort((a, b) => b.lists.length - a.lists.length);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const consolidator = new MusicalConsolidator();
  consolidator.run().catch(console.error);
}

export default MusicalConsolidator;