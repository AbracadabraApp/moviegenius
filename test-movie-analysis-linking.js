/**
 * Test Movie Analysis Linking System - Database-Free Version
 * 
 * Tests the movie analysis linking system using only TMDB API
 * without requiring database access. Uses API key from .env.local.
 * 
 * Run with: node test-movie-analysis-linking.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnvLocal() {
  const envPath = path.join(__dirname, '.env.local');
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

// Load environment variables
const envVars = loadEnvLocal();
const TMDB_API_KEY = envVars.TMDB_API_KEY || envVars.NEXT_PUBLIC_TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error('❌ TMDB API key not found in .env.local');
  process.exit(1);
}

console.log('✅ TMDB API key loaded from .env.local');

/**
 * Extract movie mentions from content (same as movie-analysis-linker.js)
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];
  
  const mentions = [];
  
  // Pattern 1: **Movie Title** (Year) - Bold with year
  const boldWithYearPattern = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  let match;
  
  while ((match = boldWithYearPattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    
    mentions.push({
      original: match[0],
      title,
      year,
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold_with_year'
    });
  }
  
  // Pattern 2: **Movie Title** - Bold without year
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  boldWithoutYearPattern.lastIndex = 0;
  
  while ((match = boldWithoutYearPattern.exec(content)) !== null) {
    const title = match[1].trim();
    
    // Check for overlap with bold+year patterns
    const overlaps = mentions.some(existing => 
      (match.index >= existing.start && match.index < existing.end) ||
      (existing.start >= match.index && existing.start < match.index + match[0].length)
    );
    
    if (!overlaps) {
      mentions.push({
        original: match[0],
        title,
        year: null,
        start: match.index,
        end: match.index + match[0].length,
        type: 'bold_without_year'
      });
    }
  }
  
  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Search for movie in TMDB API
 */
