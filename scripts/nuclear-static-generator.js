#!/usr/bin/env node
/**
 * Nuclear Static Generator
 *
 * Generates completely static JSON data files for nuclear movie pages.
 * These files can be deployed as static assets for lightning-fast loading.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { staticPageHasLinks, trackZeroWasteSavings } from '../lib/zero-waste-protection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Command line argument support
const args = process.argv.slice(2);
const runAllMovies = args.includes('--all');
const batchSize = parseInt(args.find(arg => arg.startsWith('--batch='))?.split('=')[1] || '10');
const startFrom = parseInt(args.find(arg => arg.startsWith('--start='))?.split('=')[1] || '0');

// Nuclear test movie IDs (for testing)
const NUCLEAR_TEST_IDS = [901, 770, 72976, 11314, 44865, 44012, 631, 897661, 389, 76203];

/**
 * Get all movies that should be generated as nuclear static
 */
async function getAllNuclearMovies() {
  if (!runAllMovies) {
    console.log('🧪 Test mode: Using 10 nuclear test movies');
    return NUCLEAR_TEST_IDS;
  }

  console.log('🚀 Full mode: Getting all movies with analysis...');

  // Get all movies with analysis - handle Supabase 1000 row limit with pagination
  let allMovies = [];
  let currentOffset = 0;
  const pageSize = 1000;

  while (true) {
    const { data: moviePage, error } = await supabase
      .from('movies')
      .select(
        `
        tmdb_id, 
        title, 
        year,
        movie_analyses!inner(analysis_type)
      `
      )
      .not('tmdb_id', 'is', null)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .order('tmdb_id')
      .range(currentOffset, currentOffset + pageSize - 1);

    if (error) {
      console.error('❌ Error fetching movies:', error);
      break;
    }

    if (!moviePage || moviePage.length === 0) {
      break; // No more movies
    }

    allMovies.push(...moviePage);
    console.log(
      `📄 Fetched page ${Math.floor(currentOffset / pageSize) + 1}: ${moviePage.length} movies (total: ${allMovies.length})`
    );

    if (moviePage.length < pageSize) {
      break; // Last page
    }

    currentOffset += pageSize;
  }

  console.log(`📊 Found ${allMovies.length} total movies with analysis`);
  console.log(`⚡ All movies will be generated (first full run)`);

  return allMovies.map(movie => movie.tmdb_id).slice(startFrom);
}

/**
 * Build a movie title lookup from all movies in sections
 * Creates a Map for fast O(1) lookups during text processing
 *
 * @param {Array} sections - Analysis sections containing movie data
 * @param {string} currentTitle - Title of current movie to exclude (prevent self-referential links)
 * @returns {Map} - Map with "title (year)" keys and movie data values
 */
function buildMovieLookup(sections, currentTitle) {
  const movieLookup = new Map();

  sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      section.movies.forEach(movie => {
        // Only include movies with valid TMDB IDs and exclude current movie
        if (movie.title && movie.tmdb_id && movie.title !== currentTitle) {
          // Use lowercase key for case-insensitive matching
          const key = `${movie.title.toLowerCase().trim()} (${movie.year})`;
          movieLookup.set(key, {
            title: movie.title,
            tmdb_id: movie.tmdb_id,
            year: movie.year,
          });
        }
      });
    }
  });

  return movieLookup;
}

/**
 * Process text content to convert movie mentions to direct TMDB links
 *
 * Converts patterns like "**Movie Title** (Year)" to direct HTML links.
 * Applies business logic to prevent self-referential links.
 *
 * @param {string} content - Text content to process
 * @param {Map} movieLookup - Movie lookup map from buildMovieLookup()
 * @param {string} currentTitle - Current movie title to prevent self-links
 * @returns {string} - Processed content with HTML links
 */
