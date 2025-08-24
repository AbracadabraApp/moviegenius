// Build all eligible genres overnight - excludes Drama and small genres
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { BrowseCollectionGenerator } from './browse-collection-generator.js';

dotenv.config({ path: '.env.local' });

const CONFIG = {
  EXCLUDED_GENRES: ['Drama', 'Animation', 'Musical'], // Drama too large, Animation handled separately, Musical already done
  MIN_GENRE_SIZE: 100, // Skip genres with < 100 movies
  CONCURRENT_MOVIES: 4,
  GLOBAL_STATE_FILE: './all-genres-progress.json'
};

class AllGenresBuildSystem {
  constructor() {
    this.startTime = Date.now();
    this.globalProgress = this.loadGlobalProgress();
    this.totalStats = {
      genresCompleted: 0,
      totalGenres: 0,
      totalMovies: 0,
      processedMovies: 0,
      totalCost: 0,
      totalLists: 0
    };
  }

  loadGlobalProgress() {
    if (fs.existsSync(CONFIG.GLOBAL_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG.GLOBAL_STATE_FILE, 'utf8'));
    }
    return {
      completedGenres: [],
      currentGenre: null,
      startedAt: new Date().toISOString()
    };
  }

  saveGlobalProgress() {
    fs.writeFileSync(CONFIG.GLOBAL_STATE_FILE, JSON.stringify(this.globalProgress, null, 2));
  }

  getEligibleGenres() {
    console.log('🔍 Scanning normalized categories...');
    
    const categoryDir = './normalized-categories';
    if (!fs.existsSync(categoryDir)) {
      throw new Error('Normalized categories not found. Run normalize-tmdb-dataset.js first.');
    }
    
    const eligibleGenres = [];
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('-normalized.json'));
    
    for (const file of files) {
      const categoryName = file.replace('-normalized.json', '')
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Apply filtering rules
      if (CONFIG.EXCLUDED_GENRES.includes(categoryName)) {
        console.log(`⏭️  Skipping ${categoryName} (excluded)`);
        continue;
      }
      
      const categoryData = JSON.parse(fs.readFileSync(path.join(categoryDir, file), 'utf8'));
      
      if (categoryData.movieCount < CONFIG.MIN_GENRE_SIZE) {
        console.log(`⏭️  Skipping ${categoryName} (${categoryData.movieCount} movies < ${CONFIG.MIN_GENRE_SIZE})`);
        continue;
      }
      
      // Skip if already completed
      if (this.globalProgress.completedGenres.includes(categoryName)) {
        console.log(`✅ ${categoryName} already completed (${categoryData.movieCount} movies)`);
        this.totalStats.genresCompleted++;
        continue;
      }
      
      eligibleGenres.push({
        name: categoryName,
        file: path.join(categoryDir, file),
        movieCount: categoryData.movieCount
      });
      
      console.log(`📝 ${categoryName}: ${categoryData.movieCount} movies (eligible)`);
    }
    
    // Sort by size (smallest first)
    eligibleGenres.sort((a, b) => a.movieCount - b.movieCount);
    
    return eligibleGenres;
  }

  async processAllGenres() {
    console.log('🎬 ALL GENRES BUILD SYSTEM');
    console.log('═══════════════════════════════════════════');
    console.log(`📝 Exclusions: ${CONFIG.EXCLUDED_GENRES.join(', ')}`);
    console.log(`📝 Min size: ${CONFIG.MIN_GENRE_SIZE} movies`);
    console.log('');

    const eligibleGenres = this.getEligibleGenres();
    
    if (eligibleGenres.length === 0) {
      console.log('✅ All eligible genres already completed!');
      return;
    }

    // Calculate totals
    this.totalStats.totalGenres = eligibleGenres.length + this.globalProgress.completedGenres.length;
    this.totalStats.totalMovies = eligibleGenres.reduce((sum, g) => sum + g.movieCount, 0);
    
    const estimatedHours = Math.round((this.totalStats.totalMovies * 2.2) / 3600 * 10) / 10;
    const estimatedCost = Math.round(this.totalStats.totalMovies * 0.005 * 100) / 100;
    
    console.log('📊 OVERNIGHT BUILD PLAN');
    console.log('═══════════════════════════════════════════');
    console.log(`🎭 Eligible genres: ${eligibleGenres.length}`);
    console.log(`🎬 Total movies: ${this.totalStats.totalMovies.toLocaleString()}`);
    console.log(`⏰ Estimated time: ${estimatedHours}h`);
    console.log(`💰 Estimated cost: $${estimatedCost}`);
    console.log('');
    console.log('📋 Processing order (smallest → largest):');
    eligibleGenres.forEach((genre, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${genre.name} (${genre.movieCount} movies)`);
    });
    console.log('');

    // Process each genre
    for (const [index, genre] of eligibleGenres.entries()) {
      const genreStartTime = Date.now();
      
      console.log(`\n🎬 PROCESSING GENRE ${index + 1}/${eligibleGenres.length}: ${genre.name.toUpperCase()}`);
      console.log('═'.repeat(80));
      
      this.globalProgress.currentGenre = genre.name;
      this.saveGlobalProgress();

      try {
        // Create temporary data file
        const tempDataFile = `${genre.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-temp.json`;
        const categoryData = JSON.parse(fs.readFileSync(genre.file, 'utf8'));
        fs.writeFileSync(tempDataFile, JSON.stringify(categoryData, null, 2));

        // Process genre
        const generator = new BrowseCollectionGenerator(genre.name, tempDataFile, './list-analysis-output');
        const results = await generator.generateBrowseCollections({
          concurrent: CONFIG.CONCURRENT_MOVIES
        });

        // Update stats
        this.totalStats.genresCompleted++;
        this.totalStats.processedMovies += genre.movieCount;
        this.totalStats.totalCost += results.totalCost || 0;
        this.totalStats.totalLists += results.totalLists || 0;

        // Mark as completed
        this.globalProgress.completedGenres.push(genre.name);
        this.globalProgress.currentGenre = null;
        this.saveGlobalProgress();

        // Clean up temp file
        if (fs.existsSync(tempDataFile)) {
          fs.unlinkSync(tempDataFile);
        }

        const genreTime = Math.round((Date.now() - genreStartTime) / 1000);
        const totalTime = Math.round((Date.now() - this.startTime) / 1000);
        const remainingGenres = eligibleGenres.length - (index + 1);
        const avgTimePerGenre = totalTime / (index + 1);
        const etaMinutes = Math.round((remainingGenres * avgTimePerGenre) / 60);

        console.log(`\n✅ ${genre.name} COMPLETED`);
        console.log(`⏱️  Genre time: ${genreTime}s | Total time: ${Math.floor(totalTime/60)}m`);
        console.log(`📊 Progress: ${this.totalStats.genresCompleted}/${this.totalStats.totalGenres} genres`);
        console.log(`🎬 Movies: ${this.totalStats.processedMovies.toLocaleString()}/${(this.totalStats.totalMovies + this.totalStats.processedMovies).toLocaleString()}`);
        console.log(`💰 Cost so far: $${this.totalStats.totalCost.toFixed(3)}`);
        console.log(`📋 Lists created: ${this.totalStats.totalLists}`);
        if (remainingGenres > 0) {
          console.log(`⏰ ETA for remaining ${remainingGenres} genres: ${etaMinutes}min`);
        }

      } catch (error) {
        console.error(`💥 ${genre.name} failed:`, error.message);
        console.log(`⏸️  Build paused. Run again to resume from ${genre.name}`);
        
        // Don't mark as completed, so it will retry
        this.globalProgress.currentGenre = null;
        this.saveGlobalProgress();
        
        process.exit(1);
      }
    }

    this.printFinalSummary();
  }

  printFinalSummary() {
    const totalHours = Math.round((Date.now() - this.startTime) / 3600000 * 10) / 10;
    
    console.log('\n🎉 ALL GENRES BUILD COMPLETE!');
    console.log('═'.repeat(80));
    console.log(`🎭 Genres processed: ${this.totalStats.genresCompleted}`);
    console.log(`🎬 Movies processed: ${this.totalStats.processedMovies.toLocaleString()}`);
    console.log(`📋 Collections created: ${this.totalStats.totalLists.toLocaleString()}`);
    console.log(`💰 Total cost: $${this.totalStats.totalCost.toFixed(2)}`);
    console.log(`⏰ Total time: ${totalHours}h`);
    console.log(`📈 Avg cost per movie: $${(this.totalStats.totalCost / this.totalStats.processedMovies).toFixed(4)}`);
    console.log('');
    console.log('🚀 All eligible genres ready for production!');
    
    // Clean up progress file
    if (fs.existsSync(CONFIG.GLOBAL_STATE_FILE)) {
      fs.unlinkSync(CONFIG.GLOBAL_STATE_FILE);
    }
  }
}

async function main() {
  const builder = new AllGenresBuildSystem();
  
  try {
    await builder.processAllGenres();
    process.exit(0);
  } catch (error) {
    console.error('💥 Build system failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}