/**
 * Ask Claude API Route
 * 
 * Handles movie-related questions using Claude's comprehensive film knowledge.
 * Returns interleaved text/movie content + extensive "More Ideas" section.
 * Uses TMDB for posters only.
 */
import { createClient } from '@supabase/supabase-js';
import { 
  withErrorHandling, 
  ApiErrors, 
  successResponse, 
  validateRequiredFields,
  checkRateLimit 
} from '../../lib/api-utils';

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
  try {
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
    );
    
    if (tmdbResponse.ok) {
      const tmdbData = await tmdbResponse.json();
      const movie = tmdbData.results?.[0];
      
      if (movie) {
        return {
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
      }
    }
  } catch (error) {
    console.error(`Failed to fetch TMDB data for ${title}:`, error);
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
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const { buildPrompt } = await import('../../lib/prompts/builder.js');
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Use modular prompt system for ASK context (includes caching and standardized voice)
  const promptConfig = buildPrompt('ASK', 'Include 3-4 accessibly written Explore Further topics for additional explorations. End with extensive "More Ideas" list containing up to 50 relevant movies.');

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

    return parseClaudeResponse(message.content[0].text);
  } catch (error) {
    console.error('Claude API Error:', error);
    // Fallback to sophisticated response
    return generateSophisticatedResponse(question);
  }
}

/**
 * Parses Claude's structured PARAGRAPH/MOVIES/MORE_IDEAS response format
 * 
 * This parser handles Claude's specific output format, ensuring proper
 * sequencing of text paragraphs followed by their associated movie cards.
 * Critical for maintaining the interleaved content structure.
 * 
 * @param {string} responseText - Raw text response from Claude API
 * @returns {Object} Parsed response with structured sections
 * 
 * @returns {Object} parsed
 * @returns {Array<Object>} parsed.sections - Text and movie sections in correct order
 * @returns {Object} parsed.moreIdeas - Extended recommendations section
 * 
 * @example
 * // Input: "PARAGRAPH: Film noir emerged...\nMOVIES: The Maltese Falcon|1941|..."
 * // Output: {
 * //   sections: [
 * //     { type: 'text', content: 'Film noir emerged...' },
 * //     { type: 'movies', movies: [{ title: 'The Maltese Falcon', year: 1941, ... }] }
 * //   ]
 * // }
 * 
 * @see generateClaudeResponse which uses modular prompts from /lib/prompts/ that produce this format
 */
function parseClaudeResponse(responseText) {
  console.log('\n=== CLAUDE RESPONSE DEBUG ===');
  console.log('Full response text:', responseText);
  console.log('=== END RESPONSE ===\n');
  
  const sections = [];
  const moreIdeasMovies = [];
  
  const lines = responseText.split('\n');
  let currentSection = null;
  let currentMovies = [];
  let inMoreIdeas = false;
  
  console.log('Total lines to parse:', lines.length);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    console.log(`Line ${i}: "${trimmedLine}"`);
    
    if (!trimmedLine) continue; // Skip empty lines
    
    if (trimmedLine.startsWith('PARAGRAPH:')) {
      console.log('Found PARAGRAPH line');
      // Push previous text section first
      if (currentSection) {
        sections.push(currentSection);
        console.log('Pushed previous section:', currentSection);
      }
      // Then push any pending movies from previous paragraph
      if (currentMovies.length > 0) {
        sections.push({
          type: 'movies',
          movies: [...currentMovies]
        });
        console.log('Pushed movie section with', currentMovies.length, 'movies');
        currentMovies = [];
      }
      // Start new text section
      currentSection = {
        type: 'text',
        content: trimmedLine.replace('PARAGRAPH:', '').trim()
      };
      console.log('Started new text section:', currentSection.content);
    } else if (trimmedLine.startsWith('MOVIES:')) {
      const movieLine = trimmedLine.replace('MOVIES:', '').trim();
      console.log('Found MOVIES line:', movieLine);
      
      if (movieLine) {
        const parts = movieLine.split('|');
        console.log('Split into parts:', parts);
        
        if (parts.length >= 2) { // At least title and year
          const [title, year, description, streaming] = parts;
          const movieObj = {
            title: title?.trim() || 'Unknown Title',
            year: parseInt(year?.trim()) || new Date().getFullYear(),
            slug: description?.trim() || 'No description available',
            streaming: streaming?.trim() || 'Check streaming services'
          };
          
          console.log('Created movie object:', movieObj);
          currentMovies.push(movieObj);
        } else {
          console.warn('Movie line has insufficient parts:', parts);
        }
      }
    } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
      inMoreIdeas = true;
      const movieLine = trimmedLine.replace('MORE_IDEAS:', '').trim();
      if (movieLine) {
        const parts = movieLine.split('|');
        console.log('Parsing MORE_IDEAS line:', movieLine);
        console.log('Split parts:', parts);
        
        const [title, year, description, streaming] = parts;
        const movieObj = {
          title: title?.trim() || 'Unknown Title',
          year: parseInt(year?.trim()) || new Date().getFullYear(),
          slug: description?.trim() || 'No description available',
          streaming: streaming?.trim() || 'Check streaming services'
        };
        
        console.log('Created MORE_IDEAS movie object:', movieObj);
        moreIdeasMovies.push(movieObj);
      }
    } else if (inMoreIdeas && trimmedLine.includes('|')) {
      const parts = trimmedLine.split('|');
      console.log('Parsing additional MORE_IDEAS line:', trimmedLine);
      console.log('Split parts:', parts);
      
      const [title, year, description, streaming] = parts;
      const movieObj = {
        title: title?.trim() || 'Unknown Title',
        year: parseInt(year?.trim()) || new Date().getFullYear(),
        slug: description?.trim() || 'No description available',
        streaming: streaming?.trim() || 'Check streaming services'
      };
      
      console.log('Created additional MORE_IDEAS movie object:', movieObj);
      moreIdeasMovies.push(movieObj);
    } else if (currentSection && trimmedLine) {
      currentSection.content += ' ' + trimmedLine;
    }
  }
  
  // Handle final sections - text first, then movies
  if (currentSection) {
    sections.push(currentSection);
  }
  
  if (currentMovies.length > 0) {
    sections.push({
      type: 'movies',
      movies: [...currentMovies]
    });
  }
  
  return {
    sections,
    moreIdeas: {
      title: 'More Great Films',
      movies: moreIdeasMovies
    }
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
    
    // Process "More Ideas" movies and save to database
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

    // Return structured response for interleaved frontend
    const response = successResponse(
      {
        sections: claudeResponse.sections,
        moreIdeas: claudeResponse.moreIdeas,
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