// Test Musical category list generation - based on working direct-claude-test.js pattern
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs';

// Explicitly load .env.local
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

console.log('🎵 Testing Musical Category List Generation\n');

try {
  // Load Musical test data
  const testData = JSON.parse(fs.readFileSync('musical-test-data.json', 'utf8'));
  console.log(`Loaded ${testData.movieCount} Musical movies`);
  
  const prompt = `You are a film enthusiast with near encyclopedic knowledge of films. You are helping to create numerous thematic movie lists that will help users find films through unexpected connections and clear categorization. Below are ${testData.movieCount} Musical films with their titles and release years. Use your knowledge of film to build as many lists as possible that you can give meaningful 2-4 word titles. Lists must have at least 10 items and no more than 30. You must use every single film provided - each movie should appear in at least one list.

Output format:
{
  "lists": [
    {
      "name": "Broadway Stage Adaptations",
      "movieIds": ["id1", "id2", "id3"]
    }
  ]
}

Movie Data:
${testData.movieList}`;

  console.log('📤 Sending prompt to Claude...');
  const startTime = Date.now();
  
  const message = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 8000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const endTime = Date.now();
  const response = message.content[0].text;
  
  // Calculate costs
  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const inputCost = (inputTokens / 1000000) * 3;  // $3/1M tokens
  const outputCost = (outputTokens / 1000000) * 15; // $15/1M tokens
  const totalCost = inputCost + outputCost;
  
  console.log('\n💰 COST TRACKING:');
  console.log(`Input tokens: ${inputTokens}`);
  console.log(`Output tokens: ${outputTokens}`);
  console.log(`Input cost: $${inputCost.toFixed(6)}`);
  console.log(`Output cost: $${outputCost.toFixed(6)}`);
  console.log(`Total cost: $${totalCost.toFixed(6)}`);
  console.log(`Processing time: ${(endTime - startTime) / 1000}s`);
  
  // Try to parse JSON
  try {
    const parsed = JSON.parse(response);
    
    console.log('\n📊 RESULTS:');
    console.log(`✅ Valid JSON response`);
    console.log(`Generated ${parsed.lists?.length || 0} lists`);
    
    if (parsed.lists?.length > 0) {
      console.log('\n🎯 Sample lists:');
      parsed.lists.slice(0, 8).forEach(list => {
        console.log(`  - ${list.name} (${list.movieIds?.length || 0} movies)`);
      });
      
      // Validate requirements
      const listCounts = parsed.lists.map(list => list.movieIds?.length || 0);
      const validSizes = listCounts.filter(count => count >= 10 && count <= 30);
      
      console.log('\n📏 Validation:');
      console.log(`Total lists: ${parsed.lists.length} (target: 20-30)`);
      console.log(`Valid sizes (10-30): ${validSizes.length}/${listCounts.length}`);
      console.log(`Size range: ${Math.min(...listCounts)}-${Math.max(...listCounts)}`);
    }
    
    // Save results
    const results = {
      category: 'Musical',
      movieCount: testData.movieCount,
      listsGenerated: parsed.lists?.length || 0,
      lists: parsed.lists,
      cost: {
        inputTokens,
        outputTokens,
        inputCost: parseFloat(inputCost.toFixed(6)),
        outputCost: parseFloat(outputCost.toFixed(6)),
        totalCost: parseFloat(totalCost.toFixed(6)),
        processingTimeMs: endTime - startTime
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('musical-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to musical-test-results.json');
    
  } catch (parseError) {
    console.log('\n❌ JSON parsing failed:');
    console.log(parseError.message);
    console.log('\nRaw response (first 1000 chars):');
    console.log(response.substring(0, 1000));
    
    // Save raw response for debugging
    fs.writeFileSync('musical-test-raw-response.txt', response);
    console.log('Raw response saved to musical-test-raw-response.txt');
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}