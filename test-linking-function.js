#!/usr/bin/env node

/**
 * Test the processAnalysisContent function directly
 * to verify it produces HTML links as expected
 */

import { processAnalysisContent } from './lib/movie-analysis-linker.js';

async function testLinkingFunction() {
  console.log('🧪 Testing processAnalysisContent function...\n');
  
  // Sample content with movie references
  const testContent = `This film transcends its role as a music documentary to become a vital document of Cuban culture during a period of isolation. Like **Paris, Texas** (1984), another Wenders masterpiece, it explores themes of rediscovery and connection. The film parallels other great music documentaries like **The Last Waltz** (1978) in its ability to capture a pivotal musical moment.`;
  
  console.log('📝 Original content:');
  console.log(testContent);
  console.log('\n' + '='.repeat(80) + '\n');
  
  try {
    const processedContent = await processAnalysisContent(
      testContent,
      'Buena Vista Social Club', // Current movie (to avoid self-links)
      'Test linking function'
    );
    
    console.log('🔗 Processed content:');
    console.log(processedContent);
    
    // Check if links were created
    const hasHtmlLinks = processedContent.includes('<a href=');
    const linkCount = (processedContent.match(/<a href=/g) || []).length;
    
    console.log('\n📊 Results:');
    console.log(`   HTML links created: ${hasHtmlLinks ? '✅' : '❌'}`);
    console.log(`   Number of links: ${linkCount}`);
    
    if (hasHtmlLinks) {
      console.log('\n🎯 SUCCESS! The linking function works correctly.');
      console.log('The function produces HTML links as expected.');
      
      // Extract sample links
      const links = processedContent.match(/<a href="[^"]*"[^>]*>[^<]*<\/a>/g) || [];
      console.log('\n🔗 Sample links:');
      links.forEach(link => console.log(`   ${link}`));
    } else {
      console.log('\n❌ No HTML links were created.');
      console.log('This suggests either:');
      console.log('1. Database connection issues');
      console.log('2. Movies not found in database');
      console.log('3. Function configuration issues');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testLinkingFunction().catch(console.error);