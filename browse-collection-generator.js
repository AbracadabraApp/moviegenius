// Production-quality one-by-one movie list analyzer
// Features: resumable, timeout handling, exponential backoff, comprehensive logging
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { getPool } from './lib/railway-db.js';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Production configuration - Simplified for Real-time Mode
const CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
  REQUEST_TIMEOUT_MS: 45000,
  SAVE_INTERVAL: 10, // Save progress every 10 movies
  LOG_LEVEL: 'INFO',
  
  // Real-time Processing with Rate Limiting Safeguards
  CONCURRENT_MOVIES: 4, // Process 4 movies concurrently (2.2s per movie)
  USE_REAL_TIME_MODE: true, // Primary mode: immediate, predictable
  BATCH_DELAY_MS: 3000, // 3 second delay between batches (increased from 1s)
  FAILURE_RATE_THRESHOLD: 0.5, // Stop if >50% failure rate
  
  // Batch API Mode (Disabled - unpredictable queue delays)
  USE_BATCH_API: false, // 50% cost savings but 20+ minute delays
  BATCH_SIZE: 25, // Reduced from 50 to 25 movies per batch
  BATCH_POLL_INTERVAL_MS: 60000,
  BATCH_TIMEOUT_HOURS: 24,
  CONCURRENT_BATCHES: 3,
  
  // Off-peak hours processing (US time)
  OFF_PEAK_START_HOUR: 23, // 11 PM
  OFF_PEAK_END_HOUR: 7,    // 7 AM
  ENFORCE_OFF_PEAK: false,  // Set to true to only process during off-peak
  
  // Prompt caching configuration
  USE_PROMPT_CACHING: true, // 75% cost savings on repeated context
  CACHE_THRESHOLD_TOKENS: 1024,
  CACHE_REFRESH_INTERVAL: 50
};

class BrowseCollectionGenerator {
  constructor(category, dataFile, outputDir = './list-analysis-output') {
    this.category = category;
    this.dataFile = dataFile;
    this.outputDir = outputDir;
    this.progressCallback = null; // Optional progress callback
    this.buildStateFile = path.join(outputDir, `${category.toLowerCase()}-build-state.json`);
    this.logFile = path.join(outputDir, `${category.toLowerCase()}-analysis.log`);
    this.progressFile = path.join(outputDir, `${category.toLowerCase()}-progress.json`);
    this.batchDir = path.join(outputDir, 'batches');
    
    // Ensure output directories exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.batchDir)) {
      fs.mkdirSync(this.batchDir, { recursive: true });
    }
    
    // Prompt caching state
    this.cachedPromptBase = null;
    this.cacheRefreshCounter = 0;
    
    this.log('INFO', `Browse Collection Generator initialized for ${category}`);
    this.log('INFO', `Processing Mode: Real-time (${CONFIG.CONCURRENT_MOVIES} concurrent)`);
    this.log('INFO', `Rate Limiting: ${CONFIG.BATCH_DELAY_MS}ms delay, ${(CONFIG.FAILURE_RATE_THRESHOLD*100)}% failure threshold`);
    this.log('INFO', `Batch Size: ${CONFIG.BATCH_SIZE} movies (reduced for reliability)`);
    this.log('INFO', `Cost Optimization: Prompt caching ${CONFIG.USE_PROMPT_CACHING ? 'enabled' : 'disabled'} (75% savings)`);
    this.log('INFO', `Off-peak processing: ${CONFIG.ENFORCE_OFF_PEAK ? 'enforced' : 'disabled'} (${CONFIG.OFF_PEAK_START_HOUR}:00-${CONFIG.OFF_PEAK_END_HOUR}:00)`);
    
