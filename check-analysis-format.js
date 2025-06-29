const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAnalysisFormat() {
  console.log('🔍 Checking current analysis format...\n');
  
  const { data: sampleAnalysis } = await supabase
    .from('movie_analyses')
    .select('claude_response')
    .eq('analysis_type', 'page_analysis')
    .limit(2);
    
  if (sampleAnalysis && sampleAnalysis.length > 0) {
    const response = sampleAnalysis[0].claude_response;
    
    console.log('📊 Sample entities:');
    if (response.entity_data && response.entity_data.entities) {
      console.log('   Entities count:', response.entity_data.entities.length);
      response.entity_data.entities.slice(0, 3).forEach((entity, i) => {
        console.log(`   Entity ${i+1}:`, Object.keys(entity));
      });
    }
    
    console.log('\n📝 Raw content sample (first 500 chars):');
    console.log('   ' + (response.raw_content?.substring(0, 500) || 'No raw content'));
  }
  
  // Let's check if there are any analyses with the nuclear format
  console.log('\n🔍 Searching for nuclear format analyses...');
  const { data: searchForCorrectFormat } = await supabase
    .from('movie_analyses')
    .select('claude_response, movie_id')
    .eq('analysis_type', 'page_analysis')
    .limit(100);
    
  let foundCorrectFormat = false;
  let correctFormatCount = 0;
  
  for (const analysis of searchForCorrectFormat || []) {
    const response = analysis.claude_response;
    
    // Check if it has the nuclear format directly
    if (response.sections || response.exploreFurther || response.moreIdeas) {
      foundCorrectFormat = true;
      correctFormatCount++;
      if (correctFormatCount === 1) {
        console.log('✅ Found nuclear format analysis!');
        console.log('   Keys:', Object.keys(response));
      }
    }
    
    // Check if raw_content contains nuclear format
    if (response.raw_content && typeof response.raw_content === 'string') {
      try {
        const parsed = JSON.parse(response.raw_content);
        if (parsed.sections || parsed.exploreFurther || parsed.moreIdeas) {
          foundCorrectFormat = true;
          correctFormatCount++;
          if (correctFormatCount === 1) {
            console.log('✅ Found nuclear format in raw_content!');
            console.log('   Parsed keys:', Object.keys(parsed));
          }
        }
      } catch (e) {
        // Not JSON, continue
      }
    }
  }
  
  console.log(`\n📈 ANALYSIS FORMAT SUMMARY:`);
  console.log(`   🔍 Checked: ${searchForCorrectFormat?.length || 0} analyses`);
  console.log(`   ✅ Nuclear format found: ${correctFormatCount}`);
  console.log(`   📊 Nuclear format percentage: ${correctFormatCount ? (correctFormatCount / (searchForCorrectFormat?.length || 1) * 100).toFixed(1) : 0}%`);
  
  if (!foundCorrectFormat) {
    console.log('\n❌ ISSUE: No nuclear format analyses found!');
    console.log('   📝 Current analyses appear to be in entity extraction format');
    console.log('   🚀 Nuclear pages need sections, exploreFurther, and moreIdeas');
    console.log('   💡 Solution: Need to run nuclear analysis generation');
  } else {
    console.log('\n✅ SUCCESS: Nuclear format analyses available!');
  }
}

checkAnalysisFormat().catch(console.error);