/**
 * Movie Analysis Linking Script - V1 Production
 *
 * Processes static movie pages to create proper movie links in analysis content.
 * Run with: node scripts/process-movie-analysis-links.js [--dry-run] [--test-count=20]
 *
 * This script:
 * 1. Finds **Movie Title** (Year) and **Movie Title** patterns in analysis content
 * 2. Looks up movies in database
 * 3. Adds missing movies via TMDB (like MediaCard logic)
 * 4. Creates direct /movie/TMDB_ID links
 * 5. Strips ** marks for unlinked movies as fallback
 * 6. Prevents self-referential links (movies don't link to themselves)
 */

import { processStaticPages, testMovieAnalysisLinking } from '../lib/movie-analysis-linker.js';

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');
const testCountArg = args.find(arg => arg.startsWith('--test-count='));
const testCount = testCountArg ? parseInt(testCountArg.split('=')[1]) : 20;

async function main() {
  console.log('🎬 Movie Analysis Linking Script - V1');
  console.log('=====================================\n');

  // Validate environment
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  if (!process.env.NEXT_PUBLIC_TMDB_API_KEY) {
    console.error('❌ Missing TMDB API key');
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
      const result = await processStaticPages(testCount, dryRun);
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

  # Dry run on 50 static pages:
  node scripts/process-movie-analysis-links.js --dry-run --test-count=50

  # Process 20 static pages (LIVE - modifies data):
  node scripts/process-movie-analysis-links.js

  # Process all available static pages:
  node scripts/process-movie-analysis-links.js --test-count=1000

Features:
  • Finds **Movie Title** (Year) and **Movie Title** patterns
  • Looks up movies in database by title and year
  • Adds missing movies via TMDB API (like MediaCard)
  • Creates direct /movie/TMDB_ID links using movie-title class
  • Strips ** marks for unlinked movies as fallback
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
