// Check accuracy of movie links in analyses
import { createClient } from '@supabase/supabase-js';
import { essentialMovies, getAllEssentialMovies } from './data/essential-movies.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLinkingAccuracy() {
  try {
    console.log('🔍 Checking movie linking accuracy for essential movies...');
    
    const allEssential = getAllEssentialMovies();
    console.log(`Found ${allEssential.length} essential movies across ${Object.keys(essentialMovies).length} themes\n`);
    
    // Create lookup maps
    const titleToMovie = {};
    const tmdbToMovie = {};
    
    allEssential.forEach(movie => {
      titleToMovie[movie.title.toLowerCase()] = movie;
      tmdbToMovie[movie.tmdb_id] = movie;
    });
    
    console.log('🔗 Analyzing movie links in analyses...');
    
    // Get analyses that contain movie links
    const { data: analyses } = await supabase
      .from('movie_analyses')
      .select('id, claude_response')
      .not('claude_response', 'is', null)
      .limit(50); // Check first 50 analyses
    
    let totalLinks = 0;
    let correctLinks = 0;
    let incorrectLinks = 0;
    const linkingIssues = [];
    
    if (analyses) {
      for (const analysis of analyses) {
        const content = analysis.claude_response?.raw_content || '';
        
        // Find all movie links in the content
        const linkPattern = /<a href="\/movie\/(\d+)"[^>]*data-tmdb-id="(\d+)"[^>]*>([^<]+)<\/a>/g;
        let match;
        
        while ((match = linkPattern.exec(content)) !== null) {
          totalLinks++;
          const [fullMatch, urlTmdbId, dataTmdbId, linkText] = match;
          
          // Check if TMDB IDs match between URL and data attribute
          if (urlTmdbId !== dataTmdbId) {
            incorrectLinks++;
            linkingIssues.push({
              analysisId: analysis.id,
              issue: 'URL_DATA_MISMATCH',
              linkText,
              urlTmdbId: parseInt(urlTmdbId),
              dataTmdbId: parseInt(dataTmdbId),
              fullMatch
            });
            continue;
          }
          
          const tmdbId = parseInt(dataTmdbId);
          const actualMovie = tmdbToMovie[tmdbId];
          
          // Check if the link text matches the actual movie title
          if (actualMovie) {
            const linkTextLower = linkText.toLowerCase().trim();
            const actualTitleLower = actualMovie.title.toLowerCase().trim();
            
            if (linkTextLower === actualTitleLower) {
              correctLinks++;
            } else {
              // Check for common variations
              const isClose = linkTextLower.includes(actualTitleLower) || 
                            actualTitleLower.includes(linkTextLower) ||
                            linkTextLower.replace(/[^\w\s]/g, '') === actualTitleLower.replace(/[^\w\s]/g, '');
              
              if (isClose) {
                correctLinks++;
              } else {
                incorrectLinks++;
                linkingIssues.push({
                  analysisId: analysis.id,
                  issue: 'TITLE_MISMATCH',
                  linkText,
                  expectedTitle: actualMovie.title,
                  tmdbId,
                  fullMatch
                });
              }
            }
          } else {
            // TMDB ID doesn't exist in our essential movies (might be correct for non-essential movies)
            correctLinks++; // Assume correct for now
          }
        }
      }
    }
    
    // Report results
    console.log('📊 Linking Accuracy Report:');
    console.log(`  Total links analyzed: ${totalLinks}`);
    console.log(`  Correct links: ${correctLinks} (${totalLinks > 0 ? ((correctLinks/totalLinks)*100).toFixed(1) : 0}%)`);
    console.log(`  Incorrect links: ${incorrectLinks} (${totalLinks > 0 ? ((incorrectLinks/totalLinks)*100).toFixed(1) : 0}%)`);
    
    if (linkingIssues.length > 0) {
      console.log('\n⚠️  Linking Issues Found:');
      linkingIssues.slice(0, 10).forEach((issue, i) => {
        console.log(`\n${i + 1}. ${issue.issue} (Analysis: ${issue.analysisId})`);
        if (issue.issue === 'URL_DATA_MISMATCH') {
          console.log(`   URL TMDB ID: ${issue.urlTmdbId}, Data TMDB ID: ${issue.dataTmdbId}`);
          console.log(`   Link text: "${issue.linkText}"`);
        } else if (issue.issue === 'TITLE_MISMATCH') {
          console.log(`   Link text: "${issue.linkText}"`);
          console.log(`   Expected: "${issue.expectedTitle}"`);
          console.log(`   TMDB ID: ${issue.tmdbId}`);
        }
        console.log(`   Full link: ${issue.fullMatch}`);
      });
      
      if (linkingIssues.length > 10) {
        console.log(`\n... and ${linkingIssues.length - 10} more issues`);
      }
    } else {
      console.log('\n✅ No linking issues found in the analyzed sample!');
    }
    
    // Check specific essential movies for linking
    console.log('\n🎯 Checking specific essential movie mentions...');
    
    let essentialMentions = 0;
    const essentialIssues = [];
    
    for (const analysis of analyses.slice(0, 20)) {
      const content = analysis.claude_response?.raw_content || '';
      
      // Look for mentions of essential movies
      allEssential.forEach(movie => {
        const titlePattern = new RegExp(movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (titlePattern.test(content)) {
          essentialMentions++;
          
          // Check if it's properly linked
          const linkPattern = new RegExp(`<a[^>]*data-tmdb-id="${movie.tmdb_id}"[^>]*>${movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</a>`, 'i');
          if (!linkPattern.test(content)) {
            essentialIssues.push({
              analysisId: analysis.id,
              movie: movie.title,
              tmdbId: movie.tmdb_id,
              issue: 'MENTIONED_BUT_NOT_LINKED'
            });
          }
        }
      });
    }
    
    console.log(`Essential movie mentions found: ${essentialMentions}`);
    if (essentialIssues.length > 0) {
      console.log(`Mentions without proper links: ${essentialIssues.length}`);
      essentialIssues.slice(0, 5).forEach(issue => {
        console.log(`  - "${issue.movie}" (TMDB: ${issue.tmdbId}) in analysis ${issue.analysisId}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLinkingAccuracy();