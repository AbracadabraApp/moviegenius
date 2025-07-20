#!/usr/bin/env node

/**
 * Process unprocessed files by starting from a higher TMDB ID
 */

import fs from 'fs';

// Load environment variables from .env.local BEFORE importing anything else
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
    console.log('✅ Environment variables loaded from .env.local');
  } catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
  }
}

// Load env vars first
loadEnvFile();

// Now import the movie linker
const { processStaticPages } = await import('./lib/movie-analysis-linker.js');

async function main() {
  const args = process.argv.slice(2);
  let testCount = 50; // default
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      testCount = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--help') {
      console.log('Usage: node process-fresh-files.js [options]');
      console.log('Options:');
      console.log('  --count=N     Process N files (default: 50)');
      console.log('  --dry-run     Test mode - no files modified');
      console.log('  --help        Show this help');
      process.exit(0);
    }
  }

  console.log(`🚀 Processing fresh files with movie linking...`);
  console.log(`📊 Processing ${testCount} files`);
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}`);
  console.log('');

  try {
    // Check what files we have in nuclear-static that start with higher numbers
    const nuclearDir = './nuclear-static';
    const files = fs
      .readdirSync(nuclearDir)
      .filter(f => f.endsWith('.json'))
      .map(f => parseInt(f.replace('.json', '')))
      .sort((a, b) => a - b);

    console.log(`📁 Found ${files.length} total files`);
    console.log(`🔢 File range: ${files[0]} to ${files[files.length - 1]}`);

    // Let's look for some files in the middle range that might be unprocessed
    const midRangeFiles = files.filter(id => id >= 1000 && id <= 5000);
    console.log(`📈 Mid-range files (1000-5000): ${midRangeFiles.length} files`);

    // Sample a few to check if they're processed
    for (let i = 0; i < Math.min(5, midRangeFiles.length); i++) {
      const fileId = midRangeFiles[i];
      const filePath = `${nuclearDir}/${fileId}.json`;

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const hasLinks = content.includes('class="movie-title"');
        const hasBold = content.includes('**');

        console.log(
          `📄 ${fileId}.json: ${hasLinks ? '✅ Has links' : '❌ No links'}, ${hasBold ? '⚠️ Has **bold**' : '✅ No bold'}`
        );
      } catch (e) {
        console.log(`📄 ${fileId}.json: Error reading file`);
      }
    }

    // Now run the actual processing
    const results = await processStaticPages(testCount, dryRun);

    console.log('\n🎉 Movie linking completed!');
    console.log(`📈 Results: ${JSON.stringify(results, null, 2)}`);
  } catch (error) {
    console.error('❌ Error running movie linker:', error);
    process.exit(1);
  }
}

main();
