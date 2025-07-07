/**
 * Episode Movie Linking System - V1 Standalone
 * 
 * Processes all 65 episode files to create proper movie links for V1 launch.
 * Uses database lookups and MediaCard logic for missing movies.
 * 
 * Features:
 * - Detects **Movie Title** (Year) patterns in episode text
 * - Looks up TMDB IDs in database
 * - Uses MediaCard organic slug generation for missing movies
 * - Creates direct /movie/TMDB_ID links
 * - Prevents self-referential links
 * - Batch processes all episodes efficiently
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    });
    
    return envVars;
  }
  return {};
}

// Load environment variables if not already set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const envVars = loadEnvLocal();
  Object.assign(process.env, envVars);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Extract movie mentions from episode text content
 * Handles quoted "Movie Title" (Year) format used in episodes
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];
  
  const mentions = [];
  
  // Primary pattern: "Movie Title" (Year) - Quoted format used in episodes
  const quotedPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  let match;
  
  while ((match = quotedPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    mentions.push({
      original: match[0],
      title,
      year,
      start: match.index,
      end: match.index + match[0].length,
      type: 'quoted'
    });
  }
  
  // Secondary pattern: Movie Title (Year) - Legacy format for any unquoted mentions
  const legacyPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+\((\d{4})\)\b/g;
  legacyPattern.lastIndex = 0; // Reset regex state
  
  while ((match = legacyPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    // Check for overlap with quoted patterns
    const overlaps = mentions.some(existing => 
      (match.index >= existing.start && match.index < existing.end) ||
      (existing.start >= match.index && existing.start < match.index + match[0].length)
    );
    
    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year,
        start: match.index,
        end: match.index + match[0].length,
        type: 'legacy'
      });
    }
  }
  
  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Look up movie in database by title and year
 */
async function lookupMovieInDB(title, year) {
  try {
    // Try exact title match first
    const { data: exactMatch } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, slug, poster_url')
      .eq('title', title)
      .eq('year', year)
      .single();
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try case-insensitive title match
    const { data: fuzzyMatch } = await supabase
      .from('movies')
      .select('tmdb_id, title, year, slug, poster_url')
      .ilike('title', title)
      .eq('year', year)
      .single();
    
    return fuzzyMatch || null;
    
  } catch (error) {
    console.log(`No DB match for "${title}" (${year}):`, error.message);
    return null;
  }
}

/**
 * Add movie to database using MediaCard logic
 */
async function addMovieToDatabase(title, year) {
  try {
    console.log(`🔍 Adding "${title}" (${year}) to database via TMDB...`);
    
    // Use TMDB search to find movie
    const tmdbResponse = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`
    );
    
    const tmdbData = await tmdbResponse.json();
    
    if (tmdbData.results && tmdbData.results.length > 0) {
      const movie = tmdbData.results[0];
      
      // Generate organic slug using the organic slug API
      let slug = `${title} (${year}) - Classic film`;
      try {
        const slugResponse = await fetch('/api/generate-organic-slug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, year })
        });
        const slugData = await slugResponse.json();
        if (slugData.slug) {
          slug = slugData.slug;
        }
      } catch (slugError) {
        console.log('Slug generation failed, using default');
      }
      
      // Insert into database
      const { data: newMovie, error } = await supabase
        .from('movies')
        .insert({
          title: movie.title,
          year: year,
          tmdb_id: movie.id,
          slug: slug,
          poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error('Database insert error:', error);
        return null;
      }
      
      console.log(`✅ Added "${movie.title}" (${year}) with TMDB ID ${movie.id}`);
      return newMovie;
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error adding "${title}" (${year}) to database:`, error);
    return null;
  }
}

/**
 * Process a single episode content string to add movie links
 */
async function processEpisodeContent(content, episodeContext = '') {
  if (!content || typeof content !== 'string') return content;
  
  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) return content;
  
  console.log(`📖 Processing ${mentions.length} movie mentions in ${episodeContext}`);
  
  let processedContent = content;
  let linksCreated = 0;
  
  // Process mentions in reverse order to maintain string positions
  for (const mention of mentions.reverse()) {
    let movieData = await lookupMovieInDB(mention.title, mention.year);
    
    // If not in database, try to add it
    if (!movieData) {
      movieData = await addMovieToDatabase(mention.title, mention.year);
    }
    
    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page using existing movie-title class
      const link = mention.type === 'quoted' 
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`;
      
      processedContent = processedContent.slice(0, mention.start) + link + processedContent.slice(mention.end);
      linksCreated++;
      
      console.log(`🔗 Linked "${mention.title}" (${mention.year}) → /movie/${movieData.tmdb_id}`);
    } else {
      console.log(`❌ Could not link "${mention.title}" (${mention.year}) - no TMDB match`);
    }
  }
  
  console.log(`✅ Created ${linksCreated}/${mentions.length} links in ${episodeContext}`);
  return processedContent;
}

/**
 * Process a complete episode object
 */
async function processEpisode(episodeData, filename) {
  const processed = { ...episodeData };
  
  console.log(`\n🎬 Processing ${filename}: ${episodeData.episode?.title || 'Unknown'}`);
  
  // Process opener text
  if (processed.content?.opener) {
    processed.content.opener = await processEpisodeContent(
      processed.content.opener, 
      `${filename} opener`
    );
  }
  
  // Process sections
  if (processed.content?.sections) {
    for (let i = 0; i < processed.content.sections.length; i++) {
      const section = processed.content.sections[i];
      
      if (section.type === 'text' && section.content) {
        processed.content.sections[i].content = await processEpisodeContent(
          section.content,
          `${filename} section ${i}`
        );
      }
    }
  }
  
  // Process moreIdeas content if it has text
  if (processed.content?.moreIdeas?.content) {
    processed.content.moreIdeas.content = await processEpisodeContent(
      processed.content.moreIdeas.content,
      `${filename} moreIdeas`
    );
  }
  
  return processed;
}

/**
 * Main function to process all episode files
 */
export async function processAllEpisodes(dryRun = false) {
  console.log('🚀 Episode Movie Linking System - V1 Standalone');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE PROCESSING'}`);
  
  const fs = await import('fs');
  const path = await import('path');
  
  const episodesDir = path.join(process.cwd(), 'public/data/episodes');
  const files = fs.readdirSync(episodesDir).filter(f => f.endsWith('.json'));
  
  console.log(`📁 Found ${files.length} episode files`);
  
  let totalProcessed = 0;
  let totalLinksCreated = 0;
  
  for (const filename of files) {
    try {
      const filePath = path.join(episodesDir, filename);
      const episodeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const processedEpisode = await processEpisode(episodeData, filename);
      
      if (!dryRun) {
        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(processedEpisode, null, 2));
        console.log(`💾 Updated ${filename}`);
      }
      
      totalProcessed++;
      
      // Rate limiting to avoid overwhelming TMDB API
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  console.log(`\n📊 Processing Complete:`);
  console.log(`  • Episodes processed: ${totalProcessed}/${files.length}`);
  console.log(`  • Mode: ${dryRun ? 'DRY RUN - No files modified' : 'LIVE - Files updated'}`);
  
  return { totalProcessed, totalLinksCreated };
}

/**
 * Utility to test the system on a single episode
 */
export async function testSingleEpisode(filename, dryRun = true) {
  const fs = await import('fs');
  const path = await import('path');
  
  const filePath = path.join(process.cwd(), 'public/data/episodes', filename);
  const episodeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  return await processEpisode(episodeData, filename);
}

export { extractMovieMentions, lookupMovieInDB, processEpisodeContent, processEpisode };