function processTextLinks(content, movieLookup, currentTitle) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;

  // Pattern for **Movie Title** (Year) format in markdown
  const moviePattern = /\*\*([^*]+)\*\* \((\d{4})\)/g;
  const matches = [];
  let match;

  // Collect all matches first to avoid regex state issues
  while ((match = moviePattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    const lookupKey = `${title.toLowerCase()} (${year})`;

    // BUSINESS LOGIC: Skip self-referential links (case-insensitive)
    if (title.toLowerCase().trim() === currentTitle.toLowerCase().trim()) {
      console.log(`🚫 Skipping self-referential link: ${title}`);
      continue;
    }

    // Look up TMDB ID from related movies data
    const movieData = movieLookup.get(lookupKey);
    if (movieData) {
      matches.push({
        fullMatch: match[0],
        title: title, // Preserve original casing
        year: year,
        tmdbId: movieData.tmdb_id,
        start: match.index,
        end: match.index + match[0].length,
      });
      console.log(`🔗 Found linkable movie: ${title} (${year}) -> /movie/${movieData.tmdb_id}`);
    } else {
      console.log(`❓ No TMDB ID found for: ${title} (${year})`);
    }
  }

  // Process matches in reverse order to maintain string positions
  for (const movieMatch of matches.reverse()) {
    // Convert **Title** (Year) to <a href="/movie/ID">Title</a> (Year)
    const link = `<a href="/movie/${movieMatch.tmdbId}" class="movie-title">${movieMatch.title}</a> (${movieMatch.year})`;
    processedContent =
      processedContent.slice(0, movieMatch.start) + link + processedContent.slice(movieMatch.end);
  }

  return processedContent;
}

/**
 * Validate generated static data for quality and correctness
 *
 * @param {Object} staticData - The generated static page data
 * @param {string} movieTitle - Title of the movie for context
 * @returns {Object} - Validation result with issues array
 */
