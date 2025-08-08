// Test the API endpoint locally to verify environment variable loading
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🧪 Testing Railway API endpoint locally...\n');

// Start Next.js dev server programmatically
import { spawn } from 'child_process';

const server = spawn('npx', ['next', 'dev', '-p', '3001'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env }
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Next.js:', output.trim());
  
  if (output.includes('ready') || output.includes('started server')) {
    if (!serverReady) {
      serverReady = true;
      setTimeout(testAPI, 2000); // Wait 2 seconds for server to be fully ready
    }
  }
});

server.stderr.on('data', (data) => {
  console.error('Next.js Error:', data.toString());
});

async function testAPI() {
  try {
    console.log('\n🔍 Testing API endpoint...');
    
    const response = await fetch('http://localhost:3001/api/movie-analysis-railway?tmdbId=963');
    const data = await response.json();
    
    console.log('✅ API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.analysis) {
      console.log('\n🎉 SUCCESS: Railway API works locally!');
    } else {
      console.log('\n❌ FAILED: API returned but no analysis found');
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