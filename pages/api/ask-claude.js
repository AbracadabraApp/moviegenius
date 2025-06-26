/**
 * Ask Claude API Route
 * 
 * Handles movie-related questions using Claude's comprehensive film knowledge.
 * Returns interleaved text/movie content + extensive "More Ideas" section.
 * Uses TMDB for posters only.
 * 
 * Performance optimizations:
 * - Request deduplication to prevent redundant API calls
 * - Redis caching for Claude responses
 * - Cost tracking for API usage monitoring
 */
import { createClient } from '@supabase/supabase-js';
import { 
  withErrorHandling, 
  ApiErrors, 
  successResponse, 
  validateRequiredFields,
  checkRateLimit 
} from '../../lib/api-utils';
import { getCache } from '../../lib/cache.js';
import { getPerformanceMonitor } from '../../lib/performance-monitor.js';

// Request deduplication cache - prevents duplicate requests within 30 seconds
const pendingRequests = new Map();
const REQUEST_DEDUP_TTL = 30000; // 30 seconds

/**
 * Intelligently saves movie data to Supabase with TMDB integration
 * 
 * This function implements a 3-step decision process:
 * 1. Check if movie exists in Supabase (by title + year)
 * 2. If exists: Only update slug if missing (respects existing data)
 * 3. If new: Do full TMDB lookup and create complete record
 * 
 * @param {Object} movieData - Movie data from Claude response
 * @param {string} movieData.title - Movie title from Claude
 * @param {number} movieData.year - Movie year from Claude  
 * @param {string} movieData.slug - Movie description from Claude
 * @returns {Promise<Object|null>} Saved/updated movie record or null on error
 * 
 * @example
 * // For new movie: Creates complete record with TMDB + Claude data
 * await saveMovieData({
 *   title: "The Godfather",
 *   year: 1972,
 *   slug: "Mafia family saga spanning three generations"
 * })
 * 
 * @example
 * // For existing movie: Only updates slug if missing
 * await saveMovieData({
 *   title: "Casablanca", // Already in DB
 *   year: 1942,
 *   slug: "Wartime romance in Morocco" // Only saved if DB slug is null
 * })
 */
async function saveMovieData(movieData) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Step 1: Check if movie already exists in Supabase
    const { data: existingMovie, error: findError } = await supabase
      .from('movies')
      .select('*')
      .eq('title', movieData.title)
      .eq('year', movieData.year)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new movies
      throw findError;
    }

    if (existingMovie) {
      // Step 2: Movie exists - only update slug if missing
      if (!existingMovie.slug && movieData.slug) {
        const { data, error } = await supabase
          .from('movies')
          .update({ 
            slug: movieData.slug,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMovie.id)
          .select()
          .single();

        if (error) throw error;

        console.log(`Enhanced existing movie with slug: ${movieData.title} (${movieData.year})`);
        return data;
      } else {
        console.log(`Movie already has slug, skipping: ${movieData.title} (${movieData.year})`);
        return existingMovie;
      }
    } else {
      // Step 3: Movie doesn't exist - do full TMDB lookup and create complete record
      console.log(`New movie discovered: ${movieData.title} (${movieData.year})`);
      
      const tmdbData = await fetchFullTMDBData(movieData.title, movieData.year);
      
      // Check if movie with this TMDB ID already exists (duplicate prevention)
      if (tmdbData?.tmdb_id) {
        const { data: existingTmdbMovie } = await supabase
          .from('movies')
          .select('*')
          .eq('tmdb_id', tmdbData.tmdb_id)
          .single();

        if (existingTmdbMovie) {
          console.log(`Movie already exists with TMDB ID ${tmdbData.tmdb_id}: ${existingTmdbMovie.title} (${existingTmdbMovie.year})`);
          // Update slug if missing
          if (!existingTmdbMovie.slug && movieData.slug) {
            const { data, error } = await supabase
              .from('movies')
              .update({ 
                slug: movieData.slug,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingTmdbMovie.id)
              .select()
              .single();
            
            if (error) throw error;
            console.log(`Enhanced existing movie with slug: ${existingTmdbMovie.title} (${existingTmdbMovie.year})`);
            return data;
          }
          return existingTmdbMovie;
        }
      }
      
      const newMovie = {
        // TMDB data (source of truth)
        tmdb_id: tmdbData?.tmdb_id || null,
        official_title: tmdbData?.official_title || movieData.title,
        release_date: tmdbData?.release_date || null,
        poster_url: tmdbData?.poster_url || null,
        
        // Claude data (our enhancement)
        title: movieData.title,
        year: movieData.year,
        slug: movieData.slug || null,
        
        // Metadata
        streaming_data: null, // Will be enhanced later if needed
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('movies')
        .insert(newMovie)
        .select()
        .single();

      if (error) throw error;

      console.log(`Created complete movie record: ${movieData.title} (${movieData.year}) with TMDB ID: ${tmdbData?.tmdb_id || 'none'}`);
      return data;
    }
  } catch (error) {
    console.error('Error saving movie data to Supabase:', error);
    // Optionally: fallback to original JSON method if Supabase fails
  }
}

/**
 * Fetches complete movie data from TMDB API (not just poster)
 * 
 * This function was refactored to return ALL TMDB data instead of just poster URL.
 * Previously, we were throwing away valuable TMDB IDs and metadata.
 * 
 * @param {string} title - Movie title to search for
 * @param {number} year - Movie year to improve search accuracy
 * @returns {Promise<Object|null>} Complete TMDB movie data or null if not found
 * 
 * @returns {Object} tmdbData
 * @returns {number} tmdbData.tmdb_id - Official TMDB identifier (was being thrown away!)
 * @returns {string} tmdbData.title - Official TMDB title
 * @returns {number} tmdbData.year - Year extracted from release_date
 * @returns {string|null} tmdbData.release_date - Full release date (YYYY-MM-DD)
 * @returns {string|null} tmdbData.poster_url - Full poster URL or null
 * @returns {string} tmdbData.official_title - Same as title (for schema consistency)
 * @returns {string|null} tmdbData.overview - Movie overview/synopsis
 * 
 * @example
 * const tmdbData = await fetchFullTMDBData("The Matrix", 1999)
 * // Returns: {
 * //   tmdb_id: 603,
 * //   title: "The Matrix", 
 * //   year: 1999,
 * //   release_date: "1999-03-30",
 * //   poster_url: "https://image.tmdb.org/t/p/w500/...",
 * //   official_title: "The Matrix",
 * //   overview: "A computer hacker learns..."
 * // }
 */
async function fetchFullTMDBData(title, year) {
  // Initialize cache service
  const cache = getCache();
  
  // Cache TMDB movie search with 7-day TTL
  return await cache.cacheTMDBResponse(
    'search_movie',
    { title, year },
    async () => {
      console.log(`🔄 Cache miss - fetching TMDB data for: ${title} (${year})`);
      
      try {
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
        );
        
        if (tmdbResponse.ok) {
          const tmdbData = await tmdbResponse.json();
          const movie = tmdbData.results?.[0];
          
          if (movie) {
            const result = {
              tmdb_id: movie.id,
              title: movie.title,
              year: new Date(movie.release_date).getFullYear() || year,
              release_date: movie.release_date || null,
              poster_url: movie.poster_path 
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : null,
              official_title: movie.title,
              overview: movie.overview || null
            };
            
            console.log(`💾 Cached TMDB data for: ${title} (${year}) - TMDB ID: ${movie.id}`);
            return result;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch TMDB data for ${title}:`, error);
      }
      
      return null;
    }
  );
}

/**
 * Request deduplication helper - prevents duplicate requests
 * 
 * Creates a unique key for each request and checks if an identical request
 * is already in progress. If so, waits for the existing request to complete
 * rather than making a redundant API call.
 * 
 * @param {string} question - User's question for key generation
 * @returns {Promise<Object|null>} Existing response or null if no duplicate
 */
async function checkRequestDeduplication(question) {
  const monitor = getPerformanceMonitor();
  
  // Create normalized key for request deduplication
  const requestKey = question.toLowerCase().trim().replace(/\s+/g, '_').substring(0, 100);
  
  // Check if identical request is already pending
  if (pendingRequests.has(requestKey)) {
    const existingRequest = pendingRequests.get(requestKey);
    
    // Track deduplication event
    monitor.trackMetric('request_deduplication', 1, {
      question: question.substring(0, 50),
      requestKey,
      cost_savings: 'prevented_duplicate_api_call'
    });
    
    console.log(`🔄 Request deduplication: Waiting for existing request: "${question.substring(0, 50)}..."`);
    
    try {
      // Wait for existing request to complete
      const result = await existingRequest.promise;
      console.log(`✅ Request deduplication: Got cached result for: "${question.substring(0, 50)}..."`);
      return result;
    } catch (error) {
      // If existing request failed, allow this one to proceed
      console.log(`⚠️ Request deduplication: Existing request failed, proceeding with new request`);
      pendingRequests.delete(requestKey);
      return null;
    }
  }
  
  return null;
}

/**
 * Generates film expert response using Claude 3.5 Sonnet API
 * 
 * This function leverages Claude's comprehensive film knowledge to provide
 * professional, structured responses with interleaved text and movie cards.
 * Uses modular prompt system for consistency, caching, and standardized voice.
 * 
 * Performance optimizations:
 * - Request deduplication prevents redundant API calls within 30 seconds
 * - Redis caching for long-term response storage
 * - API cost tracking for usage monitoring
 * 
 * @param {string} question - User's film-related question
 * @returns {Promise<Object>} Structured response with sections and movie recommendations
 * 
 * @returns {Object} response
 * @returns {Array<Object>} response.sections - Interleaved text/movie sections
 * @returns {Object} response.moreIdeas - Additional movie recommendations
 * @returns {string} response.moreIdeas.title - Section title for more ideas
 * @returns {Array<Object>} response.moreIdeas.movies - Extended movie list
 * 
 * @example
 * const response = await generateClaudeResponse("What are the best noir films?")
 * // Returns: {
 * //   sections: [
 * //     { type: 'text', content: 'Film noir emerged...' },
 * //     { type: 'movies', movies: [...] }
 * //   ],
 * //   moreIdeas: { title: 'More Great Films', movies: [...] }
 * // }
 * 
 * @throws {Error} When Claude API fails or returns invalid response
 */
async function generateClaudeResponse(question) {
  const monitor = getPerformanceMonitor();
  const cache = getCache();
  
  // Check predictive cache first (instant responses for common questions)
  const { checkPredictiveCache } = await import('../../lib/predictive-cache.js');
  const predictiveResult = await checkPredictiveCache(question);
  if (predictiveResult) {
    console.log('🚀 INSTANT response from predictive cache');
    return predictiveResult;
  }
  
  // Check for request deduplication second
  const duplicateResult = await checkRequestDeduplication(question);
  if (duplicateResult) {
    return duplicateResult;
  }
  
  // Create normalized key for pending request tracking
  const requestKey = question.toLowerCase().trim().replace(/\s+/g, '_').substring(0, 100);
  
  // Try Redis cache first for Claude responses
  const cachePromise = cache.cacheClaudeResponse(
    question, 
    'claude-3-5-sonnet-20241022',
    async () => {
      console.log(`🔄 Cache miss - generating fresh Claude response for: "${question.substring(0, 100)}..."`);
      
      const startTime = Date.now();
      
      const { Anthropic } = await import('@anthropic-ai/sdk');
      const { buildPrompt } = await import('../../lib/prompts/builder.js');
      
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Detect follow-up questions for quality upgrade strategy
      const isFollowUp = question.length < 50 || 
                        question.toLowerCase().includes('what about') ||
                        question.toLowerCase().includes('and') ||
                        question.toLowerCase().includes('also') ||
                        question.toLowerCase().includes('more about');

      // DIRECT STRATEGY: Consistent Haiku 3.5 with no-fluff responses
      const promptConfig = buildPrompt('ASK', 
        isFollowUp ? 
          'Build on the conversation with 4-5 specific films. Skip any setup - jump straight into recommendations with brief reasons why they matter.' : 
          'Be direct and punchy. Lead with specific films immediately. No "cinema offers" or "the genre explores" - just great movie recommendations with 1-2 word reasons why they rule.',
        true // Always use Haiku 3.5 now
      );

      console.log(`🚀 Engagement strategy: Using ${promptConfig.model} for ${isFollowUp ? 'engaged user (quality)' : 'first impression (speed)'}`);

      try {
        const message = await anthropic.messages.create({
          ...promptConfig,
          messages: [
            {
              role: 'user',
              content: question
            }
          ]
        });

        // Track API cost and performance
        const responseTime = Date.now() - startTime;
        monitor.trackAPICost('claude_sonnet', 'ask-claude', 
          message.usage?.input_tokens || 0, 
          message.usage?.output_tokens || 0, 
          false
        );
        monitor.trackMetric('claude_api_response_time', responseTime, {
          question: question.substring(0, 50),
          input_tokens: message.usage?.input_tokens || 0,
          output_tokens: message.usage?.output_tokens || 0
        });

        const parsedResponse = parseClaudeResponse(message.content[0].text);
        console.log(`💾 Cached fresh Claude response for: "${question.substring(0, 50)}..." (${responseTime}ms)`);
        
        // Cache response for future predictive use (background)
        const { getPredictiveCacheManager } = await import('../../lib/predictive-cache.js');
        const predictiveManager = getPredictiveCacheManager();
        predictiveManager.cachePredictiveResponse(question, parsedResponse).catch(err => {
          console.warn('Failed to cache predictive response:', err);
        });
        
        return parsedResponse;
      } catch (error) {
        console.error('🔴 Claude API Error:', error);
        // Track API error
        monitor.trackMetric('claude_api_error', 1, {
          error: error.message,
          question: question.substring(0, 50)
        });
        // Fallback to sophisticated response
        return generateSophisticatedResponse(question);
      }
    }
  );
  
  // Register this request for deduplication
  pendingRequests.set(requestKey, {
    promise: cachePromise,
    timestamp: Date.now()
  });
  
  try {
    const result = await cachePromise;
    return result;
  } finally {
    // Clean up completed request after a delay
    setTimeout(() => {
      pendingRequests.delete(requestKey);
    }, REQUEST_DEDUP_TTL);
  }
}

/**
 * Cleanup expired pending requests periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > REQUEST_DEDUP_TTL) {
      pendingRequests.delete(key);
    }
  }
}, REQUEST_DEDUP_TTL);

/**
 * Parses Claude's lightweight Ask response format
 * 
 * New format supports:
 * - Natural paragraphs with embedded *movie titles*
 * - FOLLOW_UP_QUESTIONS for conversational flow
 * - Lightweight structure for fast responses
 * 
 * @param {string} responseText - Raw text response from Claude API
 * @returns {Object} Parsed response with structured sections
 * 
 * @returns {Object} parsed
 * @returns {Array<Object>} parsed.sections - Text sections with embedded movie links
 * @returns {Array<string>} parsed.followUpQuestions - Conversational follow-up questions
 * 
 * @example
 * // Input: "Try *The Matrix* for digital reality...\nFOLLOW_UP_QUESTIONS: What interests you?|..."
 * // Output: {
 * //   sections: [{ type: 'text', content: '...' }],
 * //   followUpQuestions: ['What interests you?', ...]
 * // }
 */
function parseClaudeResponse(responseText) {
  console.log('\n=== LIGHTWEIGHT ASK RESPONSE DEBUG ===');
  console.log('Full response text:', responseText);
  console.log('=== END RESPONSE ===\n');
  
  const lines = responseText.split('\n');
  const followUpQuestions = [];
  let mainContent = '';
  
  // Separate main content from follow-up questions
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('FOLLOW_UP_QUESTIONS:')) {
      // Parse follow-up questions
      const questionsLine = trimmedLine.replace('FOLLOW_UP_QUESTIONS:', '').trim();
      if (questionsLine) {
        const questions = questionsLine.split('|').map(q => q.trim()).filter(q => q);
        followUpQuestions.push(...questions);
      }
    } else if (trimmedLine) {
      // Add to main content
      mainContent += (mainContent ? '\n' : '') + trimmedLine;
    }
  }
  
  // For lightweight Ask format, we return a single text section
  const sections = mainContent ? [{
    type: 'text',
    content: mainContent
  }] : [];
  
  console.log('Parsed lightweight response:');
  console.log('- Main content length:', mainContent.length);
  console.log('- Follow-up questions:', followUpQuestions.length);
  
  return {
    sections,
    followUpQuestions,
    // For backward compatibility with existing UI
    moreIdeas: null
  };
}

/**
 * Fallback response generator when Claude API is unavailable
 * 
 * Provides high-quality film responses using pre-curated content when
 * the Claude API fails. Analyzes query patterns to return relevant
 * sophisticated movie recommendations with proper structure.
 * 
 * @param {string} question - User's film question for analysis
 * @returns {Object} Structured response matching Claude format
 * 
 * @returns {Object} response
 * @returns {Array<Object>} response.sections - Pre-structured film content
 * @returns {Object} response.moreIdeas - Additional curated recommendations
 * 
 * @example
 * const fallback = generateSophisticatedResponse("noir thrillers")
 * // Returns sophisticated noir analysis with classic film recommendations
 * 
 * @note This ensures the app never fails completely, even during API outages
 */
function generateSophisticatedResponse(question) {
  const queryLower = question.toLowerCase();
  
  // Analyze query for specific film topics
  const responses = {
    'noir thrillers': {
      sections: [
        {
          type: 'text',
          content: `Noir thrillers represent cinema's exploration of moral ambiguity and urban corruption, emerging from 1940s post-war disillusionment. The movement was shaped by European émigré directors fleeing fascism, who brought German Expressionist techniques to American crime stories. Cinematographers like John Alton pioneered the signature chiaroscuro lighting that defines the genre, creating stark contrasts between light and shadow that mirror the psychological complexity of these narratives. The foundation was established by films such as The Maltese Falcon, Double Indemnity, and The Big Sleep, which introduced archetypal characters—the cynical detective, the femme fatale, the corrupt official—that continue to influence storytelling today.`
        },
        {
          type: 'movies',
          movies: [
            { title: 'The Maltese Falcon', year: 1941, slug: 'Bogart\'s detective navigates web of greed and betrayal', streaming: 'Free on Tubi' },
            { title: 'Double Indemnity', year: 1944, slug: 'Insurance investigator uncovers seductive murder plot', streaming: 'Free on Internet Archive' },
            { title: 'The Big Sleep', year: 1946, slug: 'Philip Marlowe untangles complex Los Angeles blackmail', streaming: 'Free on YouTube' }
          ]
        },
        {
          type: 'text',
          content: `The neo-noir revival of the 1970s reinvented these themes for contemporary audiences, with directors like Roman Polanski and Robert Altman deconstructing classic tropes while maintaining their psychological impact. Modern practitioners including the Coen Brothers, Christopher Nolan, and Denis Villeneuve have continued this evolution, incorporating technological advancement and global perspectives while preserving noir's essential fatalism. These contemporary works demonstrate how the genre's core concerns—power, corruption, identity, and moral compromise—remain universally relevant across different eras and cultural contexts.`
        }
      ],
      moreIdeas: {
        title: 'More Noir Thrillers',
        movies: [
          { title: 'Laura', year: 1944, slug: 'Detective falls for murdered woman\'s portrait', streaming: 'Free on YouTube' },
          { title: 'Out of the Past', year: 1947, slug: 'Private eye\'s past catches up with him', streaming: 'Free on Internet Archive' },
          { title: 'Touch of Evil', year: 1958, slug: 'Border town corruption investigation', streaming: 'Free on Kanopy' },
          { title: 'The Third Man', year: 1949, slug: 'Post-WWII Vienna black market conspiracy', streaming: 'Free on Tubi' },
          { title: 'Kiss Me Deadly', year: 1955, slug: 'Private detective seeks mysterious briefcase', streaming: 'Free on Archive.org' },
          { title: 'Blade Runner', year: 1982, slug: 'Replicant hunter questions identity in dystopia', streaming: 'Rent on Prime Video' },
          { title: 'Blood Simple', year: 1984, slug: 'Adultery leads to murder in Texas', streaming: 'Free on Crackle' },
          { title: 'Blue Velvet', year: 1986, slug: 'College student discovers suburban darkness', streaming: 'Free on Kanopy' },
          { title: 'The Grifters', year: 1990, slug: 'Con artists family loyalty and betrayal', streaming: 'Free on Tubi' },
          { title: 'Basic Instinct', year: 1992, slug: 'Detective entangled with murder suspect', streaming: 'Rent on Apple TV' },
          { title: 'The Last Seduction', year: 1994, slug: 'Femme fatale manipulates small-town insurance man', streaming: 'Free on Pluto TV' },
          { title: 'Mulholland Drive', year: 2001, slug: 'Hollywood dreams turn nightmarish mystery', streaming: 'Free on Kanopy' },
          { title: 'No Country for Old Men', year: 2007, slug: 'Drug deal gone wrong pursued by killer', streaming: 'Rent on Prime Video' },
          { title: 'Drive', year: 2011, slug: 'Stunt driver gets involved with heist', streaming: 'Free on Crackle' },
          { title: 'Nightcrawler', year: 2014, slug: 'Freelance crime journalist crosses ethical lines', streaming: 'Free on Tubi' },
          { title: 'Gone Girl', year: 2014, slug: 'Marriage unravels during missing person case', streaming: 'Rent on Prime Video' },
          { title: 'Hell or High Water', year: 2016, slug: 'Brothers rob banks to save family ranch', streaming: 'Free on Crackle' },
          { title: 'Blade Runner 2049', year: 2017, slug: 'New blade runner uncovers buried secret', streaming: 'Rent on Apple TV' },
          { title: 'Knives Out', year: 2019, slug: 'Detective investigates wealthy family murder', streaming: 'Free on Amazon Prime' }
        ]
      }
    }
  };
  
  // Default fallback for other queries
  const defaultResponse = {
    sections: [
      {
        type: 'text',
        content: `Here are some excellent film recommendations that showcase the best of this topic, featuring work from renowned directors, cinematographers, and performers who have shaped cinema.`
      },
      {
        type: 'movies',
        movies: [
          { title: 'Citizen Kane', year: 1941, slug: 'Media mogul\'s life story told in flashbacks', streaming: 'Free on Internet Archive' },
          { title: 'Casablanca', year: 1942, slug: 'Nightclub owner helps resistance in WWII Morocco', streaming: 'Free on Tubi' },
          { title: 'The Godfather', year: 1972, slug: 'Mafia family patriarch transfers power to son', streaming: 'Rent on Prime Video' }
        ]
      },
      {
        type: 'text',
        content: `These films represent different eras and styles of cinema, showcasing exceptional cinematography by masters like Gregg Toland and Joseph Walker, along with legendary performances that have influenced generations of filmmakers.`
      },
      {
        type: 'movies',
        movies: [
          { title: 'Vertigo', year: 1958, slug: 'Detective with acrophobia follows mysterious woman', streaming: 'Free on Kanopy' },
          { title: 'Singin\' in the Rain', year: 1952, slug: 'Silent film stars navigate Hollywood\'s sound era', streaming: 'Free on YouTube' },
          { title: 'Some Like It Hot', year: 1959, slug: 'Musicians disguise as women to escape mob', streaming: 'Free on Tubi' }
        ]
      }
    ],
    moreIdeas: {
      title: 'More Great Films',
      movies: [
        { title: 'Vertigo', year: 1958, slug: 'Detective with acrophobia follows mysterious woman', streaming: 'Free on Kanopy' },
        { title: 'Singin\' in the Rain', year: 1952, slug: 'Silent film stars navigate Hollywood\'s sound era', streaming: 'Free on YouTube' },
        { title: 'Some Like It Hot', year: 1959, slug: 'Musicians disguise as women to escape mob', streaming: 'Free on Tubi' }
      ]
    }
  };
  
  // Check for specific query matches
  if (queryLower.includes('noir')) {
    return responses['noir thrillers'];
  }
  
  return defaultResponse;
}

/**
 * Main API handler for Claude film expertise endpoint
 * 
 * Orchestrates the complete movie discovery and enhancement pipeline:
 * 1. Validates request and enforces rate limiting
 * 2. Generates Claude response with film analysis
 * 3. Processes all mentioned movies through saveMovieData()
 * 4. Enhances response with TMDB poster data
 * 5. Returns structured content for frontend display
 * 
 * @param {Object} req - Next.js API request object
 * @param {string} req.body.question - User's film question (max 500 chars)
 * @param {Object} res - Next.js API response object
 * 
 * @returns {void} Sends JSON response with film analysis and movie data
 * 
 * @example
 * // POST /api/ask-claude
 * // Body: { question: "What are the best sci-fi films?" }
 * // Response: {
 * //   success: true,
 * //   data: {
 * //     sections: [...],
 * //     moreIdeas: {...},
 * //     totalMovies: 25
 * //   }
 * // }
 * 
 * @throws {ApiError} For validation failures, rate limiting, or service errors
 */
async function askClaudeHandler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    throw ApiErrors.BAD_REQUEST('Only POST method is allowed');
  }

  // Check if TMDB API key is configured
  if (!process.env.TMDB_API_KEY) {
    throw ApiErrors.SERVICE_UNAVAILABLE('TMDB service is not configured. Please add your TMDB API key.');
  }

  // Basic rate limiting (IP-based)
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  checkRateLimit(clientIP, 50, 60000); // 50 requests per minute

  // Validate required fields
  validateRequiredFields(req.body, ['question']);
  const { question } = req.body;

  // Validate question length
  if (question.length > 500) {
    throw ApiErrors.BAD_REQUEST('Question too long (max 500 characters)');
  }

  try {
    // Generate Claude response with film expertise
    const claudeResponse = await generateClaudeResponse(question);
    
    // Process all movies from sections and moreIdeas to add TMDB posters
    const allMovies = [];
    
    // Process interleaved movie sections and save to database
    for (const section of claudeResponse.sections) {
      if (section.type === 'movies') {
        for (let i = 0; i < section.movies.length; i++) {
          const movie = section.movies[i];
          
          // Save to database (handles TMDB lookup internally)
          const savedMovie = await saveMovieData(movie);
          
          // Update section with poster and tmdb_id for response (if we got them back)
          if (savedMovie?.poster_url || savedMovie?.tmdb_id) {
            section.movies[i] = {
              ...movie,
              poster: savedMovie.poster_url || movie.poster,
              tmdb_id: savedMovie.tmdb_id || movie.tmdb_id
            };
          }
          
          allMovies.push(movie);
        }
      }
    }
    
    // Process "More Ideas" movies and save to database (if they exist)
    if (claudeResponse.moreIdeas && claudeResponse.moreIdeas.movies) {
      for (let i = 0; i < claudeResponse.moreIdeas.movies.length; i++) {
        const movie = claudeResponse.moreIdeas.movies[i];
        
        // Save to database (handles TMDB lookup internally)
        const savedMovie = await saveMovieData(movie);
        
        // Update moreIdeas with poster and tmdb_id for response (if we got them back)
        if (savedMovie?.poster_url || savedMovie?.tmdb_id) {
          claudeResponse.moreIdeas.movies[i] = {
            ...movie,
            poster: savedMovie.poster_url || movie.poster,
            tmdb_id: savedMovie.tmdb_id || movie.tmdb_id
          };
        }
        
        allMovies.push(movie);
      }
    }

    // Debug final response structure
    console.log('\n=== FINAL RESPONSE DEBUG ===');
    console.log('Sections count:', claudeResponse.sections.length);
    claudeResponse.sections.forEach((section, i) => {
      console.log(`Section ${i}:`, section.type);
      if (section.type === 'movies') {
        console.log(`  Movies count: ${section.movies.length}`);
        section.movies.forEach((movie, j) => {
          console.log(`    Movie ${j}: "${movie.title}" (${movie.year})`);
        });
      }
    });
    console.log('More Ideas count:', claudeResponse.moreIdeas?.movies?.length || 0);
    console.log('=== END FINAL RESPONSE DEBUG ===\n');

    // Check for relevant genius content to suggest
    let geniusSuggestions = null;
    try {
      const { getQueryDetector } = await import('../../lib/query-detector.js');
      const detector = getQueryDetector();
      const geniusResult = await detector.detectSeries(question);
      
      if (geniusResult.found && geniusResult.confidence >= 60) {
        geniusSuggestions = {
          type: geniusResult.type,
          title: geniusResult.title,
          subtitle: geniusResult.subtitle,
          url: geniusResult.url,
          confidence: geniusResult.confidence,
          matchedKeywords: geniusResult.matchedKeywords
        };
        console.log(`✨ Found relevant Genius content: ${geniusResult.type} "${geniusResult.title}" (${geniusResult.confidence}% match)`);
      }
    } catch (error) {
      console.warn('Failed to detect genius content for Ask response:', error);
      // Non-critical, continue without suggestions
    }

    // Return structured response for lightweight Ask frontend
    const response = successResponse(
      {
        sections: claudeResponse.sections,
        followUpQuestions: claudeResponse.followUpQuestions || [],
        moreIdeas: claudeResponse.moreIdeas,
        geniusSuggestions: geniusSuggestions,
        totalMovies: allMovies.length
      },
      'Question processed successfully with Claude AI'
    );
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Claude API Error:', error);
    
    // Re-throw if it's already an ApiError
    if (error.name === 'ApiError') {
      throw error;
    }
    
    // Generic error
    throw ApiErrors.INTERNAL_ERROR(`Failed to process question with Claude: ${error.message}`);
  }
}

// Export the wrapped handler
export default withErrorHandling(askClaudeHandler);