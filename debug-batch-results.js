#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugBatchResults() {
  const batchId = 'msgbatch_01R6VAfDopirKZXE832DzeYp';
  
  try {
    console.log('🔍 Downloading first few batch results to debug parsing issue...');
    
    const response = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}/results`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    
    if (response.ok) {
      const results = await response.text();
      const lines = results.split('\n').filter(line => line.trim());
      
      console.log(`📋 Total result lines: ${lines.length}`);
      
      // Check first 3 results
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const result = JSON.parse(lines[i]);
        console.log(`\n--- Result ${i + 1} ---`);
        console.log('Custom ID:', result.custom_id);
        console.log('Result type:', result.result?.type);
        
        if (result.result?.type === 'succeeded') {
          const claudeText = result.result.message.content[0].text;
          console.log('Raw response length:', claudeText.length);
          console.log('First 100 chars:', JSON.stringify(claudeText.substring(0, 100)));
          console.log('Character at position 19:', JSON.stringify(claudeText.charAt(18))); // 0-indexed
          console.log('Characters 15-25:', JSON.stringify(claudeText.substring(14, 25)));
          
          // Try different parsing approaches
          console.log('\n🧪 Testing parsing approaches:');
          
          // 1. As-is
          try {
            JSON.parse(claudeText);
            console.log('✅ Direct parse works');
          } catch (e) {
            console.log('❌ Direct parse fails:', e.message);
          }
          
          // 2. Add back prefill
          try {
            const withPrefill = '{' + claudeText;
            JSON.parse(withPrefill);
            console.log('✅ With prefill works');
          } catch (e) {
            console.log('❌ With prefill fails:', e.message);
          }
          
          // 3. Trim whitespace
          try {
            JSON.parse(claudeText.trim());
            console.log('✅ Trimmed works');
          } catch (e) {
            console.log('❌ Trimmed fails:', e.message);
          }
          
          // 4. Check if it starts with "{"
          if (claudeText.startsWith('{')) {
            console.log('✅ Response starts with {');
          } else {
            console.log('❌ Response does NOT start with {, starts with:', JSON.stringify(claudeText.charAt(0)));
          }
        }
      }
    } else {
      console.error('Failed to download results:', response.status);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugBatchResults();