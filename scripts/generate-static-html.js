#!/usr/bin/env node

/**
 * Static HTML Page Generator
 * 
 * Combines enhanced JSON data with HTML template to create complete static pages
 * Storage: /public/static-html/movie/{id}/index.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

/**
 * Configuration
 */
const CONFIG = {
  templatePath: path.join(PROJECT_ROOT, 'movie-page-static-template.html'),
  enhancedDataDir: path.join(PROJECT_ROOT, 'public', 'data', 'enhanced-movies'),
  outputDir: path.join(PROJECT_ROOT, 'public', 'static-html', 'movie'),
  verbose: true
};

// Parse command line args
const args = process.argv.slice(2);
const movieId = args.find(a => a.match(/^\d+$/)) || '603'; // Default to 603 for testing

/**
 * Load HTML template
 */
function loadTemplate() {
  if (!fs.existsSync(CONFIG.templatePath)) {
    throw new Error(`Template not found: ${CONFIG.templatePath}`);
  }
  
  return fs.readFileSync(CONFIG.templatePath, 'utf-8');
}

/**
 * Load enhanced movie data
 */
function loadEnhancedData(movieId) {
  const dataPath = path.join(CONFIG.enhancedDataDir, `movie-${movieId}.json`);
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Enhanced data not found: ${dataPath}`);
  }
  
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

/**
 * Inject data into HTML template
 */
function injectDataIntoTemplate(template, movieData) {
  let html = template;
  
  // Basic data substitutions
  html = html.replace(/{{MOVIE_TITLE}}/g, movieData.title || 'Unknown Movie');
  html = html.replace(/{{MOVIE_YEAR}}/g, movieData.year || '');
  html = html.replace(/{{TMDB_ID}}/g, movieData.tmdbId || '');
  
  // Analysis sections
  if (movieData.analysis?.sections) {
    const sectionsHtml = movieData.analysis.sections.map(section => `
      <div class="analysis-section">
        <h3 class="section-title">${section.type}</h3>
        <p class="section-text">${section.text}</p>
      </div>
    `).join('');
    
    html = html.replace(/{{ANALYSIS_SECTIONS}}/g, sectionsHtml);
  } else {
    html = html.replace(/{{ANALYSIS_SECTIONS}}/g, '<p>No analysis available</p>');
  }
  
  // Why Watch section
  if (movieData.analysis?.whyWatch?.recommendation === 'YES') {
    const reasonsHtml = movieData.analysis.whyWatch.reasons.map(reason => 
      `<li>${reason}</li>`
    ).join('');
    
    html = html.replace(/{{WHY_WATCH}}/g, `
      <div class="why-watch-section">
        <h3>Why Watch</h3>
        <ul>${reasonsHtml}</ul>
      </div>
    `);
  } else {
    html = html.replace(/{{WHY_WATCH}}/g, '');
  }
  
  // Browse Collections
  if (movieData.browseCollections?.lists?.length > 0) {
    const collectionsHtml = movieData.browseCollections.lists.map(collection => `
      <div class="browse-collection">
        <h4>${collection.name}</h4>
        <p>${collection.description}</p>
      </div>
    `).join('');
    
    html = html.replace(/{{BROWSE_COLLECTIONS}}/g, `
      <div class="browse-collections-section">
        <h3>Related Collections</h3>
        ${collectionsHtml}
      </div>
    `);
  } else {
    html = html.replace(/{{BROWSE_COLLECTIONS}}/g, '');
  }
  
  // Contributors
  if (movieData.contributors?.director) {
    const contributorsHtml = `
      <div class="contributors-section">
        <h3>Contributors</h3>
        <p><strong>Director:</strong> ${movieData.contributors.director.name}</p>
        <p><strong>Stars:</strong> ${movieData.contributors.stars?.map(s => s.name).join(', ')}</p>
      </div>
    `;
    html = html.replace(/{{CONTRIBUTORS}}/g, contributorsHtml);
  } else {
    html = html.replace(/{{CONTRIBUTORS}}/g, '');
  }
  
  return html;
}

/**
 * Generate static HTML for a single movie
 */
async function generateStaticPage(movieId) {
  console.log(`🎬 Generating static HTML for movie ${movieId}`);
  
  try {
    // Load template and data
    const template = loadTemplate();
    const movieData = loadEnhancedData(movieId);
    
    console.log(`✅ Loaded data for: ${movieData.title} (${movieData.year})`);
    
    // Inject data into template
    const html = injectDataIntoTemplate(template, movieData);
    
    // Ensure output directory exists
    const outputPath = path.join(CONFIG.outputDir, movieId);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Write HTML file
    const htmlFilePath = path.join(outputPath, 'index.html');
    fs.writeFileSync(htmlFilePath, html);
    
    console.log(`✅ Generated: ${htmlFilePath}`);
    console.log(`🌐 Access at: /static-html/movie/${movieId}/`);
    
    return {
      success: true,
      file: htmlFilePath,
      url: `/static-html/movie/${movieId}/`
    };
    
  } catch (error) {
    console.error(`❌ Error generating static page for movie ${movieId}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Static HTML Page Generator');
  console.log('=============================');
  console.log(`Movie ID: ${movieId}`);
  console.log(`Template: ${CONFIG.templatePath}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  
  const result = await generateStaticPage(movieId);
  
  if (result.success) {
    console.log('\\n🎉 Static page generated successfully!');
    console.log(`📁 File: ${result.file}`);
    console.log(`🔗 URL: ${result.url}`);
  } else {
    console.error('\\n❌ Generation failed:', result.error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateStaticPage };