/**
 * Static File Link Processor - Nuclear Cache Processing
 *
 * Processes static movie analysis files in /public/nuclear-static/ to add movie and contributor links.
 * For Railway database processing, use: scripts/process-railway-links.js
 *
 * This script:
 * 1. Finds **Movie Title** (Year) and **Movie Title** patterns in analysis content  
 * 2. Links contributor names from KEY_CONTRIBUTORS to analysis text
 * 3. Looks up movies in database, adds missing via TMDB
 * 4. Creates direct /movie/TMDB_ID and /person/name-slug links
 * 5. Prevents self-referential links
 */

import { processStaticPages, testMovieAnalysisLinking } from '../lib/movie-analysis-linker.js';

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');
const testCountArg = args.find(arg => arg.startsWith('--test-count='));
const testCount = testCountArg ? parseInt(testCountArg.split('=')[1]) : 20;

// New linking control flags
const enableMovies = args.includes('--movies');
const enableContributors = args.includes('--contributors');
const enableAll = args.includes('--all');

// Default: if no flags specified, enable both (backward compatibility)
const processMovies = enableAll || enableMovies || (!enableMovies && !enableContributors);
const processContributors = enableAll || enableContributors || (!enableMovies && !enableContributors);

async function main() {
  console.log('🎬 Movie Analysis Linking Script - V1');
  console.log('=====================================\n');
  
  // Show linking configuration
  console.log('🔧 Linking Configuration:');
  console.log(`   Movies: ${processMovies ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Contributors: ${processContributors ? '✅ Enabled' : '❌ Disabled'}`);
  console.log('');

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  if (processMovies && !process.env.NEXT_PUBLIC_TMDB_API_KEY) {
    console.error('❌ Missing TMDB API key (required for movie linking)');
    process.exit(1);
  }

  try {
    if (testMode) {
      // Test with sample analysis content
      console.log('🧪 Testing Movie Analysis Linking System\n');

      const sampleContent = `
The horror genre found its visual language through German Expressionism, particularly in **Nosferatu** (1922) and **The Cabinet of Dr. Caligari** (1920). These films established the use of shadows and distorted perspectives that would influence horror cinema for decades.

Later films like **The Lighthouse** (2019) and **The Witch** demonstrate how modern filmmakers continue to draw from these expressionist techniques. The stark black-and-white cinematography in **The Lighthouse** directly references the visual style pioneered in films like **M** (1931).

Contemporary horror directors often cite **Psycho** and **The Exorcist** as major influences, showing how the genre evolved from its expressionist roots to psychological terror.
      `;

      await testMovieAnalysisLinking(sampleContent, 'The Cabinet of Dr. Caligari');
    } else {
      // Process static pages
      const startTime = Date.now();
      const result = await processStaticPages(testCount, dryRun, {
        processMovies,
        processContributors
      });
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`\n⏱️  Completed in ${duration} seconds`);

      if (dryRun) {
        console.log('\n🔍 DRY RUN completed - no data was modified');
        console.log('Run without --dry-run flag to apply changes');
      } else {
        console.log('\n✅ Static page analysis content updated with movie links');
        console.log('🚀 Analysis pages are now ready for V1 launch');
      }
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Usage examples
if (process.argv.includes('--help')) {
  console.log(`
Movie Analysis Linking Script Usage:

  # Test the system with sample content:
  node scripts/process-movie-analysis-links.js --test

  # Dry run on 20 static pages (show what would be changed):
  node scripts/process-movie-analysis-links.js --dry-run

  # Process only movie links:
  node scripts/process-movie-analysis-links.js --movies

  # Process only contributor links:
  node scripts/process-movie-analysis-links.js --contributors

  # Process both (default behavior):
  node scripts/process-movie-analysis-links.js --all

  # Dry run with specific linking types:
  node scripts/process-movie-analysis-links.js --dry-run --contributors --test-count=50

  # Process 20 static pages (LIVE - modifies data):
  node scripts/process-movie-analysis-links.js

  # Process all available static pages:
  node scripts/process-movie-analysis-links.js --test-count=1000

Linking Features:
  • Movie Links: **Movie Title** (Year) → /movie/TMDB_ID
  • Contributor Links: First mentions of KEY_CONTRIBUTORS → /person/name-slug
  • Conservative matching to avoid character name conflicts
  • Gold underline styling for consistent UI

Flags:
  --movies        Enable movie linking only
  --contributors  Enable contributor linking only
  --all          Enable both types (default if no flags)
  --dry-run      Show changes without modifying files
  --test         Run with sample content instead of files
  --test-count=N Process N static pages (default: 20)
  • Prevents self-referential links (movies don't link to themselves)
  • Processes both sections and exploreFurther content
  • Rate limited to avoid API overload
  • Safe error handling for each page

Pattern Examples:
  • **Nosferatu** (1922) → <a href="/movie/653" class="movie-title">Nosferatu</a> (1922)
  • **The Cabinet of Dr. Caligari** → <a href="/movie/234" class="movie-title">The Cabinet of Dr. Caligari</a>
  • **Unknown Movie** → Unknown Movie (strips ** marks)

Environment Variables Required:
  • NEXT_PUBLIC_SUPABASE_URL
  • SUPABASE_SERVICE_ROLE_KEY  
  • NEXT_PUBLIC_TMDB_API_KEY
`);
  process.exit(0);
}

main();
