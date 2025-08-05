// Comprehensive search for link data in Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findLinkData() {
  try {
    console.log('🔍 Comprehensive search for ~6K link files...');
    
    // Method 1: Check all tables for any with ~6K records
    const commonTables = [
      'movies', 'movie_analyses', 'links', 'movie_links', 'linked_movies',
      'entity_links', 'analysis_links', 'film_connections', 'related_movies',
      'movie_entities', 'entities', 'connections', 'references', 'citations'
    ];
    
    console.log('Checking table record counts:');
    for (const tableName of commonTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error && count !== null) {
          console.log(`  ${tableName}: ${count} records${count > 5000 && count < 7000 ? ' ⭐ (6K range!)' : ''}`);
          
          // If we find a table with ~6K records, get sample
          if (count > 5000 && count < 7000) {
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
            
            if (sample && sample.length > 0) {
              console.log('    Sample record:');
              console.log('   ', JSON.stringify(sample[0], null, 2));
            }
          }
        }
      } catch (e) {
        // Table doesn't exist or no access
      }
    }
    
    // Method 2: Search for JSON fields that might contain links
    console.log('\n🔍 Checking for embedded link data in JSON fields...');
    
    // Check claude_response for link data
    const { data: analysesWithJson } = await supabase
      .from('movie_analyses')
      .select('id, claude_response')
      .not('claude_response', 'is', null)
      .limit(10);
    
    if (analysesWithJson && analysesWithJson.length > 0) {
      let foundLinks = false;
      analysesWithJson.forEach((analysis, i) => {
        const response = analysis.claude_response;
        if (response && typeof response === 'object') {
          const jsonStr = JSON.stringify(response).toLowerCase();
          if (jsonStr.includes('link') || jsonStr.includes('related') || jsonStr.includes('connection')) {
            if (!foundLinks) {
              console.log('Found potential link data in claude_response:');
              foundLinks = true;
            }
            console.log(`  Analysis ${analysis.id}: contains link-related data`);
            
            // Show structure
            Object.keys(response).forEach(key => {
              if (key.toLowerCase().includes('link') || key.toLowerCase().includes('related') || key.toLowerCase().includes('connection')) {
                console.log(`    Field: ${key}, Type: ${typeof response[key]}`);
              }
            });
          }
        }
      });
    }
    
    // Method 3: Check if it might be file attachments or external links
    console.log('\n🔍 Checking for file or attachment related tables...');
    const fileTables = ['files', 'attachments', 'assets', 'media', 'documents', 'uploads'];
    
    for (const tableName of fileTables) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (count && count > 0) {
          console.log(`  ${tableName}: ${count} records${count > 5000 && count < 7000 ? ' ⭐ (6K range!)' : ''}`);
        }
      } catch (e) {
        // Skip if table doesn't exist
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findLinkData();