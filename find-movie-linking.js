// Search for movie linking/cross-reference data
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findMovieLinking() {
  try {
    console.log('🔍 Searching for movie linking/cross-reference data...');
    
    // Check tables that might contain movie cross-references
    const linkingTables = [
      'movie_references', 'analysis_movies', 'mentioned_movies', 
      'movie_mentions', 'cross_references', 'internal_links',
      'analysis_references', 'linked_analyses', 'movie_cross_refs',
      'entity_links', 'movie_entities', 'analysis_entities'
    ];
    
    console.log('Checking linking tables:');
    for (const tableName of linkingTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          // Table doesn't exist, skip
          continue;
        }
        
        if (count > 0) {
          console.log(`✅ ${tableName}: ${count} records${count > 5000 && count < 8000 ? ' ⭐ LIKELY THE 6K!' : ''}`);
          
          if (count > 100) {
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              console.log('    Sample:');
              console.log(JSON.stringify(sample[0], null, 2));
            }
          }
        }
      } catch (e) {
        // Skip tables that don't exist
      }
    }
    
    // Check for processed vs unprocessed analyses
    console.log('\n🔍 Checking analysis linking status...');
    
    const { count: totalAnalyses } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true });
      
    console.log(`Total analyses: ${totalAnalyses}`);
    
    // Look for analyses with processed links
    const { data: sampleAnalyses } = await supabase
      .from('movie_analyses')
      .select('id, claude_response, has_links, link_count, linked_at')
      .not('claude_response', 'is', null)
      .limit(10);
    
    let foundProcessedLinks = false;
    if (sampleAnalyses) {
      sampleAnalyses.forEach(analysis => {
        const response = analysis.claude_response;
        if (response && response.raw_content) {
          const text = response.raw_content;
          // Check for different link formats
          const hasHtmlLinks = text.includes('<a href');
          const hasMarkdownLinks = text.includes('](');
          const hasMovieTokens = text.includes('**') && text.includes('**');
          
          if (hasHtmlLinks || hasMarkdownLinks || hasMovieTokens) {
            if (!foundProcessedLinks) {
              console.log('Found analyses with potential processed links:');
              foundProcessedLinks = true;
            }
            console.log(`  ${analysis.id}: has_links=${analysis.has_links}, link_count=${analysis.link_count}`);
            
            // Show a snippet
            if (hasHtmlLinks) {
              const linkMatch = text.match(/<a href[^>]*>([^<]+)<\/a>/);
              if (linkMatch) {
                console.log(`    HTML link sample: ${linkMatch[0]}`);
              }
            }
          }
        }
      });
    }
    
    if (!foundProcessedLinks) {
      console.log('No processed links found in sample analyses');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findMovieLinking();