// Convert Musical browse collections to normalized format matching other genres
import fs from 'fs';
import path from 'path';

class MusicalDataNormalizer {
  constructor() {
    this.musicalDir = './musical-fresh-start';
    this.outputDir = './list-analysis-output';
    this.buildStateFile = path.join(this.outputDir, 'musical-build-state.json');
  }

  async normalizeMusicalData() {
    console.log('🎵 MUSICAL DATA NORMALIZATION');
    console.log('═══════════════════════════════════════════');
    
    // Load Musical master lists
    const masterListsFile = path.join(this.musicalDir, 'musical-master-lists.json');
    if (!fs.existsSync(masterListsFile)) {
      throw new Error('Musical master lists not found');
    }
    
    const musicalData = JSON.parse(fs.readFileSync(masterListsFile, 'utf8'));
    console.log(`📊 Musical data loaded: ${musicalData.totalLists} lists, ${musicalData.totalMoviesProcessed} movies`);
    
    // Create normalized build state format
    const normalizedBuildState = {
      category: 'Musical',
      totalMovies: musicalData.totalMoviesProcessed,
      processedMovies: musicalData.totalMoviesProcessed,
      totalLists: musicalData.totalLists,
      totalCost: musicalData.totalCost,
      failures: 0,
      startTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      allLists: {}
    };
    
    // Convert lists to normalized format
    let listCount = 0;
    for (const list of musicalData.allLists) {
      normalizedBuildState.allLists[list.name] = {
        name: list.name,
        movieIds: list.movieIds || [],
        movieCount: (list.movieIds || []).length,
        createdAt: new Date().toISOString()
      };
      listCount++;
    }
    
    console.log(`✅ Converted ${listCount} Musical collections to normalized format`);
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }
    
    // Save normalized build state
    fs.writeFileSync(this.buildStateFile, JSON.stringify(normalizedBuildState, null, 2));
    
    // Create Musical analysis log in standard format
    const logFile = path.join(this.outputDir, 'musical-analysis.log');
    const logContent = `${new Date().toISOString()} 🎵 Musical genre processing completed
${new Date().toISOString()} 📊 Total movies: ${musicalData.totalMoviesProcessed}
${new Date().toISOString()} 📋 Total collections: ${musicalData.totalLists}
${new Date().toISOString()} 💰 Total cost: $${musicalData.totalCost.toFixed(6)}
${new Date().toISOString()} ✅ Musical data normalized and ready for production
`;
    
    fs.writeFileSync(logFile, logContent);
    
    console.log('\n🎯 MUSICAL NORMALIZATION COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log(`📂 Build state: ${this.buildStateFile}`);
    console.log(`📝 Analysis log: ${logFile}`);
    console.log(`📊 Collections: ${normalizedBuildState.totalLists}`);
    console.log(`🎬 Movies: ${normalizedBuildState.totalMovies}`);
    console.log(`💰 Cost: $${normalizedBuildState.totalCost.toFixed(2)}`);
    console.log('');
    console.log('✅ Musical now matches format of other genres!');
  }

  verifyNormalization() {
    console.log('\n🔍 Verifying Musical normalization...');
    
    // Check build state exists
    if (fs.existsSync(this.buildStateFile)) {
      const buildState = JSON.parse(fs.readFileSync(this.buildStateFile, 'utf8'));
      console.log(`✅ Musical build state: ${Object.keys(buildState.allLists).length} collections`);
    } else {
      console.log(`❌ Musical build state missing: ${this.buildStateFile}`);
    }
    
    // Check normalized genre file exists  
    const genreFile = './normalized-categories/musical-normalized.json';
    if (fs.existsSync(genreFile)) {
      const genreData = JSON.parse(fs.readFileSync(genreFile, 'utf8'));
      console.log(`✅ Musical genre file: ${genreData.movieCount} movies with TMDB IDs`);
    } else {
      console.log(`❌ Musical genre file missing: ${genreFile}`);
    }
  }
}

async function main() {
  const normalizer = new MusicalDataNormalizer();
  
  try {
    await normalizer.normalizeMusicalData();
    normalizer.verifyNormalization();
    
    console.log('\n🎉 Musical data successfully normalized!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Musical normalization failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}