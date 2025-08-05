// Test Claude Analysis services 
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testClaudeServices() {
  console.log('🧪 Testing Claude Analysis services...\n');

  try {
    // Test 1: Check environment variables
    console.log('1. Environment Variables:');
    console.log(`   ANTHROPIC_API_KEY exists: ${!!process.env.ANTHROPIC_API_KEY}`);
    
    // Test 2: Try importing Anthropic SDK
    console.log('\n2. Anthropic SDK Import:');
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      console.log('   ✅ Successfully imported Anthropic SDK');
      
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('   ✅ Anthropic client created successfully');
      
    } catch (anthropicError) {
      console.log('   ❌ Failed to import Anthropic SDK:', anthropicError.message);
    }
    
    // Test 3: Try importing prompt builder
    console.log('\n3. Prompt Builder Import:');
    try {
      const { buildPrompt } = await import('./lib/prompts/builder.js');
      console.log('   ✅ Successfully imported buildPrompt');
      
      const promptConfig = buildPrompt(
        'MOVIE_ANALYSIS',
        'Include 3-5 Explore Further topics for deeper analysis'
      );
      console.log('   ✅ buildPrompt works');
      console.log(`   Model: ${promptConfig.model}`);
      console.log(`   Temperature: ${promptConfig.temperature}`);
      console.log(`   System prompt length: ${promptConfig.system[0].text.length} chars`);
      
    } catch (promptError) {
      console.log('   ❌ Failed to import prompt builder:', promptError.message);
    }
    
    console.log('\n🎯 Claude Analysis Generation should work if all tests passed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testClaudeServices();