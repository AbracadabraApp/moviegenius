#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function reprocessBatchResults() {
  const batchId = 'msgbatch_01R6VAfDopirKZXE832DzeYp';
  
  console.log('📥 Downloading and reprocessing batch results with fixed parsing...');
  
  try {
    // Download results
    const response = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}/results`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download results: ${response.status}`);
    }
    
    const resultsText = await response.text();
    const lines = resultsText.split('\n').filter(line => line.trim());
    
    console.log(`📋 Processing ${lines.length} results...`);
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    const allThemes = [];
    
    for (const line of lines) {
      try {
        const result = JSON.parse(line);
        
        if (result.result && result.result.type === 'succeeded') {
          // Parse Claude's response - add back the prefill opening brace
          const claudeText = result.result.message.content[0].text;
          const fullJsonText = '{' + claudeText; // Add back the assistant prefill
          const parsedResponse = JSON.parse(fullJsonText);
          
          // Extract movie info from custom_id
          const [, , tmdbId, ] = result.custom_id.split('_');
          
          // Store each suggested theme
          if (parsedResponse.suggestedLists && Array.isArray(parsedResponse.suggestedLists)) {
            for (const theme of parsedResponse.suggestedLists) {
              allThemes.push({
                tmdbId: parseInt(tmdbId),
                listName: theme.listName,
                slug: theme.slug,
                description: theme.description,
                category: theme.category,
                connectionReason: theme.connectionReason
              });
            }
          }
          
          results.push({
            custom_id: result.custom_id,
            tmdbId: parseInt(tmdbId),
            success: true,
            data: parsedResponse,
            error: null
          });
          
          successCount++;
        } else {
          // Handle error result
          results.push({
            custom_id: result.custom_id,
            success: false,
            data: null,
            error: result.result?.error?.message || 'Unknown error'
          });
          failCount++;
        }
      } catch (parseError) {
        console.warn(`⚠️ Failed to parse result for ${result.custom_id}: ${parseError.message}`);
        failCount++;
      }
    }
    
    console.log(`✅ Processed ${results.length} results`);
    console.log(`📊 Success: ${successCount}, Failed: ${failCount}`);
    console.log(`📊 Success rate: ${Math.round(successCount / results.length * 100)}%`);
    console.log(`🎯 Total theme suggestions: ${allThemes.length}`);
    
    // Save results
    const outputDir = './generated-lists-batch';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save individual results
    fs.writeFileSync(path.join(outputDir, 'processed-results.json'), JSON.stringify(results, null, 2));
    
    // Save all themes for aggregation
    fs.writeFileSync(path.join(outputDir, 'all-themes.json'), JSON.stringify(allThemes, null, 2));
    
    // Sample themes
    console.log('\n🎬 Sample theme suggestions:');
    for (let i = 0; i < Math.min(5, allThemes.length); i++) {
      console.log(`${i + 1}. "${allThemes[i].listName}" - ${allThemes[i].connectionReason}`);
    }
    
    console.log(`\n💾 Saved results to: ${outputDir}/`);
    console.log(`📁 processed-results.json: Individual movie results`);
    console.log(`📁 all-themes.json: All theme suggestions for aggregation`);
    
    return { successCount, failCount, totalThemes: allThemes.length };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

reprocessBatchResults()
  .then(result => {
    console.log('\n🎉 Batch reprocessing successful!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Batch reprocessing failed');
    process.exit(1);
  });