    // Add system status header
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`🎬 BROWSE COLLECTION GENERATION - ${category.toUpperCase()} GENRE (RATE LIMITED)`);  
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('🚨 ENHANCED SAFEGUARDS: Reduced batch sizes, increased delays, failure detection');
    console.log('');
  }
  
  log(level, message, data = null) {
    if (CONFIG.LOG_LEVEL === 'DEBUG' || 
        (CONFIG.LOG_LEVEL === 'INFO' && level !== 'DEBUG') ||
        (CONFIG.LOG_LEVEL === 'WARN' && ['WARN', 'ERROR'].includes(level)) ||
        (CONFIG.LOG_LEVEL === 'ERROR' && level === 'ERROR')) {
      
      const timestamp = new Date().toISOString();
      const time = timestamp.substring(11, 19); // HH:MM:SS format
      const logEntry = this.formatLogMessage(level, message, time, data);
      
      console.log(logEntry);
      
      try {
        fs.appendFileSync(this.logFile, logEntry + '\n');
        if (data) {
          fs.appendFileSync(this.logFile, `  Data: ${JSON.stringify(data, null, 2)}\n`);
        }
      } catch (err) {
        console.error('Logging failed:', err.message);
      }
    }
  }

  formatLogMessage(level, message, time, data = null) {
    // Icon mapping for different message types
    const getIcon = (level, message) => {
      if (level === 'ERROR') return '❌';
      if (level === 'WARN') return '⚠️';
      if (message.includes('initialized')) return '🚀';
      if (message.includes('Starting analysis')) return '🎬';
      if (message.includes('Analyzing:')) return '🎯';
      if (message.includes('✅')) return '✅';
      if (message.includes('Processing concurrent batch')) return '⚡';
      if (message.includes('Build state saved')) return '💾';
      if (message.includes('Concurrent batch cost')) return '💰';
      if (message.includes('Master lists:')) return '📊';
      if (message.includes('ANALYSIS COMPLETE')) return '🎉';
      if (message.includes('Sample master lists')) return '🎭';
      if (message.includes('BATCH') && message.includes('SUMMARY')) return '📈';
      if (message.includes('Resuming from')) return '🔄';
      if (message.includes('Cache refresh')) return '🔄';
      if (message.includes('Lists at')) return '📋';
      if (message.includes('Movies processed')) return '🎬';
      if (message.includes('Avg placements')) return '📊';
      if (message.includes('New vs Reuse')) return '📈';
      if (message.includes('Total cost')) return '💵';
      if (message.includes('Failures:')) return message.includes('Failures: 0') ? '✅' : '❌';
      return '📝'; // Default info icon
    };

    const icon = getIcon(level, message);
    const levelColor = {
      'ERROR': '🔴',
      'WARN': '🟡', 
      'INFO': '🔵',
      'DEBUG': '⚪'
    }[level] || '⚪';

    // Format different message types
    if (message.includes('Analyzing:')) {
      // Extract movie info for cleaner display
      const movieMatch = message.match(/Analyzing: "([^"]+)" \((\d+)\)/);
      if (movieMatch) {
        const [, title, year] = movieMatch;
        const indexMatch = message.match(/\[(\d+)\/(\d+)\]/);
        if (indexMatch) {
          const [, current, total] = indexMatch;
          const progress = `${current.padStart(3)}/${total}`;
          return `${time} ${icon} ${progress} │ ${title} (${year})`;
        }
      }
    }

    if (message.includes('✅') && message.includes('lists')) {
      // Movie completion with enhanced action details and new list names
      const titleMatch = message.match(/"([^"]+)": (\d+) lists \(([^)]+)\)/);
      if (titleMatch) {
        const [, title, listCount, details] = titleMatch;
        
        // Parse the details to show clear actions
        let actionText = '';
        if (details.includes('existing') && details.includes('new')) {
          const existingMatch = details.match(/(\d+) existing/);
          const newMatch = details.match(/(\d+) new/);
          const existing = existingMatch ? existingMatch[1] : '0';
          const newLists = newMatch ? newMatch[1] : '0';
          actionText = `+ Added to ${existing} lists, * Created ${newLists} new lists`;
        } else if (details.includes('updated') && details.includes('new')) {
          const updatedMatch = details.match(/(\d+) updated/);
          const newMatch = details.match(/(\d+) new/);
          const updated = updatedMatch ? updatedMatch[1] : '0';
          const newLists = newMatch ? newMatch[1] : '0';
          actionText = `+ Added to ${updated} lists, * Created ${newLists} new lists`;
        } else if (details.includes('existing')) {
          const existingMatch = details.match(/(\d+) existing/);
          const existing = existingMatch ? existingMatch[1] : listCount;
          actionText = `+ Added to ${existing} lists`;
        } else if (details.includes('new')) {
          const newMatch = details.match(/(\d+) new/);
          const newLists = newMatch ? newMatch[1] : listCount;
          actionText = `* Created ${newLists} new lists`;
        }
        
        // Extract new list names if present
        const newListsMatch = message.match(/│ New: (.+)$/);
        if (newListsMatch) {
          const newListNames = newListsMatch[1];
          actionText += ` (${newListNames})`;
        }
        
        return `${time} ${icon} ${title.substring(0, 25).padEnd(25)} │ ${actionText}`;
      }
    }

    if (message.includes('Concurrent batch cost:')) {
      // Cost tracking
      const costMatch = message.match(/\$([0-9.]+).*Total batch: \$([0-9.]+)/);
      if (costMatch) {
        const [, batchCost, totalCost] = costMatch;
        return `${time} ${icon} COST │ Batch: $${batchCost} │ Total: $${totalCost}`;
      }
    }

    if (message.includes('Master lists:')) {
      // List count tracking  
      const listMatch = message.match(/(\d+) total/);
      if (listMatch) {
        const [, count] = listMatch;
        return `${time} ${icon} LISTS│ ${count} total collections created`;
      }
    }

    if (message.includes('Processing concurrent batch:')) {
      // Batch start
      const batchMatch = message.match(/(\d+) movies \((\d+)-(\d+)\)/);
      if (batchMatch) {
        const [, count, start, end] = batchMatch;
        return `${time} ${icon} BATCH│ Processing ${count} movies (${start}-${end})`;
      }
    }

    // Default formatting for other messages  
    const cleanMessage = message.replace(/^🎬 |^📊 |^💰 |^✅ |^❌ |^⚠️ |^🎉 |^📋 |^📈 |^💾 |^🔄 |^🎭 /, '');
    return `${time} ${icon} ${cleanMessage}`;
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  isOffPeakHours() {
    if (!CONFIG.ENFORCE_OFF_PEAK) return true;
    
    const now = new Date();
    const hour = now.getHours();
    
    // Check if current hour is in off-peak range
    if (CONFIG.OFF_PEAK_START_HOUR > CONFIG.OFF_PEAK_END_HOUR) {
      // Overnight range (e.g., 23:00 to 7:00)
      return hour >= CONFIG.OFF_PEAK_START_HOUR || hour < CONFIG.OFF_PEAK_END_HOUR;
    } else {
      // Same day range
      return hour >= CONFIG.OFF_PEAK_START_HOUR && hour < CONFIG.OFF_PEAK_END_HOUR;
    }
  }
  
  checkFailureRate() {
    const totalAttempts = this.batchFailureCount + this.batchSuccessCount;
    if (totalAttempts < 10) return false; // Need at least 10 attempts to judge
    
    const failureRate = this.batchFailureCount / totalAttempts;
    if (failureRate > CONFIG.FAILURE_RATE_THRESHOLD) {
      this.log('ERROR', `🚨 STOPPING: Failure rate ${(failureRate*100).toFixed(1)}% exceeds ${(CONFIG.FAILURE_RATE_THRESHOLD*100)}% threshold`);
      this.log('ERROR', `📉 Stats: ${this.batchFailureCount} failures, ${this.batchSuccessCount} successes out of ${totalAttempts} attempts`);
      this.shouldStopProcessing = true;
      return true;
    }
    return false;
  }
  
  getNextOffPeakTime() {
    const now = new Date();
    const nextOffPeak = new Date();
    
    if (CONFIG.OFF_PEAK_START_HOUR > CONFIG.OFF_PEAK_END_HOUR) {
      // Overnight range
      if (now.getHours() < CONFIG.OFF_PEAK_START_HOUR) {
        nextOffPeak.setHours(CONFIG.OFF_PEAK_START_HOUR, 0, 0, 0);
      } else {
        nextOffPeak.setDate(nextOffPeak.getDate() + 1);
        nextOffPeak.setHours(CONFIG.OFF_PEAK_START_HOUR, 0, 0, 0);
      }
    } else {
      // Same day range
      nextOffPeak.setHours(CONFIG.OFF_PEAK_START_HOUR, 0, 0, 0);
      if (nextOffPeak <= now) {
        nextOffPeak.setDate(nextOffPeak.getDate() + 1);
      }
    }
    
    return nextOffPeak.toLocaleString();
  }
  
  async waitForOffPeak() {
    while (!this.isOffPeakHours()) {
      await this.sleep(60000); // Check every minute
    }
  }
  
  loadMovieData() {
    try {
      const testData = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      this.log('INFO', `Loaded ${testData.movieCount || testData.movieData?.length || 0} ${this.category} movies`);
      return testData.movieData || [];
    } catch (error) {
      this.log('ERROR', `Failed to load movie data: ${error.message}`);
      throw error;
    }
  }
  
  loadBuildState() {
    if (!fs.existsSync(this.buildStateFile)) {
      return {
        metadata: {
          genre: this.category,
          totalMovies: 0,
          processedMovies: 0,
          lastCheckpoint: new Date().toISOString(),
          processingBatch: 0
        },
        allLists: {},
        processingState: {
          completedBatches: [],
          failedMovies: []
        }
      };
    }
    
    try {
      const buildState = JSON.parse(fs.readFileSync(this.buildStateFile, 'utf8'));
      this.log('INFO', `Resuming from movie index ${buildState.metadata.processedMovies}`);
      this.log('INFO', `Current lists: ${Object.keys(buildState.allLists).length}, Failed: ${buildState.processingState.failedMovies.length}`);
      return buildState;
    } catch (error) {
      this.log('WARN', `Failed to load build state, starting fresh: ${error.message}`);
      return this.loadBuildState(); // Return fresh state
    }
  }
  
  saveBuildState(buildState) {
    try {
      // Atomic write to prevent corruption
      const tempFile = this.buildStateFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(buildState, null, 2));
      fs.renameSync(tempFile, this.buildStateFile);
      
      this.log('DEBUG', `Build state saved: ${Object.keys(buildState.allLists).length} lists, ${buildState.metadata.processedMovies} movies processed`);
    } catch (error) {
      this.log('ERROR', `Failed to save build state: ${error.message}`);
      throw error;
    }
  }
  
  async callClaudeWithRetry(promptData, movie, retryCount = 0) {
    const backoffMs = Math.min(
      CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, retryCount),
      CONFIG.MAX_BACKOFF_MS
    );
    
    try {
      this.log('DEBUG', `Claude API call attempt ${retryCount + 1}`, { movieId: movie.id, movieTitle: movie.title });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
      
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2500,
        temperature: 0.7,
        messages: promptData.messages,
      });
      
      clearTimeout(timeoutId);
      
      const response = message.content[0].text;
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      
      // Calculate cost with cache savings
      let inputCost = (inputTokens / 1000000) * 3;
      if (CONFIG.USE_PROMPT_CACHING && promptData.messages[0].content && Array.isArray(promptData.messages[0].content)) {
        // Cached tokens cost 75% less (0.75/million vs 3/million)
        const cachedTokens = Math.min(inputTokens * 0.8, CONFIG.CACHE_THRESHOLD_TOKENS); // Estimate 80% cacheable
        const uncachedTokens = inputTokens - cachedTokens;
        inputCost = (cachedTokens / 1000000) * 0.75 + (uncachedTokens / 1000000) * 3;
      }
      
      const outputCost = (outputTokens / 1000000) * 15;
      const cost = inputCost + outputCost;
      
      this.log('DEBUG', `Claude response received`, { 
        inputTokens, 
        outputTokens, 
        cost: cost.toFixed(6),
        cached: CONFIG.USE_PROMPT_CACHING ? 'possible' : 'none',
        responseLength: response.length 
      });
      
      // Parse JSON response with new format
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Handle new format with assignments and newLists
      if (parsed.assignments || parsed.newLists) {
        const lists = [];
        
        // Convert assignments to old format
        if (parsed.assignments && Array.isArray(parsed.assignments)) {
          parsed.assignments.forEach(assignment => {
            lists.push({
              name: assignment.listName,
              movieIds: [assignment.movieId],
              reason: assignment.reason
            });
          });
        }
        
        // Convert newLists to old format
        if (parsed.newLists && Array.isArray(parsed.newLists)) {
          parsed.newLists.forEach(newList => {
            lists.push({
              name: newList.listName,
              movieIds: [newList.movieId],
              reason: newList.reason,
              isNew: true
            });
          });
        }
        
        return {
          success: true,
          lists: lists,
          cost: cost,
          rawResponse: response,
          assignments: parsed.assignments?.length || 0,
          newLists: parsed.newLists?.length || 0
        };
      }
      
      // Fallback to old format
      if (!parsed.lists || !Array.isArray(parsed.lists)) {
        throw new Error('Invalid response format - missing assignments/newLists or lists');
      }
      
      return {
        success: true,
        lists: parsed.lists,
        cost: cost,
        rawResponse: response
      };
      
    } catch (error) {
      this.log('WARN', `Claude API call failed (attempt ${retryCount + 1}): ${error.message}`, { movieId: movie.id });
      
      if (retryCount < CONFIG.MAX_RETRIES - 1) {
        this.log('INFO', `Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
        return this.callClaudeWithRetry(promptData, movie, retryCount + 1);
      } else {
        this.log('ERROR', `All retry attempts failed for movie ${movie.id}`, { error: error.message });
        return {
          success: false,
          error: error.message,
          cost: 0
        };
      }
    }
  }

  async createBatchRequest(movies, allListsObject) {
    const batchId = `${this.category.toLowerCase()}-${Date.now()}`;
    const requests = [];
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      const promptData = this.buildPrompt(movie, allListsObject, CONFIG.USE_PROMPT_CACHING);
      
      const request = {
        custom_id: movie.id,
        params: {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2500,
          temperature: 0.7,
          messages: promptData.messages
        }
      };
      
      requests.push(request);
    }
    
    this.log('INFO', `Created batch request with ${requests.length} movies`);
    return { batchId, requests, requestCount: requests.length };
  }

  async submitBatch(requests) {
    try {
      this.log('INFO', `Submitting batch with ${requests.length} requests`);
      
      const batch = await anthropic.beta.messages.batches.create({
        requests: requests
      });
      
      this.log('INFO', `Batch submitted: ${batch.id}`);
      return batch;
    } catch (error) {
      this.log('ERROR', `Batch submission failed: ${error.message}`);
      throw error;
    }
  }

  async pollBatchStatus(batchId) {
    const startTime = Date.now();
    const timeoutMs = CONFIG.BATCH_TIMEOUT_HOURS * 60 * 60 * 1000;
    
    while (true) {
      try {
        const batch = await anthropic.beta.messages.batches.retrieve(batchId);
        this.log('INFO', `Batch ${batchId} status: ${batch.processing_status}`);
        
        if (batch.processing_status === 'ended') {
          return batch;
        } else if (batch.processing_status === 'canceled') {
          throw new Error(`Batch canceled`);
        }
        
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Batch timeout after ${CONFIG.BATCH_TIMEOUT_HOURS} hours`);
        }
        
        await this.sleep(CONFIG.BATCH_POLL_INTERVAL_MS);
        
      } catch (error) {
        this.log('ERROR', `Batch polling failed: ${error.message}`);
        throw error;
      }
    }
  }

  async processBatchResults(batch, movies, masterLists) {
    try {
      this.log('INFO', `Processing batch results: ${batch.id}`);
      
      // Get batch results using the iterator
      const batchResults = await anthropic.beta.messages.batches.results(batch.id);
      
      let totalCost = 0;
      let successCount = 0;
      const failures = [];
      
      for await (const result of batchResults) {
        const movie = movies.find(m => m.id === result.custom_id);
        if (!movie) continue;
        
        if (result.result.type === 'succeeded') {
          const response = result.result.message.content[0].text;
          const usage = result.result.message.usage;
          
          // Calculate batch API cost (50% discount)
          const inputCost = (usage.input_tokens / 1000000) * 1.5; // 50% of $3
          const outputCost = (usage.output_tokens / 1000000) * 7.5; // 50% of $15
          const cost = inputCost + outputCost;
          totalCost += cost;
          
          // Parse and update lists
          try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.lists && Array.isArray(parsed.lists)) {
                this.updateMasterLists(masterLists, parsed.lists, movie.id);
                successCount++;
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
      
      this.log('INFO', `Batch processing complete: ${successCount} successes, ${failures.length} failures`);
      this.log('INFO', `Batch cost: $${totalCost.toFixed(6)} (50% savings applied)`);
      
      return { totalCost, successCount, failures };
      
    } catch (error) {
      this.log('ERROR', `Batch results processing failed: ${error.message}`);
      throw error;
    }
  }
  
  buildPrompt(movie, allListsObject, useCache = false) {
    const movieText = `UUID:${movie.id} "${movie.title}" (${movie.year})`;
    
    const masterLists = Object.values(allListsObject || {});
    
    if (masterLists.length === 0) {
      const prompt = `You are a film curator categorizing ${this.category.toLowerCase()} films into thematic lists.

Since this is the first movie, create 2-4 broad thematic lists (2-4 word names) that this movie belongs to. Each list should be broad enough to potentially include 5+ future movies.

Consider: era, style, themes, setting, subgenres, cultural significance.

Movie to analyze: ${movieText}

Use your knowledge of this film to create meaningful thematic categories.

Output Format (JSON only):
{
  "assignments": [
    {
      "listName": "Golden Age Hollywood Musicals",
      "movieId": "${movie.id}",
      "reason": "Brief explanation of thematic fit"
    }
  ],
  "newLists": [
    {
      "listName": "Broadway Stage Adaptations",
      "movieId": "${movie.id}",
      "reason": "Why new: Captures theatrical origins; broad category for many films"
    }
  ]
}`;
      
      return { prompt, messages: [{ role: 'user', content: prompt }] };
      
    } else {
      // Build comprehensive list context with all existing lists and descriptions
      const allListsText = masterLists.map(list => {
        const movieCount = list.movieIds?.length > 0 ? ` (${list.movieIds.length} movies)` : '';
        // Use stored description if available, otherwise generate one
        const description = list.description || this.generateListDescription(list.name);
        return `"${list.name}"${movieCount} - ${description}`;
      }).join('\n');
      
      // Build evidence-based system prompt
      const systemPrompt = `You are a film curator categorizing ${this.category.toLowerCase()} films into thematic lists. You have access to ALL ${masterLists.length} existing lists below.

For each movie, use your knowledge of the film to:

1. Assign it to 2-5 EXISTING lists where it fits thematically (only if >70% thematic match).
2. Create 0-1 NEW list ONLY if this movie has a narrow, specific theme not covered by existing collections. New list names must be 3-5 words maximum.

PRIORITY: Reuse existing lists to avoid proliferation. Be evidence-based using your knowledge of the film's plot, themes, cultural elements.

Output Format (JSON only):
{
  "assignments": [
    {
      "listName": "Existing List Name",
      "movieId": "MOVIE_ID"
    }
  ],
  "newLists": [
    {
      "listName": "New Specific Theme",
      "movieId": "MOVIE_ID",
      "description": "Focused thematic description for future movie assignments"
    }
  ]
}

Full Existing Lists (all ${masterLists.length}):
${allListsText}`;

      const userPrompt = `Movie to analyze: ${movieText}

Use your knowledge of this film to make evidence-based categorization decisions.`;
      
      if (CONFIG.USE_PROMPT_CACHING && useCache) {
        return {
          prompt: systemPrompt + '\n\n' + userPrompt,
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
          prompt: systemPrompt + '\n\n' + userPrompt,
          messages: [{ role: 'user', content: systemPrompt + '\n\n' + userPrompt }]
        };
      }
    }
  }
  
  generateListDescription(listName) {
    // Generate brief contextual descriptions for better AI decision-making
    const name = listName.toLowerCase();
    
    if (name.includes('broadway') || name.includes('stage')) return 'Theatrical stage adaptations';
    if (name.includes('hollywood') || name.includes('golden age')) return 'Classic studio era films';
    if (name.includes('war') || name.includes('wwii') || name.includes('military')) return 'Military themed films';
    if (name.includes('romance') || name.includes('love')) return 'Romantic stories';
    if (name.includes('comedy') || name.includes('screwball')) return 'Comedy-focused films';
    if (name.includes('folk') || name.includes('southern') || name.includes('american')) return 'Folk and cultural themes';
    if (name.includes('jazz') || name.includes('blues') || name.includes('swing')) return 'Jazz era styles';
    if (name.includes('dance') || name.includes('choreograph')) return 'Dance-centered productions';
    if (name.includes('biopic') || name.includes('story of') || name.includes('life of')) return 'Biographical stories';
    if (name.includes('family') || name.includes('children')) return 'Family-oriented films';
    if (name.includes('backstage') || name.includes('showbiz')) return 'Behind-the-scenes entertainment';
    if (name.includes('period') || name.includes('historical') || name.includes('era')) return 'Historical period settings';
    if (name.includes('anthology') || name.includes('revue')) return 'Multi-story collections';
    if (name.includes('adaptation') || name.includes('based on')) return 'Adapted from other sources';
    if (name.includes('mentor') || name.includes('teacher')) return 'Mentorship and guidance themes';
    if (name.includes('crime') || name.includes('noir') || name.includes('detective')) return 'Crime and mystery themes';
    if (name.includes('action') || name.includes('adventure')) return 'Action and adventure films';
    if (name.includes('horror') || name.includes('thriller')) return 'Horror and suspense films';
    if (name.includes('drama') || name.includes('emotional')) return 'Dramatic and emotional stories';
    
    // Default based on film category
    return `${this.category} film category`;
  }

  updateMasterLists(masterLists, movieLists, movieId) {
    let newListsCreated = 0;
    let existingListsUpdated = 0;
    
    movieLists.forEach(movieList => {
      const existingList = masterLists.find(list => list.name === movieList.name);
      if (existingList) {
        if (!existingList.movieIds.includes(movieId)) {
          existingList.movieIds.push(movieId);
          existingListsUpdated++;
        }
      } else {
        masterLists.push({
          name: movieList.name,
          movieIds: [movieId],
          createdAt: new Date().toISOString()
        });
        newListsCreated++;
      }
    });
    
    return { newListsCreated, existingListsUpdated };
  }

  updateBuildLists(allListsObject, movieLists, movieId) {
    let newListsCreated = 0;
    let existingListsUpdated = 0;
    const newListNames = [];
    
    movieLists.forEach(movieList => {
      const existingList = allListsObject[movieList.name];
      if (existingList) {
        if (!existingList.movieIds.includes(movieId)) {
          existingList.movieIds.push(movieId);
          existingList.size = existingList.movieIds.length;
          existingList.lastUpdated = new Date().toISOString();
          existingListsUpdated++;
        }
      } else {
        allListsObject[movieList.name] = {
          id: `build-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: movieList.name,
          description: movieList.description || `Thematic collection for ${this.category} films`,
          movieIds: [movieId],
          size: 1,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        newListsCreated++;
        newListNames.push(movieList.name);
      }
    });

    return { newListsCreated, existingListsUpdated, newListNames };
  }
  
  async analyzeMovies(startIndex = 0, count = null) {
    const movieData = this.loadMovieData();
    const buildState = this.loadBuildState();
    
    // Initialize metadata if not present
    if (!buildState.metadata.totalMovies) {
      buildState.metadata.totalMovies = movieData.length;
      this.saveBuildState(buildState);
    }
    
    // Determine processing range
    const actualStartIndex = Math.max(startIndex, buildState.metadata.processedMovies);
    const endIndex = count ? Math.min(actualStartIndex + count, movieData.length) : movieData.length;
    const moviesToProcess = movieData.slice(actualStartIndex, endIndex);
    
    this.log('INFO', `Starting analysis: ${moviesToProcess.length} movies (${actualStartIndex + 1}-${endIndex})`);
    this.log('INFO', `Current state: ${Object.keys(buildState.allLists).length} lists, ${buildState.metadata.processedMovies} movies processed`);
    
    if (CONFIG.USE_BATCH_API && moviesToProcess.length >= CONFIG.BATCH_SIZE) {
      return this.analyzeBatchMode(moviesToProcess, buildState, actualStartIndex, movieData.length);
    } else {
      return this.analyzeRealTimeMode(moviesToProcess, buildState, actualStartIndex, movieData.length);
    }
  }

  async analyzeBatchMode(moviesToProcess, buildState, actualStartIndex, totalMovies) {
    this.log('INFO', `🔄 Using Batch API mode for ${moviesToProcess.length} movies`);
    
    let processedCount = 0;
    const batches = [];
    
    // LIMITED PARALLEL PROCESSING: Process up to 3 batches concurrently
    const allBatches = [];
    for (let i = 0; i < moviesToProcess.length; i += CONFIG.BATCH_SIZE) {
      const batchMovies = moviesToProcess.slice(i, Math.min(i + CONFIG.BATCH_SIZE, moviesToProcess.length));
      allBatches.push(batchMovies);
    }
    
    this.log('INFO', `📊 Processing ${allBatches.length} batches with ${CONFIG.CONCURRENT_BATCHES} concurrent`);
    
    const activeBatches = [];
    let batchIndex = 0;
    
    while (batchIndex < allBatches.length || activeBatches.length > 0) {
      // Fill up to concurrent limit
      while (activeBatches.length < CONFIG.CONCURRENT_BATCHES && batchIndex < allBatches.length) {
        const batchMovies = allBatches[batchIndex];
        const batchNumber = batchIndex + 1;
        
        try {
          this.log('INFO', `📦 Submitting batch ${batchNumber}/${allBatches.length}: ${batchMovies.length} movies`);
          
          // Create and submit batch
          const { batchId, requests } = await this.createBatchRequest(batchMovies, buildState.allLists);
          const batch = await this.submitBatch(requests);
          
          activeBatches.push({
            batch,
            movies: batchMovies,
            batchNumber,
            pollPromise: this.pollBatchStatus(batch.id)
          });
          
          batchIndex++;
          
        } catch (error) {
          this.log('ERROR', `Failed to submit batch ${batchNumber}: ${error.message}`);
          // Record failures and continue
          batchMovies.forEach(movie => {
            buildState.processingState.failedMovies.push({
              movieId: movie.id,
              title: movie.title,
              error: `Batch submission failed: ${error.message}`,
              timestamp: new Date().toISOString()
            });
          });
          batchIndex++;
        }
      }
      
      // Wait for first batch to complete
      if (activeBatches.length > 0) {
        try {
          // Use Promise.race to get first completed batch
          const completedIndex = await Promise.race(
            activeBatches.map((activeBatch, index) => 
              activeBatch.pollPromise.then(() => index)
            )
          );
          
          const completedBatch = activeBatches[completedIndex];
          const completedBatchResult = await completedBatch.pollPromise;
          
          this.log('INFO', `✅ Batch ${completedBatch.batchNumber} completed, processing results`);
          
          // Process results and update build state
          const results = await this.processBatchResults(completedBatchResult, completedBatch.movies, buildState.allLists);
          
          // Update build state
          processedCount += results.successCount;
          buildState.metadata.processedMovies += results.successCount;
          buildState.processingState.failedMovies.push(...results.failures);
          
          this.log('INFO', `📊 Batch ${completedBatch.batchNumber}: ${results.successCount} successes, ${results.failures.length} failures`);
          this.saveBuildState(buildState);
          
          // Remove completed batch from active list
          activeBatches.splice(completedIndex, 1);
          
        } catch (error) {
          this.log('ERROR', `Batch processing failed: ${error.message}`);
          // Find and remove the failed batch
          activeBatches.shift(); // Remove first batch as fallback
        }
      }
    }
    
    return this.generateFinalSummary(buildState, totalMovies, processedCount);
  }

  async processConcurrentBatch(moviesBatch, buildState, startIndex, totalMovies) {
    // Check off-peak hours if enforced
    if (CONFIG.ENFORCE_OFF_PEAK && !this.isOffPeakHours()) {
      const nextOffPeak = this.getNextOffPeakTime();
      this.log('WARN', `🕛 Waiting for off-peak hours. Next window: ${nextOffPeak}`);
      await this.waitForOffPeak();
    }
    
    // Check failure rate before processing
    if (this.checkFailureRate()) {
      throw new Error('Processing stopped due to high failure rate');
    }
    
    // Process movies concurrently while maintaining individual analysis
    const promises = moviesBatch.map(async (movie, batchIndex) => {
      const globalIndex = startIndex + batchIndex;
      
      try {
        this.log('INFO', `[${globalIndex + 1}/${totalMovies}] Analyzing: "${movie.title}" (${movie.year})`);
        
        // Each movie gets individual analysis with current state
        const useCache = CONFIG.USE_PROMPT_CACHING && 
                        Object.keys(buildState.allLists).length > 10 && 
                        this.cacheRefreshCounter < CONFIG.CACHE_REFRESH_INTERVAL;
        
        const promptData = this.buildPrompt(movie, buildState.allLists, useCache);
        const response = await this.callClaudeWithRetry(promptData, movie);
        
        // Track success/failure for rate monitoring
        if (response.success) {
          this.batchSuccessCount++;
        } else {
          this.batchFailureCount++;
        }
        
        return { movie, globalIndex, response };
        
      } catch (error) {
        this.log('ERROR', `Unexpected error processing movie ${movie.id}: ${error.message}`);
        this.batchFailureCount++;
        return { movie, globalIndex, response: { success: false, error: error.message } };
      }
    });
    
    // Wait for all concurrent requests to complete
    const results = await Promise.all(promises);
    
    // Process results sequentially to maintain state consistency
    let batchStats = {
      newListsCreated: 0,
      existingListsUpdated: 0,
      totalPlacements: 0,
      moviesProcessed: 0
    };
    
    let batchCost = 0;
    
    for (const { movie, globalIndex, response } of results) {
      if (response.success) {
        const updates = this.updateBuildLists(buildState.allLists, response.lists, movie.id);
        
        batchStats.newListsCreated += updates.newListsCreated;
        batchStats.existingListsUpdated += updates.existingListsUpdated;
        batchStats.totalPlacements += response.lists.length;
        batchStats.moviesProcessed++;
        
        buildState.metadata.processedMovies++;
        batchCost += response.cost || 0;
        this.cacheRefreshCounter++;
        
        const assignmentInfo = response.assignments ? `${response.assignments} existing` : `${updates.existingListsUpdated} updated`;
        const newListInfo = response.newLists ? `${response.newLists} new` : `${updates.newListsCreated} new`;
        
        // Enhanced logging with new list names
        let logMessage = `✅ "${movie.title}": ${response.lists.length} lists (${assignmentInfo}, ${newListInfo})`;
        if (updates.newListNames && updates.newListNames.length > 0) {
          const listNames = updates.newListNames.map(name => `"${name}"`).join(', ');
          logMessage += ` │ New: ${listNames}`;
        }
        
        this.log('INFO', logMessage);
        
      } else {
        buildState.processingState.failedMovies.push({
          movieId: movie.id,
          title: movie.title,
          year: movie.year,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        this.log('ERROR', `❌ "${movie.title}": ${response.error}`);
      }
    }
    
    return { batchStats, batchCost };
  }

  async analyzeRealTimeMode(moviesToProcess, buildState, actualStartIndex, totalMovies) {
    this.log('INFO', `⚡ Using real-time mode for ${moviesToProcess.length} movies`);
    
    let processedInBatch = 0;
    let batchCost = 0;
    
    // Track batch-level metrics
    const batchStats = {
      startListCount: Object.keys(buildState.allLists).length,
      newListsCreated: 0,
      existingListsUpdated: 0,
      totalPlacements: 0,
      moviesProcessed: 0
    };
    
    // Process movies in concurrent batches for speed while preserving individual analysis
    for (let i = 0; i < moviesToProcess.length; i += CONFIG.CONCURRENT_MOVIES) {
      const moviesBatch = moviesToProcess.slice(i, i + CONFIG.CONCURRENT_MOVIES);
      const batchStartIndex = actualStartIndex + i;
      
      this.log('INFO', `🚀 Processing concurrent batch: ${moviesBatch.length} movies (${batchStartIndex + 1}-${batchStartIndex + moviesBatch.length})`);
      
      // Process this concurrent batch
      const results = await this.processConcurrentBatch(moviesBatch, buildState, batchStartIndex, totalMovies);
      
      // Add delay between batches for rate limiting
      if (i + CONFIG.CONCURRENT_MOVIES < moviesToProcess.length) {
        this.log('DEBUG', `🕰️ Rate limiting delay: ${CONFIG.BATCH_DELAY_MS}ms`);
        await this.sleep(CONFIG.BATCH_DELAY_MS);
      }
      
      // Check if we should stop due to failures
      if (this.shouldStopProcessing) {
        this.log('ERROR', '🚨 Processing stopped due to high failure rate');
        break;
      }
      
      // Update batch statistics
      batchStats.newListsCreated += results.batchStats.newListsCreated;
      batchStats.existingListsUpdated += results.batchStats.existingListsUpdated;
      batchStats.totalPlacements += results.batchStats.totalPlacements;
      batchStats.moviesProcessed += results.batchStats.moviesProcessed;
      
      batchCost += results.batchCost;
      processedInBatch += results.batchStats.moviesProcessed;
      
      // Track total cost in build state
      buildState.metadata.totalCost = (buildState.metadata.totalCost || 0) + results.batchCost;
      
      this.log('INFO', `💰 Concurrent batch cost: $${results.batchCost.toFixed(6)} | Total batch: $${batchCost.toFixed(6)}`);
      this.log('INFO', `📊 Master lists: ${Object.keys(buildState.allLists).length} total`);
      this.log('INFO', `📈 Success rate: ${this.batchSuccessCount}/${this.batchSuccessCount + this.batchFailureCount} (${((this.batchSuccessCount/(this.batchSuccessCount + this.batchFailureCount || 1))*100).toFixed(1)}%)\n`);
      
      // Enhanced progress reporting with visual progress bar
      if (this.progressCallback || true) { // Always show progress in logs
        const percent = Math.round((processedInBatch / moviesToProcess.length) * 100);
        const remainingMovies = moviesToProcess.length - processedInBatch;
        const etaMinutes = Math.round((remainingMovies * 2.2) / 60); // 2.2s per movie
        
        // Visual progress bar
        const progressBarLength = 30;
        const filledLength = Math.round((percent / 100) * progressBarLength);
        const emptyLength = progressBarLength - filledLength;
        const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
        
        // Status line with all key metrics
        const statusLine = `PROGRESS │ ${progressBar} │ ${percent}% │ ${processedInBatch}/${moviesToProcess.length} movies │ ${Object.keys(buildState.allLists).length} lists │ $${(buildState.metadata.totalCost || 0).toFixed(3)} │ ETA: ${etaMinutes}min`;
        this.log('INFO', statusLine);
        
        // API progress callback
        if (this.progressCallback) {
          this.progressCallback({
            percent,
            status: 'processing',
            moviesProcessed: processedInBatch,
            totalMovies: moviesToProcess.length,
            listsCreated: Object.keys(buildState.allLists).length,
            totalCost: buildState.metadata.totalCost || 0,
            etaMinutes: etaMinutes > 0 ? etaMinutes : 0
          });
        }
      }
      
      // Reset cache counter periodically
      if (this.cacheRefreshCounter >= CONFIG.CACHE_REFRESH_INTERVAL) {
        this.cacheRefreshCounter = 0;
        this.log('DEBUG', 'Cache refresh counter reset');
      }
      
      // Save progress periodically
      if ((processedInBatch % CONFIG.SAVE_INTERVAL === 0) || (i + CONFIG.CONCURRENT_MOVIES >= moviesToProcess.length)) {
        this.saveBuildState(buildState);
        this.log('INFO', `💾 Build state saved (${processedInBatch}/${moviesToProcess.length} in batch)\n`);
        
        // Log batch summary at completion
        if (i + CONFIG.CONCURRENT_MOVIES >= moviesToProcess.length) {
          this.logBatchSummary(actualStartIndex, moviesToProcess.length, batchStats, batchCost);
        }
      }
    }
    
    return this.generateFinalSummary(buildState, totalMovies, processedInBatch);
  }

  logBatchSummary(startIndex, batchSize, batchStats, batchCost) {
    const batchNumber = Math.floor(startIndex / 50) + 1;
    const endListCount = batchStats.startListCount + batchStats.newListsCreated;
    
    this.log('INFO', '📊 =========================');
    this.log('INFO', `🎯 BATCH ${batchNumber} SUMMARY`);
    this.log('INFO', `📽️  Movies processed: ${batchStats.moviesProcessed}/${batchSize}`);
    this.log('INFO', `📋 Lists at start: ${batchStats.startListCount}`);
    this.log('INFO', `🆕 New lists created: ${batchStats.newListsCreated}`);
    this.log('INFO', `🔄 Existing lists updated: ${batchStats.existingListsUpdated}`);
    this.log('INFO', `📋 Lists at end: ${endListCount} (+${batchStats.newListsCreated})`);
    this.log('INFO', `🎬 Total placements: ${batchStats.totalPlacements}`);
    this.log('INFO', `📊 Avg placements per movie: ${(batchStats.totalPlacements / batchStats.moviesProcessed).toFixed(1)}`);
    this.log('INFO', `💰 Batch cost: $${batchCost.toFixed(6)}`);
    this.log('INFO', `📈 New vs Reuse ratio: ${batchStats.newListsCreated}:${batchStats.existingListsUpdated}`);
    this.log('INFO', '📊 =========================\n');
  }

  generateFinalSummary(buildState, totalMovies, processedInThisRun) {
    const allListsArray = Object.values(buildState.allLists || {});
    const singleItemLists = allListsArray.filter(list => list.movieIds?.length === 1);
    const multiItemLists = allListsArray.filter(list => list.movieIds?.length >= 6); // Production ready
    const totalPlacements = allListsArray.reduce((sum, list) => sum + (list.movieIds?.length || 0), 0);
    
    // Enhanced completion header
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('🎉 BROWSE COLLECTION GENERATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('');
    // Results summary table
    const costPerMovie = buildState.metadata.processedMovies > 0 ? 
      (buildState.metadata.totalCost || 0) / buildState.metadata.processedMovies : 0;
    const avgPlacementsPerMovie = buildState.metadata.processedMovies > 0 ? 
      totalPlacements / buildState.metadata.processedMovies : 0;
    
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│                          FINAL RESULTS                             │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log(`│ 🎬 Movies Processed    │ ${buildState.metadata.processedMovies.toString().padStart(6)} / ${totalMovies.toString().padEnd(6)} │ ${(buildState.metadata.processedMovies/totalMovies*100).toFixed(1).padStart(5)}% success │`);
    console.log(`│ 📋 Collections Created │ ${allListsArray.length.toString().padStart(6)} total          │ ${multiItemLists.length.toString().padStart(5)} production-ready │`);
    console.log(`│ 🎯 Movie Placements    │ ${totalPlacements.toString().padStart(6)} total          │ ${avgPlacementsPerMovie.toFixed(1).padStart(5)} avg per movie   │`);
    console.log(`│ 💰 Processing Cost     │ $${(buildState.metadata.totalCost || 0).toFixed(4).padStart(5)} total         │ $${costPerMovie.toFixed(4).padStart(5)} per movie      │`);
    console.log(`│ ❌ Failed Movies       │ ${(buildState.processingState.failedMovies?.length || 0).toString().padStart(6)} failures        │ ${((buildState.processingState.failedMovies?.length || 0)/totalMovies*100).toFixed(1).padStart(5)}% failure rate  │`);
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    console.log('');
    
    // Show sample lists
    this.log('INFO', '🎭 Sample master lists:');
    allListsArray.slice(0, 10).forEach(list => {
      this.log('INFO', `  - "${list.name}" (${list.movieIds?.length || 0} movies)`);
    });
    
    return {
      totalLists: allListsArray.length,
      totalMoviesProcessed: buildState.metadata.processedMovies,
      totalMoviesInCategory: totalMovies,
      totalCost: buildState.metadata.totalCost || 0,
      failures: buildState.processingState.failedMovies?.length || 0,
      lists: allListsArray
    };
  }

  // ===== PUBLIC API - Simplified Interface =====
  
  /**
   * Generate browse collections for a genre
   * @param {Object} options - Configuration options
   * @param {Function} options.onProgress - Progress callback (percent, status, eta)
   * @param {number} options.maxMovies - Limit movies for testing
   * @returns {Promise<Object>} Generation results
   */
  async generateBrowseCollections(options = {}) {
    this.progressCallback = options.onProgress;
    
    try {
      const result = await this.analyzeMovies(0, options.maxMovies);
      
      // Call final progress
      if (this.progressCallback) {
        this.progressCallback({
          percent: 100,
          status: 'completed',
          moviesProcessed: result.summary?.totalMoviesProcessed || 0,
          listsCreated: result.summary?.totalLists || 0,
          totalCost: result.summary?.totalCost || 0
        });
      }
      
      return {
        success: true,
        summary: result.summary,
        collections: result.summary?.lists || []
      };
      
    } catch (error) {
      if (this.progressCallback) {
        this.progressCallback({
          percent: -1,
          status: 'failed',
          error: error.message
        });
      }
      throw error;
    }
  }
  
  // ===== UTILITY METHODS FOR PRODUCTION INTEGRATION =====
  
  exportForProduction(format = 'json') {
    const progress = this.loadProgress();
    const productionData = {
      category: this.category,
      totalLists: progress.masterLists.length,
      totalMovies: progress.totalMoviesProcessed,
      lists: progress.masterLists.map(list => ({
        id: `${this.category.toLowerCase()}-${list.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: list.name,
        category: this.category,
        movieCount: list.movieIds.length,
        movieIds: list.movieIds,
        createdAt: list.createdAt || new Date().toISOString()
      })),
      generatedAt: new Date().toISOString()
    };
    
    if (format === 'sql') {
      return this.generateSQLInserts(productionData);
    } else if (format === 'api') {
      return this.generateAPIPayload(productionData);
    } else {
      return productionData;
    }
  }
  
  generateSQLInserts(data) {
    const listInserts = data.lists.map(list => 
      `INSERT INTO movie_lists (id, name, description, category, movie_count, created_at) VALUES ('${list.id}', '${list.name.replace(/'/g, "''")}', 'AI-generated ${data.category.toLowerCase()} thematic list', '${data.category}', ${list.movieCount}, '${list.createdAt}');`
    ).join('\n');
    
    const membershipInserts = data.lists.flatMap(list =>
      list.movieIds.map(movieId => 
        `INSERT INTO movie_list_memberships (list_id, movie_uuid) VALUES ('${list.id}', '${movieId}');`
      )
    ).join('\n');
    
    return {
      listInserts,
      membershipInserts,
      fullSQL: `-- AI-Generated ${data.category} Movie Lists\n-- Generated: ${data.generatedAt}\n\n${listInserts}\n\n${membershipInserts}`
    };
  }
  
  generateAPIPayload(data) {
    return {
      category: data.category,
      lists: data.lists,
      metadata: {
        totalLists: data.totalLists,
        totalMovies: data.totalMovies,
        generatedAt: data.generatedAt,
        method: 'ai-thematic-analysis'
      }
    };
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node browse-collection-generator.js <category> [count]');
    console.log('Example: node browse-collection-generator.js Animation');
    console.log('Example: node browse-collection-generator.js Animation 50');
    console.log('');
    console.log('Processes movies from movie-categorization.json production data');
    console.log('For resumable processing, just run again with same parameters');
    process.exit(1);
  }
  
  const [category, countStr] = args;
  const count = countStr ? parseInt(countStr) : null;
  const outputDir = './list-analysis-output';
  
  // Load production categorization data
  const categorizationPath = './movie-categorization.json';
  if (!fs.existsSync(categorizationPath)) {
    console.error('💥 movie-categorization.json not found');
    process.exit(1);
  }
  
  const categorization = JSON.parse(fs.readFileSync(categorizationPath, 'utf8'));
  if (!categorization.categories[category]) {
    console.error(`💥 Category '${category}' not found in production data`);
    console.error(`Available categories: ${Object.keys(categorization.categories).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`🎬 Browse Collection Generator`);
  console.log(`Category: ${category}`);
  console.log(`Output: ${outputDir}`);
  console.log('');
  
  // Use the normalized category file
  const normalizedFile = `./normalized-categories/${category.toLowerCase().replace(/[^a-z0-9]/g, '-')}-normalized.json`;
  
  if (!fs.existsSync(normalizedFile)) {
    console.error(`💥 Normalized category file not found: ${normalizedFile}`);
    console.error('Run normalize-tmdb-dataset.js first to generate normalized data');
    process.exit(1);
  }
  
  console.log(`📝 Using normalized data: ${normalizedFile}`);
  const categoryData = JSON.parse(fs.readFileSync(normalizedFile, 'utf8'));
  
  // Apply count limit if specified
  if (count && count < categoryData.movieCount) {
    categoryData.movieData = categoryData.movieData.slice(0, count);
    categoryData.movieCount = count;
    console.log(`📝 Limited to first ${count} movies`);
  }
  
  // Create a temporary data file for processing
  const tempDataFile = `${category.toLowerCase()}-production.json`;
  fs.writeFileSync(tempDataFile, JSON.stringify(categoryData, null, 2));
  
  const generator = new BrowseCollectionGenerator(category, tempDataFile, outputDir);
  
  try {
    const results = await generator.generateBrowseCollections({
      concurrent: CONFIG.CONCURRENT_MOVIES
    });
    
    console.log('\n🎯 FINAL RESULTS:');
    console.log(`Lists Generated: ${results.totalLists || 'N/A'}`);
    console.log(`Movies Processed: ${results.totalMoviesProcessed || 'N/A'}/${results.totalMoviesInCategory || 'N/A'}`);
    console.log(`Total Cost: $${results.totalCost ? results.totalCost.toFixed(6) : 'N/A'}`);
    console.log(`Failures: ${results.failures || 0}`);
    
    // Clean up temp file
    fs.unlinkSync(tempDataFile);
    
  } catch (error) {
    console.error('💥 Generation failed:', error.message);
    if (fs.existsSync(tempDataFile)) {
      fs.unlinkSync(tempDataFile);
    }
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BrowseCollectionGenerator };