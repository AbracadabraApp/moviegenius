// __tests__/fixtures/verifiedJsonAnalyses.js
/**
 * Test fixtures using REAL JSON analyses from C3 prompt
 * These are verified working JSON outputs from the production system
 */

// Import verified JSON analyses from the C3 test list
export const VERIFIED_MOVIE_IDS = [
  963,  // The Maltese Falcon (1941)
  996,  // Double Indemnity (1944) 
  910,  // The Big Sleep (1946)
  678,  // Out of the Past (1947)
  599,  // Sunset Boulevard (1950)
  539,  // Casablanca (1942)
  9552, // The Third Man (1949)
  530,  // The Treasure of the Sierra Madre (1948)
  // ... all 50 from PROMPT_C3_Test_LIST.txt
];

/**
 * Fetch real JSON analysis for testing
 * Uses actual API responses from verified C3 generations
 */
export const fetchRealJsonAnalysis = async (tmdbId) => {
  const response = await fetch(`http://localhost:3000/api/movie-analysis?tmdbId=${tmdbId}`);
  const data = await response.json();
  
  if (!data.analysis) {
    throw new Error(`No analysis found for movie ${tmdbId}`);
  }
  
  try {
    return JSON.parse(data.analysis);
  } catch (e) {
    throw new Error(`Invalid JSON analysis for movie ${tmdbId}: ${e.message}`);
  }
};

/**
 * Test data generator using real analyses
 */
export class RealAnalysisTestData {
  static async getFilmNoirSample() {
    return await fetchRealJsonAnalysis(963); // The Maltese Falcon
  }
  
  static async getClassicDramaSample() {
    return await fetchRealJsonAnalysis(539); // Casablanca
  }
  
  static async getMinimalContentSample() {
    // Find shortest analysis from our verified set
    const analyses = await Promise.all([
      fetchRealJsonAnalysis(963),
      fetchRealJsonAnalysis(910),
      fetchRealJsonAnalysis(678)
    ]);
    
    return analyses.reduce((min, current) => 
      current.metadata.wordCount < min.metadata.wordCount ? current : min
    );
  }
  
  static async getMaximalContentSample() {
    // Find longest analysis from our verified set
    const analyses = await Promise.all([
      fetchRealJsonAnalysis(996), // Double Indemnity
      fetchRealJsonAnalysis(599), // Sunset Boulevard
      fetchRealJsonAnalysis(530)  // Treasure of Sierra Madre
    ]);
    
    return analyses.reduce((max, current) => 
      current.metadata.wordCount > max.metadata.wordCount ? current : max
    );
  }
  
  static async getAllVerifiedAnalyses() {
    const analyses = [];
    
    for (const movieId of VERIFIED_MOVIE_IDS) {
      try {
        const analysis = await fetchRealJsonAnalysis(movieId);
        analyses.push({
          movieId,
          analysis,
          title: analysis.metadata.title,
          year: analysis.metadata.year,
          wordCount: analysis.metadata.wordCount
        });
      } catch (error) {
        console.warn(`Could not fetch analysis for movie ${movieId}:`, error.message);
      }
    }
    
    return analyses;
  }
}

// Pre-computed samples for faster testing (async-loaded in setup)
export let FILM_NOIR_SAMPLE = null;
export let CLASSIC_DRAMA_SAMPLE = null;
export let MINIMAL_CONTENT_SAMPLE = null;
export let MAXIMAL_CONTENT_SAMPLE = null;

// Jest setup helper
export const loadTestFixtures = async () => {
  if (!FILM_NOIR_SAMPLE) {
    FILM_NOIR_SAMPLE = await RealAnalysisTestData.getFilmNoirSample();
    CLASSIC_DRAMA_SAMPLE = await RealAnalysisTestData.getClassicDramaSample();
    MINIMAL_CONTENT_SAMPLE = await RealAnalysisTestData.getMinimalContentSample();
    MAXIMAL_CONTENT_SAMPLE = await RealAnalysisTestData.getMaximalContentSample();
  }
  
  return {
    FILM_NOIR_SAMPLE,
    CLASSIC_DRAMA_SAMPLE,
    MINIMAL_CONTENT_SAMPLE,
    MAXIMAL_CONTENT_SAMPLE
  };
};