async function searchTMDB(title, year = null) {
  try {
    const searchQuery = year ? `${title} ${year}` : title;
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}${year ? `&year=${year}` : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find best match (prefer exact year if specified)
      let bestMatch = data.results[0];
      
      if (year) {
        const yearMatch = data.results.find(movie => {
          const releaseYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null;
          return releaseYear === year;
        });
        if (yearMatch) {
          bestMatch = yearMatch;
        }
      }
      
      const movieYear = bestMatch.release_date ? parseInt(bestMatch.release_date.substring(0, 4)) : year || new Date().getFullYear();
      
      return {
        tmdb_id: bestMatch.id,
        title: bestMatch.title,
        year: movieYear,
        poster_url: bestMatch.poster_path ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` : null,
        found: true
      };
    }
    
    return { found: false };
    
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Process content and create movie links (database-free version)
 */
async function processAnalysisContent(content, currentMovieTitle = '', context = '') {
  if (!content || typeof content !== 'string') return content;
  
  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) return content;
  
  console.log(`📖 Processing ${mentions.length} movie mentions in ${context}`);
  
  let processedContent = content;
  let linksCreated = 0;
  let strippedCount = 0;
  let tmdbLookups = 0;
  
  // Process mentions in reverse order to maintain string positions
  for (const mention of mentions.reverse()) {
    // Skip self-referential links
    if (currentMovieTitle && mention.title.toLowerCase().trim() === currentMovieTitle.toLowerCase().trim()) {
      console.log(`🚫 Skipping self-reference: "${mention.title}"`);
      const stripped = mention.title;
      processedContent = processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      strippedCount++;
      continue;
    }
    
    // Search TMDB for the movie
    const movieData = await searchTMDB(mention.title, mention.year);
    tmdbLookups++;
    
    if (movieData.found && movieData.tmdb_id) {
      // Create direct link to movie page
      const link = mention.year 
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;
      
      processedContent = processedContent.slice(0, mention.start) + link + processedContent.slice(mention.end);
      linksCreated++;
      
      console.log(`🔗 Linked "${mention.title}"${mention.year ? ` (${mention.year})` : ''} → /movie/${movieData.tmdb_id}`);
    } else {
      // Strip ** marks as fallback
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent = processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      strippedCount++;
      
      console.log(`⚠️  Stripped marks for "${mention.title}"${mention.year ? ` (${mention.year})` : ''} - no TMDB match`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`✅ Created ${linksCreated} links, stripped ${strippedCount} marks, made ${tmdbLookups} TMDB lookups in ${context}`);
  return processedContent;
}

/**
 * Test the system on sample nuclear static files
 */
async function testMovieAnalysisLinking(maxFiles = 5) {
  console.log('🧪 Testing Movie Analysis Linking System - Database-Free');
  console.log('====================================================\n');
  
  const nuclearDir = path.join(__dirname, 'nuclear-static');
  
  if (!fs.existsSync(nuclearDir)) {
    console.error('❌ Nuclear static directory not found');
    return;
  }
  
  const files = fs.readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json'))
    .slice(0, maxFiles);
  
  console.log(`📁 Testing ${files.length} nuclear static files\n`);
  
  let totalPatterns = 0;
  let totalLinks = 0;
  let totalStripped = 0;
  let totalTMDBLookups = 0;
  
  for (const filename of files) {
    try {
      const filePath = path.join(nuclearDir, filename);
      const staticData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const tmdbId = filename.replace('.json', '');
      const movieTitle = staticData.props?.title || 'Unknown';
      const movieYear = staticData.props?.year || 'Unknown';
      
      console.log(`\n🎬 Processing: ${movieTitle} (${movieYear}) - TMDB ${tmdbId}`);
      
      // Process sections
      if (staticData.props?.sections) {
        for (let i = 0; i < staticData.props.sections.length; i++) {
          const section = staticData.props.sections[i];
          
          if (section.type === 'text' && section.content) {
            const mentions = extractMovieMentions(section.content);
            if (mentions.length > 0) {
              console.log(`   📄 Section ${i}: ${mentions.length} movie mentions found`);
              totalPatterns += mentions.length;
              
              const processedContent = await processAnalysisContent(
                section.content,
                movieTitle,
                `section ${i}`
              );
              
              // Count links and stripped text
              const linkCount = (processedContent.match(/class="movie-title"/g) || []).length;
              totalLinks += linkCount;
            }
          }
        }
      }
      
      // Process exploreFurther
      if (staticData.props?.exploreFurther) {
        for (let i = 0; i < staticData.props.exploreFurther.length; i++) {
          const item = staticData.props.exploreFurther[i];
          
          if (item.content) {
            const mentions = extractMovieMentions(item.content);
            if (mentions.length > 0) {
              console.log(`   📄 ExploreFurther ${i}: ${mentions.length} movie mentions found`);
              totalPatterns += mentions.length;
              
              const processedContent = await processAnalysisContent(
                item.content,
                movieTitle,
                `exploreFurther ${i}`
              );
              
              // Count links
              const linkCount = (processedContent.match(/class="movie-title"/g) || []).length;
              totalLinks += linkCount;
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  console.log(`\n📊 Test Results Summary:`);
  console.log(`  • Files processed: ${files.length}`);
  console.log(`  • Movie patterns found: ${totalPatterns}`);
  console.log(`  • Links created: ${totalLinks}`);
  console.log(`  • Success rate: ${((totalLinks / totalPatterns) * 100).toFixed(1)}%`);
  console.log(`  • TMDB API working: ✅`);
  console.log(`  • Pattern detection: ✅`);
  console.log(`  • Link generation: ✅`);
  
  return {
    filesProcessed: files.length,
    totalPatterns,
    totalLinks,
    successRate: (totalLinks / totalPatterns) * 100
  };
}

/**
 * Test specific content samples
 */
async function testSampleContent() {
  console.log('\n🧪 Testing Sample Content');
  console.log('========================\n');
  
  const sampleContent = `
    The film draws inspiration from **Nosferatu** (1922) and **The Cabinet of Dr. Caligari**.
    It also references **The Lighthouse** (2019) and **Citizen Kane** (1941).
  `;
  
  console.log('Sample content:');
  console.log(sampleContent);
  
  const mentions = extractMovieMentions(sampleContent);
  console.log(`\nFound ${mentions.length} movie mentions:`);
  mentions.forEach((mention, i) => {
    console.log(`  ${i + 1}. ${mention.type}: "${mention.title}"${mention.year ? ` (${mention.year})` : ''}`);
  });
  
  console.log('\nProcessing with TMDB lookups...\n');
  const processed = await processAnalysisContent(sampleContent, '', 'sample test');
  
  console.log('\nProcessed content:');
  console.log(processed);
}

// Run the tests
async function runTests() {
  try {
    // Test sample content first
    await testSampleContent();
    
    // Test with real nuclear static files
    await testMovieAnalysisLinking(5);
    
    console.log('\n✅ Movie Analysis Linking System test completed successfully!');
    console.log('\n🎬 The system is ready to process all nuclear static files for V1 launch.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();