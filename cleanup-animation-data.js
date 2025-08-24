// Animation cleanup: 1. Dedupe same movie on same list, 2. Remove duplicate movies in genre
import fs from 'fs';
import path from 'path';

class AnimationDataCleaner {
  constructor() {
    this.genreFile = './normalized-categories/animation-normalized.json';
    this.buildStateFile = './list-analysis-output/animation-build-state.json';
    this.backupDir = './animation-cleanup-backup';
  }

  createBackup() {
    console.log('💾 Creating backup of Animation data...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
    }
    
    if (fs.existsSync(this.genreFile)) {
      fs.copyFileSync(this.genreFile, path.join(this.backupDir, 'animation-normalized.json'));
    }
    
    if (fs.existsSync(this.buildStateFile)) {
      fs.copyFileSync(this.buildStateFile, path.join(this.backupDir, 'animation-build-state.json'));
    }
    
    console.log(`✅ Backup created in ${this.backupDir}`);
  }

  async cleanup1_DedupeMoviesOnSameLists() {
    console.log('\n🔧 CLEANUP 1: Dedupe same movie on same list');
    console.log('═══════════════════════════════════════════');
    
    if (!fs.existsSync(this.buildStateFile)) {
      console.log('❌ No Animation build state found - nothing to dedupe');
      return { listsProcessed: 0, duplicatesRemoved: 0 };
    }
    
    const buildState = JSON.parse(fs.readFileSync(this.buildStateFile, 'utf8'));
    const stats = {
      listsProcessed: 0,
      duplicatesRemoved: 0,
      listsBefore: Object.keys(buildState.allLists || {}).length
    };
    
    // Process each list to remove duplicate movie IDs
    for (const [listName, listData] of Object.entries(buildState.allLists || {})) {
      if (!listData.movieIds || !Array.isArray(listData.movieIds)) {
        continue;
      }
      
      const originalCount = listData.movieIds.length;
      const uniqueMovieIds = [...new Set(listData.movieIds)]; // Remove duplicates
      const duplicatesInList = originalCount - uniqueMovieIds.length;
      
      if (duplicatesInList > 0) {
        console.log(`🔧 ${listName}: removed ${duplicatesInList} duplicate movie IDs (${originalCount} → ${uniqueMovieIds.length})`);
        listData.movieIds = uniqueMovieIds;
        listData.movieCount = uniqueMovieIds.length;
        stats.duplicatesRemoved += duplicatesInList;
      }
      
      stats.listsProcessed++;
    }
    
    // Save cleaned build state
    if (stats.duplicatesRemoved > 0) {
      fs.writeFileSync(this.buildStateFile, JSON.stringify(buildState, null, 2));
      console.log(`💾 Updated build state with deduplicated lists`);
    }
    
    console.log(`✅ Cleanup 1 complete: ${stats.duplicatesRemoved} duplicates removed from ${stats.listsProcessed} lists`);
    return stats;
  }

  async cleanup2_RemoveDuplicateMoviesInGenre() {
    console.log('\n🔧 CLEANUP 2: Remove duplicate movies in genre');
    console.log('═══════════════════════════════════════════');
    
    if (!fs.existsSync(this.genreFile)) {
      console.log('❌ No Animation genre file found');
      return { moviesProcessed: 0, duplicatesRemoved: 0 };
    }
    
    const genreData = JSON.parse(fs.readFileSync(this.genreFile, 'utf8'));
    const originalCount = genreData.movieData.length;
    const stats = {
      moviesProcessed: originalCount,
      duplicatesRemoved: 0,
      moviesBefore: originalCount
    };
    
    console.log(`📊 Original movie count: ${originalCount}`);
    
    // Deduplicate by TMDB ID, keeping the first occurrence
    const seenTMDBIds = new Set();
    const seenUUIDs = new Set();
    const uniqueMovies = [];
    
    for (const movie of genreData.movieData) {
      let isDuplicate = false;
      
      // Check for TMDB ID duplicates
      if (movie.tmdbId && seenTMDBIds.has(movie.tmdbId)) {
        console.log(`🔧 Removing TMDB duplicate: "${movie.title}" (${movie.year}) - TMDB ID ${movie.tmdbId}`);
        isDuplicate = true;
      }
      
      // Check for UUID duplicates  
      if (movie.id && seenUUIDs.has(movie.id)) {
        console.log(`🔧 Removing UUID duplicate: "${movie.title}" (${movie.year}) - UUID ${movie.id}`);
        isDuplicate = true;
      }
      
      if (!isDuplicate) {
        uniqueMovies.push(movie);
        if (movie.tmdbId) seenTMDBIds.add(movie.tmdbId);
        if (movie.id) seenUUIDs.add(movie.id);
      } else {
        stats.duplicatesRemoved++;
      }
    }
    
    // Update genre data
    genreData.movieData = uniqueMovies.sort((a, b) => a.title.localeCompare(b.title));
    genreData.movieCount = uniqueMovies.length;
    
    console.log(`📊 Final movie count: ${uniqueMovies.length} (removed ${stats.duplicatesRemoved} duplicates)`);
    
    // Save cleaned genre file
    if (stats.duplicatesRemoved > 0) {
      fs.writeFileSync(this.genreFile, JSON.stringify(genreData, null, 2));
      console.log(`💾 Updated genre file with deduplicated movies`);
    }
    
    console.log(`✅ Cleanup 2 complete: ${stats.duplicatesRemoved} duplicate movies removed`);
    return stats;
  }

