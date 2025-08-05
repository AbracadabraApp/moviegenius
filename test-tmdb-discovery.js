// Test TMDB Movie Discovery feature
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

async function testTMDBDiscovery() {
  console.log('🧪 Testing TMDB Movie Discovery feature...\n');

  // Test with a movie that's definitely not in our 8 migrated movies
  // Using Avatar (2009) - TMDB ID: 19995
  const testTmdbId = 19995;
  
  try {
    console.log(`🔍 Testing TMDB discovery for Avatar (TMDB ID: ${testTmdbId})`);
    console.log('This movie should NOT be in our Railway database yet...\n');
    
    // Start Next.js dev server programmatically for testing
    const { spawn } = require('child_process');
    
    console.log('🚀 Starting Next.js dev server for testing...');
    const server = spawn('npx', ['next', 'dev', '-p', '3002'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let serverReady = false;

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready') || output.includes('started server')) {
        if (!serverReady) {
          serverReady = true;
          setTimeout(testAPI, 3000); // Wait 3 seconds for server to be fully ready
        }
      }
    });

    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (!output.includes('warn') && !output.includes('info')) {
        console.error('Next.js Error:', output);
      }
    });

    async function testAPI() {
      try {
        console.log('\n🔍 Testing TMDB discovery API...');
        
        const response = await fetch(`http://localhost:3002/api/movie-analysis?tmdbId=${testTmdbId}`);
        const data = await response.json();
        
        console.log(`\n📤 API Response Status: ${response.status}`);
        console.log('📄 API Response Data:');
        console.log(JSON.stringify(data, null, 2));
        
        if (response.status === 200 && data.success && data.movie) {
          console.log('\n🎉 SUCCESS: TMDB Discovery worked!');
          console.log(`✅ Created movie: ${data.movie.title} (${data.movie.year || 'unknown year'})`);
          
          if (data.analysis) {
            console.log('✅ Analysis found for new movie');
          } else {
            console.log('ℹ️  Movie created but no analysis yet (expected)');
          }
        } else if (response.status === 404) {
          console.log('\n❌ FAILED: Movie not found in TMDB or creation failed');
          console.log('Error details:', data.details || data.error);
        } else {
          console.log('\n⚠️  UNEXPECTED: API returned different response');
        }
        
      } catch (error) {
        console.error('❌ API Test Error:', error.message);
      } finally {
        server.kill();
        process.exit(0);
      }
    }

    // Cleanup on exit
    process.on('SIGINT', () => {
      server.kill();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Test setup error:', error.message);
  }
}

testTMDBDiscovery();