function validateStaticData(staticData, movieTitle) {
  const issues = [];

  try {
    // Check required top-level structure
    if (!staticData.props) {
      issues.push('Missing props object');
      return { valid: false, issues };
    }

    const props = staticData.props;

    // Check required fields
    const requiredFields = ['title', 'year', 'tmdbId', 'hasAnalysis', 'sections'];
    for (const field of requiredFields) {
      if (props[field] === undefined || props[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Validate sections structure
    if (Array.isArray(props.sections)) {
      props.sections.forEach((section, index) => {
        if (!section.type) {
          issues.push(`Section ${index} missing type`);
        }

        if (section.type === 'text') {
          if (!section.content || typeof section.content !== 'string') {
            issues.push(`Text section ${index} missing or invalid content`);
          } else {
            // Check for unprocessed movie links (should be converted to HTML)
            const unprocessedLinks = section.content.match(/\*\*[^*]+\*\* \(\d{4}\)/g);
            if (unprocessedLinks) {
              // Filter out self-referential links which should remain unprocessed
              const problematicLinks = unprocessedLinks.filter(link => {
                const titleMatch = link.match(/\*\*([^*]+)\*\*/);
                return (
                  titleMatch &&
                  titleMatch[1].toLowerCase().trim() !== movieTitle.toLowerCase().trim()
                );
              });

              if (problematicLinks.length > 0) {
                issues.push(
                  `Section ${index} has unprocessed movie links: ${problematicLinks.join(', ')}`
                );
              }
            }

            // Check for self-referential links (should remain as markdown)
            const selfLinks = section.content.match(
              new RegExp(
                `<a href="/movie/\\d+"[^>]*>${movieTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</a>`,
                'gi'
              )
            );
            if (selfLinks) {
              issues.push(`Section ${index} has self-referential link: ${selfLinks[0]}`);
            }
          }
        }

        if (section.type === 'movies') {
          if (!Array.isArray(section.movies)) {
            issues.push(`Movies section ${index} missing or invalid movies array`);
          } else {
            section.movies.forEach((movie, movieIndex) => {
              if (!movie.title || !movie.year) {
                issues.push(`Movie ${movieIndex} in section ${index} missing title or year`);
              }
            });
          }
        }
      });
    } else {
      issues.push('Sections is not an array');
    }

    // Check for proper link structure in processed content
    const textSections = props.sections.filter(s => s.type === 'text');
    textSections.forEach((section, index) => {
      if (section.content) {
        // Check for search-based links (should be converted to direct links)
        const searchLinks = section.content.match(/href="\/search\?[^"]*"/g);
        if (searchLinks) {
          issues.push(`Section ${index} has search-based links: ${searchLinks.join(', ')}`);
        }

        // Check for broken image references
        const brokenImages = section.content.match(/src="[^"]*"/g);
        if (brokenImages) {
          brokenImages.forEach(img => {
            if (img.includes('placeholder') || img.includes('404') || img.includes('broken')) {
              issues.push(`Section ${index} has potentially broken image: ${img}`);
            }
          });
        }

        // Find all movie links
        const movieLinks = section.content.match(/<a href="\/movie\/\d+"[^>]*>[^<]+<\/a>/g) || [];
        movieLinks.forEach(link => {
          // Validate link structure
          if (!link.includes('class="movie-title"')) {
            issues.push(`Section ${index} has movie link without proper class: ${link}`);
          }

          // Extract TMDB ID from link
          const tmdbMatch = link.match(/\/movie\/(\d+)/);
          if (!tmdbMatch) {
            issues.push(`Section ${index} has malformed movie link: ${link}`);
          }
        });
      }
    });

    // Validate movie data in sections
    props.sections.forEach((section, index) => {
      if (section.type === 'movies' && section.movies) {
        section.movies.forEach((movie, movieIndex) => {
          // Check for broken poster URLs
          if (movie.poster_url) {
            if (
              movie.poster_url.includes('placeholder') ||
              movie.poster_url.includes('404') ||
              movie.poster_url === '/images/placeholder-poster.jpg'
            ) {
              issues.push(
                `Movie ${movieIndex} in section ${index} has placeholder poster: ${movie.poster_url}`
              );
            }
          }

          // Check for missing TMDB IDs
          if (!movie.tmdb_id) {
            issues.push(`Movie ${movieIndex} in section ${index} missing TMDB ID: ${movie.title}`);
          }
        });
      }
    });

    // Check main movie poster
    if (props.initialPoster) {
      if (
        props.initialPoster.includes('placeholder') ||
        props.initialPoster.includes('404') ||
        props.initialPoster === '/images/placeholder-poster.jpg'
      ) {
        issues.push(`Main movie has placeholder poster: ${props.initialPoster}`);
      }
    }
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * ZERO-WASTE: Generate static page data for a movie with three-tier protection
 *
 * @param {number} tmdbId - TMDB ID of the movie to generate
 * @param {string} outputDir - Output directory for checking existing files
 * @returns {Object} - Generation result with success status and data
 */
async function generateMovieStaticData(tmdbId, outputDir) {
  try {
    // ZERO-WASTE: Check if complete static file already exists
    const existingFilePath = path.join(outputDir, `${tmdbId}.json`);
    if (fs.existsSync(existingFilePath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(existingFilePath, 'utf8'));
        
        // Check if existing file has links (Tier 1 - Complete)
        if (staticPageHasLinks(existingData)) {
          console.log(`⚡ TIER 1 - Skipping complete nuclear static: ${tmdbId}`);
          const savings = trackZeroWasteSavings('tier1_skip', {});
          return { 
            success: true, 
            tmdbId, 
            skipped: true, 
            reason: 'existing_complete',
            costSaved: savings.costSaved
          };
        }
      } catch (parseError) {
        console.log(`🔄 Existing file corrupt, regenerating: ${tmdbId}`);
      }
    }

    // Get movie from database
    const { data: movieEntry, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, poster_url, streaming_data, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .single();

    if (!movieEntry || error) {
      console.log(`❌ Movie ${tmdbId} not found in database`);
      return { success: false, tmdbId, error: 'Movie not found' };
    }

    // Import analysis service
    const { AnalysisService } = await import('../lib/services/analysis-service.js');

    // ZERO-WASTE: Get analysis data with integrated three-tier protection
    console.log(`🔄 TIER 2/3 - Processing nuclear static: ${movieEntry.title} (${movieEntry.year})`);
    const analysisData = await AnalysisService.getOrGenerate(movieEntry);

    if (!analysisData || !analysisData.sections || analysisData.sections.length === 0) {
      console.log(`❌ Movie ${tmdbId} has no analysis data`);
      return { success: false, tmdbId, error: 'No analysis data' };
    }

    // Build movie lookup for text link processing
    const movieLookup = buildMovieLookup(analysisData.sections, movieEntry.title);
    console.log(`🔍 Built movie lookup with ${movieLookup.size} movies for ${movieEntry.title}`);

    // Process text sections to convert movie mentions to direct links
    const processedSections = analysisData.sections.map(section => {
      if (section.type === 'text' && section.content) {
        return {
          ...section,
          content: processTextLinks(section.content, movieLookup, movieEntry.title),
        };
      }
      return section;
    });

    // Build static page props (matching getStaticProps structure)
    const staticData = {
      props: {
        title: movieEntry.title,
        year: movieEntry.year,
        initialSlug: movieEntry.slug,
        initialPoster: movieEntry.poster_url,
        initialStreaming: movieEntry.streaming_data,
        tmdbId: movieEntry.tmdb_id,
        error: null,
        hasAnalysis: true,
        sections: processedSections, // Use processed sections with direct links
        exploreFurther: analysisData.exploreFurther,
        moreIdeas: analysisData.moreIdeas,
      },
      __N_SSG: true,
    };

    // Validate the generated static data
    const validation = validateStaticData(staticData, movieEntry.title);
    if (!validation.valid) {
      console.warn(`⚠️  Validation issues for "${movieEntry.title}":`);
      validation.issues.forEach(issue => console.warn(`   - ${issue}`));
    }

    console.log(`✅ Generated nuclear static data for "${movieEntry.title}" (${movieEntry.year})`);
    
    // Track cost savings from integrated linking
    const savings = trackZeroWasteSavings('tier3_fresh', { linksAdded: 1 });
    
    return {
      success: true,
      tmdbId,
      staticData,
      movieTitle: movieEntry.title,
      movieYear: movieEntry.year,
      validation, // Include validation results
      costSaved: savings.costSaved,
      costIncurred: savings.costIncurred
    };
  } catch (error) {
    console.error(`❌ Error generating static data for movie ${tmdbId}:`, error.message);
    return { success: false, tmdbId, error: error.message };
  }
}

/**
 * Update database flag for successfully generated movies
 */
async function markMovieAsNuclearStatic(tmdbId) {
  try {
    const { error } = await supabase
      .from('movies')
      .update({
        is_nuclear_static: true,
        nuclear_generated_at: new Date().toISOString(),
      })
      .eq('tmdb_id', tmdbId);

    if (error) {
      console.warn(`⚠️ Failed to mark movie ${tmdbId} as nuclear static:`, error.message);
    }
  } catch (error) {
    console.warn(`⚠️ Failed to mark movie ${tmdbId} as nuclear static:`, error.message);
  }
}

/**
 * ZERO-WASTE: Process a batch of movies in parallel with protection
 */
async function processBatch(movieIds, batchNum, totalBatches, outputDir) {
  console.log(`\n🎬 ZERO-WASTE Batch ${batchNum}/${totalBatches} (${movieIds.length} movies)`);

  const batchPromises = movieIds.map(tmdbId => generateMovieStaticData(tmdbId, outputDir));
  const results = await Promise.allSettled(batchPromises);

  const batchStats = { 
    success: 0, 
    failed: 0, 
    skipped: 0, 
    errors: [],
    totalCostSaved: 0,
    totalCostIncurred: 0 
  };

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const tmdbId = movieIds[i];

    if (result.status === 'fulfilled' && result.value.success) {
      const resultValue = result.value;
      
      // Track cost savings
      if (resultValue.costSaved) batchStats.totalCostSaved += resultValue.costSaved;
      if (resultValue.costIncurred) batchStats.totalCostIncurred += resultValue.costIncurred;

      if (resultValue.skipped) {
        // ZERO-WASTE: File was skipped because it's already complete
        console.log(`  ⚡ SKIPPED: ${tmdbId} (${resultValue.reason}) - Saved: $${resultValue.costSaved.toFixed(4)}`);
        batchStats.skipped++;
      } else {
        // New file generated
        const { staticData, movieTitle, movieYear } = resultValue;

        // Write static data file
        const filename = `${tmdbId}.json`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(staticData, null, 2));

        // TODO: Mark as nuclear static in database (column doesn't exist yet)
        // await markMovieAsNuclearStatic(tmdbId);

        console.log(`  ✅ GENERATED: ${movieTitle} (${movieYear}) → ${filename}`);
        batchStats.success++;
      }
    } else {
      const error = result.status === 'rejected' ? result.reason : result.value.error;
      console.log(`  ❌ Movie ${tmdbId} failed: ${error}`);
      batchStats.failed++;
      batchStats.errors.push({ tmdbId, error });
    }
  }

  console.log(
    `📊 Batch ${batchNum} complete: ${batchStats.success} generated, ${batchStats.skipped} skipped, ${batchStats.failed} failed`
  );
  console.log(
    `💰 Batch savings: $${batchStats.totalCostSaved.toFixed(4)} saved, $${batchStats.totalCostIncurred.toFixed(4)} spent`
  );
  return batchStats;
}

/**
 * Main function to generate all nuclear static files
 */
async function generateNuclearStaticFiles() {
  const startTime = Date.now();
  console.log('🚀 Nuclear Static Generator - Starting...\n');

  if (runAllMovies) {
    console.log(`⚡ Full generation mode: ${batchSize} movies in parallel`);
    if (startFrom > 0) {
      console.log(`🔄 Resuming from movie #${startFrom}`);
    }
  }

  // Create output directory
  const outputDir = path.join(PROJECT_ROOT, 'nuclear-static');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get all movies to process
  const allMovieIds = await getAllNuclearMovies();
  console.log(`🎯 Target: ${allMovieIds.length} movies for nuclear static generation\n`);

  if (allMovieIds.length === 0) {
    console.log('✅ All movies already have nuclear static files!');
    return;
  }

  // Process in batches with zero-waste tracking
  const totalStats = { 
    success: 0, 
    failed: 0, 
    skipped: 0, 
    errors: [],
    totalCostSaved: 0,
    totalCostIncurred: 0 
  };
  const totalBatches = Math.ceil(allMovieIds.length / batchSize);

  for (let i = 0; i < allMovieIds.length; i += batchSize) {
    const batchIds = allMovieIds.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    try {
      const batchStats = await processBatch(batchIds, batchNum, totalBatches, outputDir);
      totalStats.success += batchStats.success;
      totalStats.failed += batchStats.failed;
      totalStats.skipped += batchStats.skipped;
      totalStats.totalCostSaved += batchStats.totalCostSaved;
      totalStats.totalCostIncurred += batchStats.totalCostIncurred;
      totalStats.errors.push(...batchStats.errors);

      // Progress indicator with zero-waste metrics
      const progressPct = Math.round(((i + batchSize) / allMovieIds.length) * 100);
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `⏱️  Progress: ${Math.min(progressPct, 100)}% | ${totalStats.success} generated, ${totalStats.skipped} skipped | ${elapsed}s elapsed`
      );
      console.log(
        `💰 Running totals: $${totalStats.totalCostSaved.toFixed(2)} saved, $${totalStats.totalCostIncurred.toFixed(2)} spent\n`
      );

      // Rate limiting between batches to be respectful to services
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`💥 Batch ${batchNum} failed completely:`, error);
      totalStats.failed += batchIds.length;
    }
  }

  // Generate manifest file with zero-waste metrics
  const manifest = {
    generated: new Date().toISOString(),
    totalMovies: allMovieIds.length,
    successCount: totalStats.success,
    skippedCount: totalStats.skipped,
    failedCount: totalStats.failed,
    batchSize: batchSize,
    generationTimeSeconds: Math.round((Date.now() - startTime) / 1000),
    version: '2.1.0-zero-waste',
    mode: runAllMovies ? 'full' : 'test',
    costMetrics: {
      totalSaved: totalStats.totalCostSaved,
      totalIncurred: totalStats.totalCostIncurred,
      netSavings: totalStats.totalCostSaved - totalStats.totalCostIncurred,
      wasteEliminated: totalStats.skipped > 0
    },
    errors: totalStats.errors.slice(0, 50), // Keep first 50 errors for debugging
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Final summary with zero-waste metrics
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const totalProcessed = totalStats.success + totalStats.skipped;
  const avgTimePerMovie = totalProcessed > 0 ? Math.round(totalTime / totalProcessed) : 0;

  console.log('\n🛡️ ZERO-WASTE NUCLEAR STATIC GENERATION COMPLETE!');
  console.log('═'.repeat(60));
  console.log(`✅ Generated: ${totalStats.success} movies`);
  console.log(`⚡ Skipped (complete): ${totalStats.skipped} movies`);
  console.log(`❌ Failed: ${totalStats.failed} movies`);
  console.log(`⏱️  Total time: ${totalTime}s (${Math.round(totalTime / 60)}m)`);
  console.log(`📊 Average: ${avgTimePerMovie}s per movie (processed)`);
  console.log(`💰 Cost saved: $${totalStats.totalCostSaved.toFixed(2)}`);
  console.log(`💰 Cost incurred: $${totalStats.totalCostIncurred.toFixed(2)}`);
  console.log(`💰 Net savings: $${(totalStats.totalCostSaved - totalStats.totalCostIncurred).toFixed(2)}`);
  console.log(`📂 Output: nuclear-static/ (${totalStats.success} JSON files)`);
  console.log(`🚀 Ready for lightning-fast deployment with zero waste!`);

  if (totalStats.failed > 0) {
    console.log(
      `\n⚠️  Failed movies (first 10): ${totalStats.errors
        .slice(0, 10)
        .map(e => e.tmdbId)
        .join(', ')}`
    );
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🛡️ Zero-Waste Nuclear Static Generator v2.1.0

Generates static JSON files for lightning-fast movie page loading with bulletproof cost protection.

Usage:
  node scripts/nuclear-static-generator.js [options]

Options:
  --all              Generate all 6K+ movies with analysis (default: test mode with 10 movies)
  --batch=N          Process N movies in parallel (default: 10)
  --start=N          Resume from movie #N (for recovery)
  --help, -h         Show this help

Examples:
  node scripts/nuclear-static-generator.js                    # Test mode: 10 movies
  node scripts/nuclear-static-generator.js --all              # All 6K movies
  node scripts/nuclear-static-generator.js --all --batch=5    # All movies, 5 at a time
  node scripts/nuclear-static-generator.js --all --start=1000 # Resume from movie 1000

Features:
  🛡️ Zero-waste protection - skips complete files automatically
  🔗 Integrated movie linking - one-pass content generation
  💰 Cost tracking - monitors savings from waste elimination
  ⚡ Parallel processing for speed
  📊 Comprehensive manifest with cost metrics
  🔄 Resume capability for interrupted runs
  ✅ Three-tier protection system (complete/unlinked/missing)

The generated files can be deployed as static assets for <100ms page loads with zero regeneration waste.
`);
  process.exit(0);
}

// Run the generator
generateNuclearStaticFiles().catch(error => {
  console.error('💥 Nuclear static generation failed:', error);
  process.exit(1);
});
