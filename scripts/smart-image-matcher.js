#!/usr/bin/env node

/**
 * Smart Hero Image Matcher
 * 
 * This script uses intelligent matching to connect orphaned images with episodes
 * by analyzing filenames, episode titles, and content patterns.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  episodesDir: path.join(__dirname, '../data/episodes'),
  heroImagesDir: path.join(__dirname, '../public/images/hero'),
};

// Smart matching patterns
const MATCH_PATTERNS = {
  'german-expressionism': ['german', 'expressionism', 'caligari'],
  'from-novels-to-noir': ['novel', 'novels', 'noir'],
  'urban-anxiety': ['urban', 'anxiety', 'mitchum', 'city'],
  'femme-fatales': ['femme', 'fatale', 'dangerous', 'woman'],
  'moral-ambiguity': ['moral', 'ambiguity', 'gray', 'grey'],
  'noirs-legacy': ['noir', 'legacy', 'modern'],
  'giallo': ['giallo', 'italian', 'argento'],
  'cronenberg': ['cronenberg', 'body', 'horror'],
  'silent-comedy': ['silent', 'comedy', 'chaplin', 'keaton'],
  'screwball': ['screwball', 'battle', 'sexes'],
  'british-comedy': ['british', 'ealing', 'python'],
  'saturday-night-live': ['saturday', 'snl', 'live'],
  'judd-apatow': ['apatow', 'judd', 'new', 'comedy'],
};

async function findAllImages() {
  const images = [];
  
  const scanDir = async (dir) => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const webPath = fullPath.replace(CONFIG.heroImagesDir, '/images/hero');
          images.push({
            filename: entry.name,
            fullPath,
            webPath,
            basename: path.basename(entry.name, path.extname(entry.name)),
            keywords: extractKeywords(entry.name)
          });
        }
      }
    } catch (error) {
      // Skip if directory doesn't exist
    }
  };
  
  await scanDir(CONFIG.heroImagesDir);
  return images;
}

function extractKeywords(filename) {
  return filename
    .toLowerCase()
    .replace(/\.(jpg|jpeg|png|webp)$/i, '')
    .split(/[-_\s]+/)
    .filter(word => word.length > 2);
}

async function findAllEpisodes() {
  const episodes = [];
  const files = await fs.readdir(CONFIG.episodesDir);
  
  for (const file of files) {
    if (file.startsWith('genius-') && file.endsWith('.json')) {
      try {
        const content = await fs.readFile(path.join(CONFIG.episodesDir, file), 'utf-8');
        const episode = JSON.parse(content);
        
        episodes.push({
          filename: file,
          title: episode.episode?.title || 'Unknown',
          expectedPath: episode.heroImage,
          keywords: extractKeywords(episode.episode?.title || ''),
          slug: generateSlug(episode.episode?.title || ''),
          episode
        });
      } catch (error) {
        console.error(`Error reading ${file}:`, error.message);
      }
    }
  }
  
  return episodes;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function calculateMatchScore(image, episode) {
  let score = 0;
  
  // Direct filename match
  if (image.basename.includes(episode.slug)) score += 50;
  
  // Keyword overlap
  const commonKeywords = image.keywords.filter(k => episode.keywords.includes(k));
  score += commonKeywords.length * 10;
  
  // Pattern matching
  for (const [pattern, keywords] of Object.entries(MATCH_PATTERNS)) {
    if (episode.slug.includes(pattern)) {
      const patternMatches = keywords.filter(k => 
        image.keywords.includes(k) || image.basename.includes(k)
      );
      score += patternMatches.length * 20;
    }
  }
  
  // Special cases
  if (episode.title.includes('German Expressionism') && image.basename.includes('german')) score += 30;
  if (episode.title.includes('Femme Fatales') && image.basename.includes('femme')) score += 30;
  if (episode.title.includes('Cronenberg') && image.basename.includes('cronenberg')) score += 40;
  if (episode.title.includes('Comedy') && image.basename.includes('comedy')) score += 20;
  if (episode.title.includes('Noir') && image.basename.includes('noir')) score += 20;
  
  return score;
}

async function smartMatch() {
  console.log('🧠 Smart Hero Image Matcher');
  console.log('===========================\n');
  
  const images = await findAllImages();
  const episodes = await findAllEpisodes();
  
  console.log(`Found ${images.length} images and ${episodes.length} episodes\n`);
  
  const matches = [];
  const usedImages = new Set();
  
  // Sort episodes by those missing images first
  const missingImageEpisodes = episodes.filter(ep => {
    const expectedFilename = path.basename(ep.expectedPath || '');
    return !images.some(img => img.filename === expectedFilename);
  });
  
  console.log('🔍 Finding smart matches...\n');
  
  for (const episode of missingImageEpisodes) {
    const availableImages = images.filter(img => !usedImages.has(img.webPath));
    
    if (availableImages.length === 0) break;
    
    // Calculate match scores
    const scoredImages = availableImages.map(img => ({
      image: img,
      score: calculateMatchScore(img, episode)
    })).filter(item => item.score > 15); // Minimum confidence threshold
    
    // Sort by score
    scoredImages.sort((a, b) => b.score - a.score);
    
    if (scoredImages.length > 0) {
      const bestMatch = scoredImages[0];
      matches.push({
        episode,
        image: bestMatch.image,
        score: bestMatch.score,
        confidence: bestMatch.score > 40 ? 'High' : bestMatch.score > 25 ? 'Medium' : 'Low'
      });
      usedImages.add(bestMatch.image.webPath);
    }
  }
  
  // Display results
  console.log('🎯 SMART MATCHES FOUND');
  console.log('=====================\n');
  
  const highConfidence = matches.filter(m => m.confidence === 'High');
  const mediumConfidence = matches.filter(m => m.confidence === 'Medium');
  const lowConfidence = matches.filter(m => m.confidence === 'Low');
  
  console.log(`🟢 High Confidence (${highConfidence.length}):`);
  highConfidence.forEach(match => {
    console.log(`• ${match.episode.title}`);
    console.log(`  → ${match.image.webPath} (score: ${match.score})\n`);
  });
  
  console.log(`🟡 Medium Confidence (${mediumConfidence.length}):`);
  mediumConfidence.forEach(match => {
    console.log(`• ${match.episode.title}`);
    console.log(`  → ${match.image.webPath} (score: ${match.score})\n`);
  });
  
  console.log(`🟠 Low Confidence (${lowConfidence.length}):`);
  lowConfidence.forEach(match => {
    console.log(`• ${match.episode.title}`);
    console.log(`  → ${match.image.webPath} (score: ${match.score})\n`);
  });
  
  return matches;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  smartMatch();
}