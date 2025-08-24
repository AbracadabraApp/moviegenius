#!/usr/bin/env node

/**
 * Check Ted Lasso specifically for links
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

function getRailwayClient() {
  const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL or RAILWAY_DATABASE_URL must be set');
  }
  return new Client({ connectionString: dbUrl });
}

async function checkTedLasso() {
  const client = getRailwayClient();
  
  try {
    await client.connect();
    
    // Find Ted Lasso analysis
    const result = await client.query(`
      SELECT ma.claude_response, ma.updated_at, m.title, m.year
      FROM movie_analyses ma
      JOIN movies m ON m.id = ma.movie_id
      WHERE m.title ILIKE '%Ted Lasso%'
      ORDER BY ma.updated_at DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Ted Lasso analysis not found');
      return;
    }
    
    const analysis = result.rows[0];
    console.log(`🎬 ${analysis.title} (${analysis.year})`);
    console.log(`📅 Last updated: ${analysis.updated_at}`);
    
    // Check processed_content
    if (analysis.claude_response && analysis.claude_response.processed_content) {
      const processedContent = analysis.claude_response.processed_content;
      
      if (typeof processedContent === 'string') {
        try {
          const parsed = JSON.parse(processedContent);
          console.log('✅ Found processed_content JSON');
          
          let movieLinks = 0;
          let personLinks = 0;
          
          // Count all links
          if (parsed.content) {
            parsed.content.forEach(section => {
              if (section.text) {
                movieLinks += (section.text.match(/<a[^>]*href=[\\"]*\/movie\/\d+[\\"]*[^>]*>/g) || []).length;
                personLinks += (section.text.match(/<a[^>]*href=[\\"]*\/person\/[^\\">]*[\\"]*[^>]*>/g) || []).length;
              }
            });
          }
          
          console.log(`🔗 STORED LINKS: ${movieLinks} movies, ${personLinks} people`);
          
          if (movieLinks > 0 || personLinks > 0) {
            console.log('🎉 SUCCESS: Links are stored in database!');
            
            // Show a sample link
            for (const section of parsed.content || []) {
              if (section.text && section.text.includes('<a href')) {
                const match = section.text.match(/<a[^>]*href=[\\"]*([^\\">]*)[\\"]*[^>]*>([^<]*)<\/a>/);
                if (match) {
                  console.log(`📎 Sample link: "${match[2]}" → ${match[1]}`);
                  break;
                }
              }
            }
          } else {
            console.log('⚠️ No links found in stored content');
          }
          
        } catch (e) {
          console.log('❌ Failed to parse processed_content:', e.message);
        }
      } else {
        console.log('📋 processed_content is not a string');
      }
    } else {
      console.log('❌ No processed_content found');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await client.end();
  }
}

checkTedLasso().catch(console.error);