  verifyCleanup() {
    console.log('\n🔍 Verifying cleanup...');
    
    // Check genre file
    if (fs.existsSync(this.genreFile)) {
      const genreData = JSON.parse(fs.readFileSync(this.genreFile, 'utf8'));
      const tmdbIds = genreData.movieData.filter(m => m.tmdbId).map(m => m.tmdbId);
      const uniqueTmdbIds = [...new Set(tmdbIds)];
      
      console.log(`📊 Genre file: ${genreData.movieCount} movies`);
      console.log(`📊 TMDB IDs: ${tmdbIds.length} total, ${uniqueTmdbIds.length} unique`);
      
      if (tmdbIds.length === uniqueTmdbIds.length) {
        console.log(`✅ No TMDB ID duplicates in genre`);
      } else {
        console.log(`❌ Still has ${tmdbIds.length - uniqueTmdbIds.length} TMDB ID duplicates`);
      }
    }
    
    // Check build state
    if (fs.existsSync(this.buildStateFile)) {
      const buildState = JSON.parse(fs.readFileSync(this.buildStateFile, 'utf8'));
      let totalDuplicates = 0;
      let listsWithDuplicates = 0;
      
      for (const [listName, listData] of Object.entries(buildState.allLists || {})) {
        if (listData.movieIds && Array.isArray(listData.movieIds)) {
          const unique = [...new Set(listData.movieIds)];
          const duplicates = listData.movieIds.length - unique.length;
          if (duplicates > 0) {
            totalDuplicates += duplicates;
            listsWithDuplicates++;
          }
        }
      }
      
      console.log(`📊 Build state: ${Object.keys(buildState.allLists || {}).length} lists`);
      if (totalDuplicates === 0) {
        console.log(`✅ No duplicate movies in any list`);
      } else {
        console.log(`❌ Still has ${totalDuplicates} duplicates across ${listsWithDuplicates} lists`);
      }
    }
  }

  printSummary(cleanup1Stats, cleanup2Stats) {
    console.log('\n🎯 ANIMATION CLEANUP COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`🔧 Cleanup 1 - List duplicates:`);
    console.log(`   📋 Lists processed: ${cleanup1Stats.listsProcessed}`);
    console.log(`   🗑️  Duplicates removed: ${cleanup1Stats.duplicatesRemoved}`);
    console.log(`🔧 Cleanup 2 - Genre duplicates:`);
    console.log(`   🎬 Movies before: ${cleanup2Stats.moviesBefore}`);
    console.log(`   🗑️  Duplicates removed: ${cleanup2Stats.duplicatesRemoved}`);
    console.log(`   🎬 Movies after: ${cleanup2Stats.moviesBefore - cleanup2Stats.duplicatesRemoved}`);
    console.log('');
    console.log('💾 Backup available in: ./animation-cleanup-backup/');
    console.log('✅ Animation data cleaned and ready for production!');
  }
}

async function main() {
  const cleaner = new AnimationDataCleaner();
  
  try {
    cleaner.createBackup();
    
    const cleanup1Stats = await cleaner.cleanup1_DedupeMoviesOnSameLists();
    const cleanup2Stats = await cleaner.cleanup2_RemoveDuplicateMoviesInGenre();
    
    cleaner.verifyCleanup();
    cleaner.printSummary(cleanup1Stats, cleanup2Stats);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Animation cleanup failed:', error);
    console.log('💾 Your data is safe - restore from ./animation-cleanup-backup/ if needed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}