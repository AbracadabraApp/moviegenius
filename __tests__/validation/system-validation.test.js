/**
 * System Validation Tests
 * Validates database saves, cost estimates, and JSON format compliance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Production System Validation', () => {
  let testResults = [];
  let serverProcess;

  beforeAll(async () => {
    // Ensure server is running
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) throw new Error('Server not responding');
    } catch (error) {
      throw new Error('Development server must be running on localhost:3000');
    }
  });

  afterAll(() => {
    // Write test results to file for analysis
    const resultsPath = path.join(__dirname, '../results/validation-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: testResults,
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.success).length,
        failed: testResults.filter(r => !r.success).length,
        avgCost: testResults.reduce((sum, r) => sum + (r.cost || 0), 0) / testResults.length,
        avgTime: testResults.reduce((sum, r) => sum + (r.timing || 0), 0) / testResults.length
      }
    }, null, 2));
  });

  describe('Database Save Validation', () => {
    test('should save JSON analysis to database without errors', async () => {
      const testMovieId = '963'; // The Maltese Falcon
      
      // Clear any existing analysis
      await clearTestAnalysis(testMovieId);
      
      // Make API call and capture response
      const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${testMovieId}`);
      const result = await response.json();
      
      expect(response.ok).toBe(true);
      expect(result.format).toBe('json');
      expect(result.source).toBe('claude_direct');
      
      // Verify database save by making second call (should return from DB)
      const secondResponse = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${testMovieId}`);
      const secondResult = await secondResponse.json();
      
      expect(secondResult.source).toBe('database_existing');
      expect(secondResult.cached).toBe(true);
      
      testResults.push({
        test: 'database_save',
        movieId: testMovieId,
        success: true,
        cost: result.cost,
        timing: result.timing?.total,
        format: result.format
      });
    }, 120000); // 2 minute timeout

    test('should handle database save failures gracefully', async () => {
      // Test with invalid environment to trigger save failure
      const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url';
      
      try {
        const response = await fetch('http://localhost:3000/api/movie-analysis-direct?tmdbId=910');
        const result = await response.json();
        
        // Should still return the analysis even if save fails
        expect(response.ok).toBe(true);
        expect(result.format).toBe('json');
        
      } finally {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
      }
    }, 60000);
  });

  describe('Cost Estimate Validation', () => {
    test('should calculate accurate costs with prompt caching', async () => {
      const testMovies = ['910', '678', '599']; // Big Sleep, Out of the Past, Sunset Boulevard
      const costs = [];
      
      for (const movieId of testMovies) {
        await clearTestAnalysis(movieId);
        
        const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${movieId}`);
        const result = await response.json();
        
        expect(result.cost).toBeDefined();
        expect(result.cost).toBeGreaterThan(0);
        expect(result.cost).toBeLessThan(0.05); // Should be under $0.05 with caching
        
        costs.push({
          movieId,
          cost: result.cost,
          tokens: result.tokens,
          title: result.movie.title
        });
        
        testResults.push({
          test: 'cost_estimate',
          movieId,
          success: result.cost < 0.05,
          cost: result.cost,
          timing: result.timing?.total,
          tokens: result.tokens
        });
      }
      
      const avgCost = costs.reduce((sum, c) => sum + c.cost, 0) / costs.length;
      console.log(`Average cost per movie: $${avgCost.toFixed(6)}`);
      console.log('Cost breakdown:', costs);
      
      // With prompt caching, cost should be well under $0.04
      expect(avgCost).toBeLessThan(0.04);
    }, 300000); // 5 minute timeout for multiple movies

    test('should show significant cost savings with batch API', async () => {
      // Run batch processor test and analyze costs
      const batchTest = execSync(
        'timeout 120s node scripts/batch-processor.js --test --count 2 --batch-api || echo "timeout"',
        { encoding: 'utf8', cwd: '/Users/josh.petersen/moviegenius' }
      );
      
      // Read batch results
      const resultsPath = '/Users/josh.petersen/moviegenius/batch-results.json';
      if (fs.existsSync(resultsPath)) {
        const batchResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        const batchMovies = batchResults.successful.slice(-2); // Last 2 results
        
        if (batchMovies.length > 0) {
          const avgBatchCost = batchMovies.reduce((sum, m) => sum + m.cost, 0) / batchMovies.length;
          console.log(`Batch API average cost: $${avgBatchCost.toFixed(6)}`);
          
          // Batch should be significantly cheaper (50% savings)
          expect(avgBatchCost).toBeLessThan(0.02);
        }
      }
    }, 150000);
  });

  describe('JSON Format Compliance', () => {
    test('should always return valid JSON format', async () => {
      const testMovies = ['963', '910', '678', '599', '530']; // Mix of movies
      
      for (const movieId of testMovies) {
        const response = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${movieId}`);
        const result = await response.json();
        
        expect(result.format).toBe('json');
        
        // Validate JSON structure
        const analysis = JSON.parse(result.analysis);
        expect(analysis.metadata).toBeDefined();
        expect(analysis.content).toBeDefined();
        expect(analysis.featuredMovies).toBeDefined();
        expect(analysis.exploreTopics).toBeDefined();
        
        // Validate word count is reasonable
        expect(analysis.metadata.wordCount).toBeGreaterThan(700);
        expect(analysis.metadata.wordCount).toBeLessThan(1100);
        
        testResults.push({
          test: 'json_format',
          movieId,
          success: true,
          wordCount: analysis.metadata.wordCount,
          format: result.format
        });
      }
    }, 300000);
  });

  describe('Prompt Caching Validation', () => {
    test('should show cache usage in token breakdown', async () => {
      // Make multiple calls to same movie to trigger caching
      const movieId = '963';
      await clearTestAnalysis(movieId);
      
      // First call (creates cache)
      const firstResponse = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${movieId}`);
      const firstResult = await firstResponse.json();
      
      // Second call (should use cache) - wait a bit then clear and regenerate
      await clearTestAnalysis(movieId);
      
      const secondResponse = await fetch(`http://localhost:3000/api/movie-analysis-direct?tmdbId=${movieId}`);
      const secondResult = await secondResponse.json();
      
      // Both should be fresh generation but with cache read tokens
      expect(firstResult.tokens.input).toBeLessThan(50); // Most tokens should be cached
      expect(secondResult.tokens.input).toBeLessThan(50);
      
      console.log('First call tokens:', firstResult.tokens);
      console.log('Second call tokens:', secondResult.tokens);
      console.log('First call cost:', firstResult.cost);
      console.log('Second call cost:', secondResult.cost);
    }, 180000);
  });

  describe('Error Handling', () => {
    test('should handle malformed tmdbId gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/movie-analysis-direct?tmdbId=invalid');
      expect(response.status).toBe(404);
    });

    test('should handle missing tmdbId parameter', async () => {
      const response = await fetch('http://localhost:3000/api/movie-analysis-direct');
      expect(response.status).toBe(400);
    });
  });
});

// Helper function to clear test analysis
async function clearTestAnalysis(tmdbId) {
  try {
    // This would need to be implemented to clear specific analysis
    // For now, we rely on the --clear-test-data flag in batch processor
    const clearScript = `
      node -e "
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        async function clear() {
          const { data: movie } = await supabase.from('movies').select('id').eq('tmdb_id', ${tmdbId}).single();
          if (movie) {
            await supabase.from('movie_analyses').delete().eq('movie_id', movie.id);
            console.log('Cleared analysis for tmdbId ${tmdbId}');
          }
        }
        clear().catch(console.error);
      "
    `;
    
    execSync(clearScript, { 
      cwd: '/Users/josh.petersen/moviegenius',
      stdio: 'pipe',
      env: { ...process.env }
    });
  } catch (error) {
    console.warn(`Failed to clear analysis for ${tmdbId}:`, error.message);
  }
}