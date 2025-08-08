// Simple test of enhanced WhyWatch prompt using existing API infrastructure
// Tests 5 films to validate the prompt structure and scoring system

// Test films with expected outcomes
const TEST_FILMS = [
  { tmdb_id: 238, title: "The Godfather (1972)", expected: "YES" },
  { tmdb_id: 27205, title: "Inception (2010)", expected: "MAYBE" },
  { tmdb_id: 550, title: "Fight Club (1999)", expected: "YES" },
  { tmdb_id: 109445, title: "Frozen (2013)", expected: "MAYBE" },
  { tmdb_id: 290250, title: "The Emoji Movie (2017)", expected: "NO" }
];

async function testSingleFilm(film) {
  console.log(`\n🎬 Testing: ${film.title} (Expected: ${film.expected})`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`http://localhost:3001/api/movie-analysis?tmdbId=${film.tmdb_id}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!data.success) {
      throw new Error(`API returned error: ${data.message}`);
    }
    
    // Try to parse the analysis as JSON to see if it's the new format
    let analysisData = null;
    let isNewFormat = false;
    
    try {
      analysisData = JSON.parse(data.analysis);
      if (analysisData.whyWatch) {
        isNewFormat = true;
      }
    } catch (e) {
      // Not JSON format, that's okay
    }
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Format: ${isNewFormat ? 'New JSON with whyWatch' : 'Legacy format'}`);
    
    if (isNewFormat) {
      const whyWatch = analysisData.whyWatch;
      console.log(`🎯 Recommendation: ${whyWatch.recommendation}`);
      console.log(`💡 Reasons:`);
      whyWatch.reasons.forEach((reason, i) => {
        const wordCount = reason.split(' ').length;
        console.log(`   ${i+1}. "${reason}" (${wordCount} words)`);
      });
      
      // Check vocabulary
      const allText = whyWatch.reasons.join(' ').toLowerCase();
      const bannedWords = ['masterful', 'portrayal', 'cgi', 'explores', 'journey', 'stunning', 'breathtaking', 'compelling', 'captivating', 'riveting'];
      const foundBannedWords = bannedWords.filter(word => allText.includes(word));
      
      if (foundBannedWords.length > 0) {
        console.log(`⚠️  Vocabulary issues: ${foundBannedWords.join(', ')}`);
      } else {
        console.log(`✅ Good vocabulary variation`);
      }
      
      // Check if matches expected
      if (whyWatch.recommendation === film.expected) {
        console.log(`✅ Matches expected recommendation`);
      } else {
        console.log(`❌ Expected ${film.expected}, got ${whyWatch.recommendation}`);
      }
      
      return {
        film: film.title,
        expected: film.expected,
        actual: whyWatch.recommendation,
        reasons: whyWatch.reasons,
        wordCounts: whyWatch.reasons.map(r => r.split(' ').length),
        duration: duration,
        vocabularyIssues: foundBannedWords,
        success: true
      };
    } else {
      console.log(`📝 Legacy format detected - analysis length: ${data.analysis.length} chars`);
      return {
        film: film.title,
        expected: film.expected,
        actual: 'LEGACY_FORMAT',
        duration: duration,
        success: true
      };
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      film: film.title,
      expected: film.expected,
      error: error.message,
      duration: Date.now() - startTime,
      success: false
    };
  }
}

async function runSampleTest() {
  console.log('🧪 Testing Enhanced WhyWatch Prompt on 5 Sample Films');
  console.log('=====================================================\n');
  console.log('This test checks if the enhanced prompt is being used in the API');
  console.log('and validates the new Yes/No/Maybe recommendation system.\n');
  
  const results = [];
  let totalDuration = 0;
  
  for (const film of TEST_FILMS) {
    const result = await testSingleFilm(film);
    results.push(result);
    
    if (result.duration) {
      totalDuration += result.duration;
    }
    
    // Brief pause between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 SAMPLE TEST RESULTS');
  console.log('=======================');
  
  const successful = results.filter(r => r.success);
  const newFormat = results.filter(r => r.actual && r.actual !== 'LEGACY_FORMAT');
  const correctPredictions = results.filter(r => r.actual === r.expected);
  
  console.log(`✅ Successful requests: ${successful.length}/${results.length}`);
  console.log(`🆕 New format detected: ${newFormat.length}/${successful.length}`);
  console.log(`🎯 Correct predictions: ${correctPredictions.length}/${newFormat.length}`);
  console.log(`⏱️  Total time: ${totalDuration}ms (avg: ${Math.round(totalDuration/results.length)}ms per film)`);
  
  if (newFormat.length > 0) {
    console.log('\n🎭 RECOMMENDATION BREAKDOWN:');
    const recommendations = newFormat.reduce((acc, r) => {
      acc[r.actual] = (acc[r.actual] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(recommendations).forEach(([rec, count]) => {
      console.log(`${rec}: ${count} films`);
    });
    
    console.log('\n📝 WORD COUNT ANALYSIS:');
    const allWordCounts = newFormat.flatMap(r => r.wordCounts || []);
    if (allWordCounts.length > 0) {
      const avgWords = allWordCounts.reduce((a, b) => a + b, 0) / allWordCounts.length;
      const minWords = Math.min(...allWordCounts);
      const maxWords = Math.max(...allWordCounts);
      console.log(`Average: ${avgWords.toFixed(1)} words (target: 5-8)`);
      console.log(`Range: ${minWords}-${maxWords} words`);
    }
    
    console.log('\n🗣️  VOCABULARY CHECK:');
    const vocabularyIssues = newFormat.filter(r => r.vocabularyIssues && r.vocabularyIssues.length > 0);
    if (vocabularyIssues.length === 0) {
      console.log('✅ No banned vocabulary detected');
    } else {
      vocabularyIssues.forEach(r => {
        console.log(`❌ ${r.film}: ${r.vocabularyIssues.join(', ')}`);
      });
    }
    
  } else {
    console.log('\n⚠️  NEW FORMAT NOT DETECTED');
    console.log('The API is still using the legacy prompt format.');
    console.log('The enhanced whyWatch prompt needs to be deployed to the API.');
  }
  
  return results;
}

// Run the test
runSampleTest().catch(console.error);