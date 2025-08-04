/**
 * Movie Analysis Linking Test - API Only Version
 * Tests movie analysis linking system without database access
 * Uses TMDB API key from .env.local for validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

/**
 * Extract movie mentions from content using **Movie Title** patterns
 */
function extractMovieMentions(content) {
  if (!content || typeof content !== 'string') return [];

  const mentions = [];

  // Pattern 1: **Movie Title** (Year)
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
      type: 'bold_with_year',
    });
  }

  // Pattern 2: **Movie Title** (without year)
  const boldWithoutYearPattern = /\*\*([^*]+)\*\*/g;
  boldWithoutYearPattern.lastIndex = 0;

  while ((match = boldWithoutYearPattern.exec(content)) !== null) {
    const title = match[1].trim();

    // Check for overlap with year patterns
    const overlaps = mentions.some(
      existing =>
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
        type: 'bold_without_year',
      });
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

/**
 * Search for movie using TMDB API
 */
async function searchMovieInTMDB(title, year = null) {
  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) {
      url += `&year=${year}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      return {
        tmdb_id: movie.id,
        title: movie.title,
        year: new Date(movie.release_date).getFullYear(),
        poster_url: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    return null;
  }
}

/**
 * Process content and create movie links (simulation)
 */
async function processMovieAnalysisContent(content, filename = '') {
  if (!content || typeof content !== 'string')
    return { content, stats: { total: 0, found: 0, notFound: 0 } };

  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) return { content, stats: { total: 0, found: 0, notFound: 0 } };

  console.log(`📖 Processing ${mentions.length} movie mentions in ${filename}`);

  let processedContent = content;
  let stats = { total: mentions.length, found: 0, notFound: 0 };

  // Process mentions in reverse order to maintain string positions
  for (const mention of mentions.reverse()) {
    const movieData = await searchMovieInTMDB(mention.title, mention.year);

    if (movieData) {
      // Create link (simulation - not actually modifying content for this test)
      const link = mention.year
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;

      console.log(
        `✅ Found "${mention.title}" → TMDB ID ${movieData.tmdb_id} (${movieData.title})`
      );
      stats.found++;
    } else {
      console.log(
        `❌ No TMDB match for "${mention.title}" ${mention.year ? `(${mention.year})` : ''}`
      );
      stats.notFound++;
    }

    // Rate limiting to avoid overwhelming TMDB API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { content: processedContent, stats };
}

/**
 * Test the system on nuclear static files
 */
async function testMovieAnalysisSystem(maxFiles = 20) {
  console.log('🚀 Movie Analysis Linking Test - API Only Version');
  console.log(`📡 Using TMDB API Key: ${TMDB_API_KEY.substring(0, 8)}...`);

  const nuclearDir = path.join(process.cwd(), 'nuclear-static');

  if (!fs.existsSync(nuclearDir)) {
    console.error('❌ Nuclear directory not found');
    return;
  }

  const files = fs
    .readdirSync(nuclearDir)
    .filter(f => f.endsWith('.json'))
    .slice(0, maxFiles);

  console.log(`📁 Testing ${files.length} nuclear static files\n`);

  let totalStats = { total: 0, found: 0, notFound: 0, filesProcessed: 0 };

  for (const filename of files) {
    try {
      const filePath = path.join(nuclearDir, filename);
      const movieData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const title = movieData.props?.title || movieData.title;
      const year = movieData.props?.year || movieData.year;

      console.log(`\n🎬 Testing ${filename}: ${title} (${year})`);

      // Test analysis content in sections if present
      if (movieData.props?.sections) {
        let combinedContent = '';

        // Extract text content from all sections
        movieData.props.sections.forEach(section => {
          if (section.type === 'text' && section.content) {
            combinedContent += section.content + '\n';
          }
        });

        if (combinedContent.trim()) {
          const result = await processMovieAnalysisContent(combinedContent, filename);

          totalStats.total += result.stats.total;
          totalStats.found += result.stats.found;
          totalStats.notFound += result.stats.notFound;
          totalStats.filesProcessed++;

          if (result.stats.total > 0) {
            console.log(
              `📊 ${filename}: ${result.stats.found}/${result.stats.total} matches found`
            );
          }
        } else {
          console.log(`⚠️  No text sections in ${filename}`);
        }
      } else {
        console.log(`⚠️  No sections in ${filename}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }

  console.log(`\n📈 Test Results Summary:`);
  console.log(`  • Files processed: ${totalStats.filesProcessed}/${files.length}`);
  console.log(`  • Total patterns found: ${totalStats.total}`);
  console.log(`  • TMDB matches: ${totalStats.found}`);
  console.log(`  • No matches: ${totalStats.notFound}`);
  console.log(
    `  • Success rate: ${totalStats.total > 0 ? Math.round((totalStats.found / totalStats.total) * 100) : 0}%`
  );

  return totalStats;
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testCount = parseInt(process.argv[2]) || 10;
  console.log(`🎯 Testing ${testCount} files for focused validation\n`);

  testMovieAnalysisSystem(testCount)
    .then(stats => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

export {
  extractMovieMentions,
  searchMovieInTMDB,
  processMovieAnalysisContent,
  testMovieAnalysisSystem,
};
