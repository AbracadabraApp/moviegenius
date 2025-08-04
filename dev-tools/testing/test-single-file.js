/**
 * Test Single File Movie Analysis Linking
 * Process Fight Club (550.json) to create actual movie links
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
 * Process content and create actual movie links
 */
async function processMovieAnalysisContent(content, currentMovieTitle = '', context = '') {
  if (!content || typeof content !== 'string') return content;

  const mentions = extractMovieMentions(content);
  if (mentions.length === 0) return content;

  console.log(`📖 Processing ${mentions.length} movie mentions in ${context}`);

  let processedContent = content;
  let linksCreated = 0;
  let strippedCount = 0;

  // Process mentions in reverse order to maintain string positions
  for (const mention of mentions.reverse()) {
    // Skip self-referential links (case-insensitive)
    if (
      currentMovieTitle &&
      mention.title.toLowerCase().trim() === currentMovieTitle.toLowerCase().trim()
    ) {
      console.log(`🚫 Skipping self-reference: "${mention.title}"`);
      // Strip ** marks for self-references
      const stripped = mention.title;
      processedContent =
        processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      strippedCount++;
      continue;
    }

    const movieData = await searchMovieInTMDB(mention.title, mention.year);

    if (movieData && movieData.tmdb_id) {
      // Create direct link to movie page using existing movie-title class
      const link = mention.year
        ? `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a> (${mention.year})`
        : `<a href="/movie/${movieData.tmdb_id}" class="movie-title" data-tmdb-id="${movieData.tmdb_id}">${mention.title}</a>`;

      processedContent =
        processedContent.slice(0, mention.start) + link + processedContent.slice(mention.end);
      linksCreated++;

      console.log(
        `🔗 Linked "${mention.title}"${mention.year ? ` (${mention.year})` : ''} → /movie/${movieData.tmdb_id}`
      );
    } else {
      // Strip ** marks as fallback
      const stripped = mention.year ? `${mention.title} (${mention.year})` : mention.title;
      processedContent =
        processedContent.slice(0, mention.start) + stripped + processedContent.slice(mention.end);
      strippedCount++;

      console.log(
        `⚠️  Stripped marks for "${mention.title}"${mention.year ? ` (${mention.year})` : ''} - no TMDB match`
      );
    }

    // Rate limiting to avoid overwhelming TMDB API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✅ Created ${linksCreated} links, stripped ${strippedCount} marks in ${context}`);
  return processedContent;
}

/**
 * Process Fight Club file
 */
async function processFightClubFile() {
  console.log('🚀 Processing Fight Club (550.json) for movie analysis linking\n');

  const filePath = path.join(process.cwd(), 'nuclear-static', '550.json');

  if (!fs.existsSync(filePath)) {
    console.error('❌ Fight Club file not found:', filePath);
    return;
  }

  try {
    // Read current file
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`📁 Loaded: ${fileData.props.title} (${fileData.props.year})`);

    // Process the file
    const processed = JSON.parse(JSON.stringify(fileData)); // Deep clone
    const currentMovieTitle = processed.props.title || '';

    // Process sections
    if (processed.props.sections && Array.isArray(processed.props.sections)) {
      for (let i = 0; i < processed.props.sections.length; i++) {
        const section = processed.props.sections[i];

        if (section.type === 'text' && section.content) {
          console.log(`\n📝 Processing section ${i}:`);
          processed.props.sections[i].content = await processMovieAnalysisContent(
            section.content,
            currentMovieTitle,
            `section ${i}`
          );
        }
      }
    }

    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, JSON.stringify(fileData, null, 2));
    console.log(`\n💾 Created backup: ${backupPath}`);

    // Write processed file
    fs.writeFileSync(filePath, JSON.stringify(processed, null, 2));
    console.log(`✅ Updated: ${filePath}`);

    console.log(`\n🎯 Processing complete! Check http://localhost:3001/movie/550`);
  } catch (error) {
    console.error('❌ Error processing file:', error);
  }
}

// Run the processing
processFightClubFile()
  .then(() => {
    console.log('\n✅ Fight Club processing completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Processing failed:', error);
    process.exit(1);
  });
