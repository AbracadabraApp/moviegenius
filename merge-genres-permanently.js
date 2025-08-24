// Permanently merge smaller genres into larger ones
// Larger genre inherits all movies from smaller genre, smaller genre is deleted

import fs from 'fs';
import path from 'path';

const MERGERS = {
  // Format: 'larger-genre': 'smaller-genre-to-absorb'
  'Psychological': 'Psychological Thriller',
  'Science Fiction': 'Science Fiction Horror', 
  'Film Noir': 'Neo-noir',
  'Romance': 'Romantic Comedy',
  'Action Thriller': 'Spy'
};

class GenreMerger {
  constructor() {
    this.categoryDir = './normalized-categories';
    this.datasetFile = './tmdb-normalized-dataset.json';
    this.backupDir = './pre-merge-backup';
  }

  createBackup() {
    console.log('💾 Creating backup of current normalized data...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir);
    }
    
    // Backup main dataset
    fs.copyFileSync(this.datasetFile, path.join(this.backupDir, 'tmdb-normalized-dataset.json'));
    
    // Backup category files
    const categoryBackupDir = path.join(this.backupDir, 'normalized-categories');
    if (!fs.existsSync(categoryBackupDir)) {
      fs.mkdirSync(categoryBackupDir);
    }
    
    const files = fs.readdirSync(this.categoryDir);
    for (const file of files) {
      fs.copyFileSync(
        path.join(this.categoryDir, file),
        path.join(categoryBackupDir, file)
      );
    }
    
    console.log(`✅ Backup created in ${this.backupDir}`);
  }

  getGenreFileName(genreName) {
    return `${genreName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-normalized.json`;
  }

  async performMerges() {
    console.log('🔗 PERMANENT GENRE MERGERS');
    console.log('═══════════════════════════════════════════');
    
    const mergeStats = {
      totalMergers: 0,
      totalMoviesReassigned: 0,
      genresDeleted: []
    };

    // Load main dataset
    const dataset = JSON.parse(fs.readFileSync(this.datasetFile, 'utf8'));
    
    for (const [largerGenre, smallerGenre] of Object.entries(MERGERS)) {
      console.log(`\n🔗 Merging: ${smallerGenre} → ${largerGenre}`);
      
      const largerFile = path.join(this.categoryDir, this.getGenreFileName(largerGenre));
      const smallerFile = path.join(this.categoryDir, this.getGenreFileName(smallerGenre));
      
      // Check if both files exist
      if (!fs.existsSync(largerFile)) {
        console.log(`❌ Larger genre file not found: ${largerFile}`);
        continue;
      }
      
      if (!fs.existsSync(smallerFile)) {
        console.log(`❌ Smaller genre file not found: ${smallerFile}`);
        continue;
      }
      
      // Load genre data
      const largerData = JSON.parse(fs.readFileSync(largerFile, 'utf8'));
      const smallerData = JSON.parse(fs.readFileSync(smallerFile, 'utf8'));
      
      console.log(`📊 ${largerGenre}: ${largerData.movieCount} movies`);
      console.log(`📊 ${smallerGenre}: ${smallerData.movieCount} movies`);
      
      // Merge movies with deduplication by TMDB ID
      const existingTMDBIds = new Set(
        largerData.movieData
          .filter(m => m.tmdbId)
          .map(m => m.tmdbId)
      );
      
      const moviesToAdd = smallerData.movieData.filter(movie => {
        if (movie.tmdbId && existingTMDBIds.has(movie.tmdbId)) {
          return false; // Skip duplicate
        }
        return true;
      });
      
      // Add new movies to larger genre
      largerData.movieData.push(...moviesToAdd);
      largerData.movieCount = largerData.movieData.length;
      
      // Sort movies alphabetically
      largerData.movieData.sort((a, b) => a.title.localeCompare(b.title));
      
      // Update category name to reflect merger if needed
      largerData.category = largerGenre;
      
      console.log(`✅ Added ${moviesToAdd.length} new movies to ${largerGenre}`);
      console.log(`📊 ${largerGenre} now has: ${largerData.movieCount} movies`);
      
      // Save updated larger genre file
      fs.writeFileSync(largerFile, JSON.stringify(largerData, null, 2));
      
      // Delete smaller genre file
      fs.unlinkSync(smallerFile);
      console.log(`🗑️  Deleted: ${smallerFile}`);
      
      // Update main dataset
      if (dataset.categories && dataset.categories[largerGenre] && dataset.categories[smallerGenre]) {
        // Merge category data in main dataset
        dataset.categories[largerGenre] = largerData;
        delete dataset.categories[smallerGenre];
        console.log(`📝 Updated main dataset: removed ${smallerGenre}, updated ${largerGenre}`);
      }
      
      // Update stats
      mergeStats.totalMergers++;
      mergeStats.totalMoviesReassigned += moviesToAdd.length;
      mergeStats.genresDeleted.push(smallerGenre);
    }
    
    // Save updated main dataset
    if (mergeStats.totalMergers > 0) {
      dataset.stats.categories = Object.keys(dataset.categories || {}).length;
      dataset.stats.lastMerged = new Date().toISOString();
      fs.writeFileSync(this.datasetFile, JSON.stringify(dataset, null, 2));
      console.log(`💾 Updated main dataset file`);
    }
    
    this.printMergeSummary(mergeStats);
  }

  printMergeSummary(stats) {
    console.log('\n🎯 MERGE COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`🔗 Total mergers: ${stats.totalMergers}`);
    console.log(`🎬 Movies reassigned: ${stats.totalMoviesReassigned}`);
    console.log(`🗑️  Genres deleted: ${stats.genresDeleted.length}`);
    
    if (stats.genresDeleted.length > 0) {
      console.log('\n📋 Deleted genres:');
      stats.genresDeleted.forEach(genre => {
        console.log(`  ❌ ${genre}`);
      });
    }
    
    console.log('\n✅ Genre structure permanently simplified!');
    console.log('💾 Backup available in: ./pre-merge-backup/');
    console.log('🚀 Ready for streamlined overnight processing');
  }

  async verifyMerges() {
    console.log('\n🔍 Verifying merges...');
    
    const files = fs.readdirSync(this.categoryDir);
    const genreCount = files.filter(f => f.endsWith('-normalized.json')).length;
    
    console.log(`📊 Genre files after merger: ${genreCount}`);
    
    // Check that smaller genres are gone
    for (const smallerGenre of Object.values(MERGERS)) {
      const fileName = this.getGenreFileName(smallerGenre);
      const filePath = path.join(this.categoryDir, fileName);
      
      if (fs.existsSync(filePath)) {
        console.log(`❌ ERROR: ${smallerGenre} file still exists: ${fileName}`);
      } else {
        console.log(`✅ ${smallerGenre} successfully removed`);
      }
    }
  }
}

async function main() {
  const merger = new GenreMerger();
  
  try {
    merger.createBackup();
    await merger.performMerges();
    await merger.verifyMerges();
    
    console.log('\n🎉 All genre mergers completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Merger failed:', error);
    console.log('💾 Your data is safe - restore from ./pre-merge-backup/ if needed');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}