/**
 * Episode Movie Linking Script - V1 Production
 * 
 * Processes all 65 episode files to create proper movie links.
 * Run with: node scripts/process-episode-links.js [--dry-run]
 * 
 * This script:
 * 1. Finds **Movie Title** (Year) patterns in episode content
 * 2. Looks up movies in database
 * 3. Adds missing movies via TMDB (like MediaCard logic)
 * 4. Creates direct /movie/TMDB_ID links
 * 5. Updates episode JSON files with linked content
 */

import { processAllEpisodes, testSingleEpisode } from '../lib/episode-movie-linker.js';

// Check command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const testMode = args.includes('--test');
const testFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

async function main() {
  console.log('🎬 Episode Movie Linking Script - V1');
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
    if (testMode && testFile) {
      // Test single episode
      console.log(`🧪 Testing single episode: ${testFile}`)
      const result = await testSingleEpisode(testFile, true);
      console.log('Test result:', JSON.stringify(result, null, 2));
      
    } else if (testMode) {
      // Test with first episode
      console.log('🧪 Testing with genius-1-1-1.json');
      const result = await testSingleEpisode('genius-1-1-1.json', true);
      console.log('✅ Test completed - check console output for movie links found');
      
    } else {
      // Process all episodes
      const startTime = Date.now();
      const result = await processAllEpisodes(dryRun);
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      console.log(`\n⏱️  Completed in ${duration} seconds`);
      
      if (dryRun) {
        console.log('\n🔍 DRY RUN completed - no files were modified');
        console.log('Run without --dry-run flag to apply changes');
      } else {
        console.log('\n✅ All episode files updated with movie links');
        console.log('🚀 Episodes are now ready for V1 launch');
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
Episode Movie Linking Script Usage:

  # Test the system (dry run):
  node scripts/process-episode-links.js --test

  # Test single episode:
  node scripts/process-episode-links.js --test --file=genius-1-1-1.json

  # Dry run (show what would be changed):
  node scripts/process-episode-links.js --dry-run

  # Process all episodes (LIVE - modifies files):
  node scripts/process-episode-links.js

Features:
  • Finds **Movie Title** (Year) patterns in all episode text
  • Looks up movies in database by title and year
  • Adds missing movies via TMDB API (like MediaCard)
  • Creates direct /movie/TMDB_ID links
  • Preserves bold formatting for **Movie** patterns
  • Rate limited to avoid API overload
  • Safe error handling for each episode

Environment Variables Required:
  • NEXT_PUBLIC_SUPABASE_URL
  • SUPABASE_SERVICE_ROLE_KEY  
  • NEXT_PUBLIC_TMDB_API_KEY
`);
  process.exit(0);
}

main();