#!/usr/bin/env node

/**
 * Episode Migration Script
 *
 * Migrates all Genius episode content from JSON files to database storage.
 * Preserves all metadata including locks, versions, and generation timestamps.
 *
 * Usage:
 *   node scripts/migrate-episodes-to-db.js [--dry-run] [--force]
 *
 * Options:
 *   --dry-run  Show what would be migrated without actually doing it
 *   --force    Overwrite existing episodes in database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EpisodeService } from '../lib/supabase.js';
import geniusConfig from '../data/genius-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

// Migration statistics
const stats = {
  total: 0,
  successful: 0,
  skipped: 0,
  errors: 0,
  details: [],
};

/**
 * Parse episode filename to extract theme, series, and episode IDs
 * Expected format: genius-{themeId}-{seriesId}-{episodeId}.json
 */
function parseEpisodeFilename(filename) {
  const match = filename.match(/^genius-(\d+)-(\d+)-(\d+)\.json$/);
  if (!match) {
    return null;
  }

  return {
    themeId: parseInt(match[1]),
    seriesId: parseInt(match[2]),
    episodeId: parseInt(match[3]),
  };
}

/**
 * Get episode metadata from genius config
 */
function getEpisodeMetadata(themeId, seriesId, episodeId) {
  const theme = geniusConfig.themes[themeId];
  if (!theme) {
    return null;
  }

  const series = theme.series.find(s => s.id === seriesId);
  if (!series) {
    return null;
  }

  const episode = series.episodes.find(e => e.id === episodeId);
  if (!episode) {
    return null;
  }

  return {
    theme,
    series,
    episode,
  };
}

/**
 * Validate episode JSON structure
 */
function validateEpisodeData(episodeData) {
  const required = ['content'];
  const optional = [
    'system',
    'themeId',
    'seriesId',
    'episodeId',
    'theme',
    'series',
    'episode',
    'generatedAt',
    'version',
    'type',
    'locked',
    'lockedAt',
    'lockedBy',
    'heroImage',
  ];

  // Check required fields
  for (const field of required) {
    if (!episodeData.hasOwnProperty(field)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  // Validate content structure
  if (!episodeData.content || typeof episodeData.content !== 'object') {
    return { valid: false, error: 'Content must be an object' };
  }

  return { valid: true };
}

/**
 * Transform JSON episode data to database format
 */
function transformEpisodeData(jsonData, themeId, seriesId, episodeId, metadata) {
  const { episode } = metadata;

  return {
    theme_id: themeId,
    series_id: seriesId,
    episode_id: episodeId,
    title: episode.title,
    subtitle: episode.subtitle,
    content: jsonData.content,
    hero_image: jsonData.heroImage || null,
    generated_at: jsonData.generatedAt ? new Date(jsonData.generatedAt) : null,
    version: jsonData.version || null,
    locked: jsonData.locked || false,
    locked_at: jsonData.lockedAt ? new Date(jsonData.lockedAt) : null,
    locked_by: jsonData.lockedBy || null,
  };
}

/**
 * Migrate a single episode file
 */
async function migrateEpisodeFile(filepath, filename) {
  const parseResult = parseEpisodeFilename(filename);
  if (!parseResult) {
    stats.errors++;
    stats.details.push({
      file: filename,
      status: 'error',
      message: 'Invalid filename format',
    });
    return;
  }

  const { themeId, seriesId, episodeId } = parseResult;

  // Get episode metadata from config
  const metadata = getEpisodeMetadata(themeId, seriesId, episodeId);
  if (!metadata) {
    stats.errors++;
    stats.details.push({
      file: filename,
      status: 'error',
      message: `Episode not found in genius-config.json: ${themeId}-${seriesId}-${episodeId}`,
    });
    return;
  }

  try {
    // Read and parse JSON file
    const fileContent = fs.readFileSync(filepath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    // Validate episode data
    const validation = validateEpisodeData(jsonData);
    if (!validation.valid) {
      stats.errors++;
      stats.details.push({
        file: filename,
        status: 'error',
        message: `Invalid episode data: ${validation.error}`,
      });
      return;
    }

    // Transform to database format
    const episodeData = transformEpisodeData(jsonData, themeId, seriesId, episodeId, metadata);

    if (isDryRun) {
      console.log(
        `[DRY RUN] Would migrate: ${filename} → episodes(${themeId}, ${seriesId}, ${episodeId})`
      );
      stats.successful++;
      stats.details.push({
        file: filename,
        status: 'dry-run',
        message: `Would insert: ${metadata.episode.title}`,
      });
      return;
    }

    // Check if episode already exists
    const existingEpisode = await EpisodeService.getEpisode(themeId, seriesId, episodeId);
    if (existingEpisode && !isForce) {
      stats.skipped++;
      stats.details.push({
        file: filename,
        status: 'skipped',
        message: 'Episode already exists (use --force to overwrite)',
      });
      return;
    }

    // Insert episode into database
    const result = await EpisodeService.upsertEpisode(episodeData);

    stats.successful++;
    stats.details.push({
      file: filename,
      status: 'success',
      message: `Migrated: ${metadata.episode.title}`,
      dbId: result.id,
    });

    console.log(`✅ Migrated: ${filename} → ${metadata.episode.title}`);
  } catch (error) {
    stats.errors++;
    stats.details.push({
      file: filename,
      status: 'error',
      message: error.message,
    });
    console.error(`❌ Error migrating ${filename}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function migrateEpisodes() {
  console.log('🚀 Starting Genius Episodes Migration');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
  console.log(`Force overwrite: ${isForce ? 'YES' : 'NO'}`);
  console.log('');

  const episodesDir = path.join(__dirname, '..', 'data', 'episodes');

  // Check if episodes directory exists
  if (!fs.existsSync(episodesDir)) {
    console.error('❌ Episodes directory not found:', episodesDir);
    process.exit(1);
  }

  // Get all JSON files in episodes directory
  const files = fs
    .readdirSync(episodesDir)
    .filter(file => file.endsWith('.json') && file.startsWith('genius-'))
    .filter(file => !file.includes('-updated.json')); // Skip backup files

  if (files.length === 0) {
    console.log('📁 No episode files found to migrate');
    return;
  }

  console.log(`📂 Found ${files.length} episode files to process:`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('');

  stats.total = files.length;

  // Process each file
  for (const file of files) {
    const filepath = path.join(episodesDir, file);
    await migrateEpisodeFile(filepath, file);
  }

  // Display migration results
  console.log('');
  console.log('📊 Migration Summary:');
  console.log(`   Total files: ${stats.total}`);
  console.log(`   Successful: ${stats.successful}`);
  console.log(`   Skipped: ${stats.skipped}`);
  console.log(`   Errors: ${stats.errors}`);

  if (stats.errors > 0) {
    console.log('');
    console.log('❌ Errors encountered:');
    stats.details
      .filter(d => d.status === 'error')
      .forEach(d => console.log(`   - ${d.file}: ${d.message}`));
  }

  if (stats.skipped > 0) {
    console.log('');
    console.log('⏭️  Skipped files:');
    stats.details
      .filter(d => d.status === 'skipped')
      .forEach(d => console.log(`   - ${d.file}: ${d.message}`));
  }

  console.log('');
  if (isDryRun) {
    console.log('🔍 Dry run completed. Use without --dry-run to perform actual migration.');
  } else {
    console.log('✅ Migration completed!');
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateEpisodes()
    .then(() => {
      process.exit(stats.errors > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateEpisodes, parseEpisodeFilename, validateEpisodeData };
