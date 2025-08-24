#!/usr/bin/env node

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test movie data
const testMovie = {
  tmdbId: 278,
  title: "The Shawshank Redemption", 
  year: 1994,
  director: "Frank Darabont",
  fullAnalysisText: "Prison drama about hope and friendship through Andy and Red's relationship. Explores themes of institutional corruption, redemption, and the power of human connection...",
  themes: ["hope", "friendship", "institutional corruption"],
  technicalElements: ["cinematography", "score"],
  culturalContext: "1990s prison drama revival"
};

function buildTestPrompt(movie) {
  const systemPrompt = `You are a film analyst generating hyper-specific thematic list suggestions from one movie's analysis data. Analyze the full analysis text, themes, technical elements, and cultural context to suggest 20-50 niche list names (4-6 words each) that this movie could belong to.

CRITICAL: Respond ONLY with JSON. No explanatory text. No conversational responses.

Required JSON structure:
{
  "suggestedLists": [
    {
      "listName": "4-6 word theme name",
      "slug": "kebab-case-slug", 
      "description": "Brief description of the theme",
      "category": "theme-category",
      "connectionReason": "Specific reason why this movie fits this theme"
    }
  ]
}

Generate 20-50 diverse, specific themes. Focus on nuanced connections from the analysis text.`;

  const userPrompt = `<movie_data>
<title>${movie.title}</title>
<year>${movie.year}</year>
<director>${movie.director}</director>
<fullAnalysisText>${movie.fullAnalysisText}</fullAnalysisText>
<themes>${JSON.stringify(movie.themes)}</themes>
<technicalElements>${JSON.stringify(movie.technicalElements)}</technicalElements>
<culturalContext>${movie.culturalContext}</culturalContext>
</movie_data>

Generate thematic list suggestions for this movie:`;

  return { systemPrompt, userPrompt };
}

async function testPromptFix() {
  console.log('🧪 Testing prompt fix with system prompt + assistant prefill...');
  
  try {
    const { systemPrompt, userPrompt } = buildTestPrompt(testMovie);
    
    // Test with batch API format
    const batchRequest = {
      custom_id: 'test_movie_278',
      params: {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          },
          {
            role: 'assistant',
            content: '{'  // Prefill to force JSON
          }
        ]
      }
    };
    
    console.log('📤 Submitting single-movie batch test...');
    
    const batch = await anthropic.beta.messages.batches.create({
      requests: [batchRequest]
    });
    
    console.log(`📋 Batch ID: ${batch.id}`);
    console.log(`📊 Status: ${batch.processing_status}`);
    
    // Wait for completion
    let polls = 0;
    while (polls < 24) { // 2 minutes max
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const updatedBatch = await anthropic.beta.messages.batches.retrieve(batch.id);
      console.log(`📊 Status check ${polls + 1}: ${updatedBatch.processing_status}`);
      
      if (updatedBatch.processing_status === 'ended') {
        console.log('✅ Batch completed!');
        
        // Download results using direct API
        const response = await fetch(`https://api.anthropic.com/v1/messages/batches/${batch.id}/results`, {
          method: 'GET',
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          }
        });
        
        if (response.ok) {
          const results = await response.text();
          const lines = results.split('\n').filter(line => line.trim());
          
          if (lines.length > 0) {
            const result = JSON.parse(lines[0]);
            
            if (result.result?.type === 'succeeded') {
              const claudeText = result.result.message.content[0].text;
              console.log('\n📄 Response preview:', claudeText.substring(0, 200) + '...');
              
              // Try to parse as JSON - the key test!
              try {
                const parsedResponse = JSON.parse('{' + claudeText); // Add back the prefill character
                console.log('\n🎉 SUCCESS! JSON parsing works with new prompt!');
                console.log(`✅ Generated ${parsedResponse.suggestedLists?.length || 0} theme suggestions`);
                
                if (parsedResponse.suggestedLists?.[0]) {
                  console.log('📋 First theme:', parsedResponse.suggestedLists[0].listName);
                  console.log('🔗 Connection:', parsedResponse.suggestedLists[0].connectionReason);
                }
                
                return true;
              } catch (parseError) {
                console.error('\n❌ JSON parsing still failed:', parseError.message);
                console.log('Raw response:', '{' + claudeText);
                return false;
              }
            } else {
              console.error('❌ Batch failed:', result.result?.error);
              return false;
            }
          }
        }
        
        break;
      }
      
      polls++;
    }
    
    if (polls >= 24) {
      console.log('⏰ Batch timed out');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testPromptFix()
  .then(success => {
    if (success) {
      console.log('\n🎉 Prompt fix successful! Ready for full processing.');
      process.exit(0);
    } else {
      console.log('\n💥 Prompt fix needs more work.');
      process.exit(1);
    }
  });