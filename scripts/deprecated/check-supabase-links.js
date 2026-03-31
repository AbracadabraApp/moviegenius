// Check Supabase database for link files
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLinkFiles() {
  try {
    console.log('🔍 Checking for link files in Supabase...');
    
    // Check common table names for links
    const possibleTables = [
      'linked_movies', 
      'movie_links', 
      'links', 
      'movie_connections', 
      'film_links',
      'entity_links',
      'analysis_links'
    ];
    
    for (const tableName of possibleTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`✅ Found table '${tableName}' with ${count} records`);
          
          // Get sample data
          const { data: sample } = await supabase
            .from(tableName)
            .select('*')
            .limit(2);
            
          if (sample && sample.length > 0) {
            console.log('Sample data from', tableName + ':');
            console.log(JSON.stringify(sample[0], null, 2));
            console.log('---');
          }
        }
      } catch (e) {
        // Table doesn't exist, continue silently
      }
    }
    
    // Check if there are link-related columns in movie_analyses
    console.log('\n🔍 Checking movie_analyses table structure...');
    const { data: sampleAnalysis } = await supabase
      .from('movie_analyses')
      .select('*')
      .limit(1);
      
    if (sampleAnalysis && sampleAnalysis.length > 0) {
      console.log('movie_analyses columns:');
      Object.keys(sampleAnalysis[0]).forEach(key => {
        if (key.toLowerCase().includes('link')) {
          console.log(`  📎 ${key}: ${typeof sampleAnalysis[0][key]}`);
        }
      });
    }
    
    // Check for analyses with has_links = true
    console.log('\n🔍 Checking analyses with has_links flag...');
    const { count: hasLinksCount } = await supabase
      .from('movie_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('has_links', true);
      
    console.log(`Analyses with has_links=true: ${hasLinksCount}`);
    
    // Get sample of linked analyses
    if (hasLinksCount > 0) {
      const { data: linkedAnalyses } = await supabase
        .from('movie_analyses')
        .select('id, movie_id, has_links, link_count, linked_at')
        .eq('has_links', true)
        .limit(5);
        
      console.log('Sample linked analyses:');
      linkedAnalyses.forEach(analysis => {
        console.log(`  ID: ${analysis.id}, Links: ${analysis.link_count}, Linked: ${analysis.linked_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLinkFiles();