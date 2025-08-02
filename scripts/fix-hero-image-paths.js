#!/usr/bin/env node

/**
 * Fix Hero Image Path Mismatches
 * 
 * This script fixes the discrepancy between:
 * 1. What episode JSON files expect for heroImage paths
 * 2. Where the actual image files are located in the filesystem
 * 
 * It will either:
 * - Move images to match JSON expectations, OR
 * - Update JSON files to match actual image locations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  episodesDir: path.join(__dirname, '../data/episodes'),
  heroImagesDir: path.join(__dirname, '../public/images/hero'),
  backupDir: path.join(__dirname, '../backups/episodes-pre-path-fix'),
};

async function findAllActualImages() {
  console.log('🔍 Scanning for actual hero images...\n');
  
  const findImages = async (dir) => {
    const images = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subImages = await findImages(fullPath);
          images.push(...subImages);
        } else if (entry.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          // Convert to web path
          const webPath = fullPath.replace(CONFIG.heroImagesDir, '/images/hero');
          images.push({
            filename: entry.name,
            fullPath,
            webPath,
            basename: path.basename(entry.name, path.extname(entry.name))
          });
        }
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
    
    return images;
  };
  
  return await findImages(CONFIG.heroImagesDir);
}

async function findAllEpisodeExpectations() {
  console.log('📚 Analyzing episode JSON expectations...\n');
  
  const episodes = [];
  const files = await fs.readdir(CONFIG.episodesDir);
  
  for (const file of files) {
    if (file.startsWith('genius-') && file.endsWith('.json')) {
      try {
        const content = await fs.readFile(path.join(CONFIG.episodesDir, file), 'utf-8');
        const episode = JSON.parse(content);
        
        if (episode.heroImage && episode.heroImage.includes('.jpg')) {
          episodes.push({
            filename: file,
            title: episode.episode?.title || 'Unknown',
            expectedPath: episode.heroImage,
            episode
          });
        }
      } catch (error) {
        console.error(`❌ Error reading ${file}:`, error.message);
      }
    }
  }
  
  return episodes;
}

async function matchImagesWithEpisodes(actualImages, episodeExpectations) {
  console.log('🔗 Matching images with episodes...\n');
  
  const matches = [];
  const orphanedImages = [];
  const missingImages = [];
  
  for (const episode of episodeExpectations) {
    const expectedFilename = path.basename(episode.expectedPath);
    const expectedBasename = path.basename(expectedFilename, path.extname(expectedFilename));
    
    // Try to find matching image
    let foundImage = null;
    
    // First try exact filename match
    foundImage = actualImages.find(img => img.filename === expectedFilename);
    
    // Then try basename match (handles different extensions)
    if (!foundImage) {
      foundImage = actualImages.find(img => img.basename === expectedBasename);
    }
    
    // Then try partial matches for common patterns
    if (!foundImage) {
      const searchTerms = [
        expectedBasename,
        expectedBasename.replace(/^\d+-/, ''), // Remove leading numbers
        expectedBasename.split('-')[0], // First word
      ];
      
      for (const term of searchTerms) {
        if (term.length > 3) {
          foundImage = actualImages.find(img => 
            img.basename.includes(term) || img.filename.includes(term)
          );
          if (foundImage) break;
        }
      }
    }
    
    if (foundImage) {
      matches.push({
        episode,
        image: foundImage,
        needsUpdate: episode.expectedPath !== foundImage.webPath
      });
    } else {
      missingImages.push(episode);
    }
  }
  
  // Find orphaned images
  const usedImages = new Set(matches.map(m => m.image.webPath));
  orphanedImages.push(...actualImages.filter(img => !usedImages.has(img.webPath)));
  
  return { matches, orphanedImages, missingImages };
}

async function updateEpisodeJSONs(matches) {
  console.log('💾 Updating episode JSON files...\n');
  
  // Create backup directory
  await fs.mkdir(CONFIG.backupDir, { recursive: true });
  
  let updatedCount = 0;
  
  for (const match of matches) {
    if (match.needsUpdate) {
      const { episode, image } = match;
      const episodeFile = path.join(CONFIG.episodesDir, episode.filename);
      
      // Create backup
      const backupFile = path.join(CONFIG.backupDir, episode.filename);
      await fs.copyFile(episodeFile, backupFile);
      
      // Update the episode JSON
      episode.episode.heroImage = image.webPath;
      
      await fs.writeFile(
        episodeFile, 
        JSON.stringify(episode.episode, null, 2), 
        'utf-8'
      );
      
      console.log(`✅ Updated ${episode.title}`);
      console.log(`   From: ${episode.expectedPath}`);
      console.log(`   To:   ${image.webPath}\n`);
      
      updatedCount++;
    }
  }
  
  return updatedCount;
}

async function generateReport(matches, orphanedImages, missingImages) {
  console.log('\n📊 HERO IMAGE PATH ANALYSIS REPORT');
  console.log('=====================================\n');
  
  console.log(`✅ Matched Episodes: ${matches.length}`);
  console.log(`🔧 Need Updates: ${matches.filter(m => m.needsUpdate).length}`);
  console.log(`❌ Missing Images: ${missingImages.length}`);
  console.log(`🏷️  Orphaned Images: ${orphanedImages.length}\n`);
  
  if (missingImages.length > 0) {
    console.log('❌ EPISODES MISSING IMAGES:');
    console.log('===========================');
    missingImages.forEach(ep => {
      console.log(`• ${ep.title}`);
      console.log(`  Expected: ${ep.expectedPath}\n`);
    });
  }
  
  if (orphanedImages.length > 0) {
    console.log('🏷️  ORPHANED IMAGES (not linked to episodes):');
    console.log('===========================================');
    orphanedImages.forEach(img => {
      console.log(`• ${img.webPath}`);
    });
  }
}

async function main() {
  console.log('🎬 Hero Image Path Fixer');
  console.log('========================\n');
  
  try {
    // Step 1: Find all actual images
    const actualImages = await findAllActualImages();
    console.log(`Found ${actualImages.length} actual image files\n`);
    
    // Step 2: Find all episode expectations
    const episodeExpectations = await findAllEpisodeExpectations();
    console.log(`Found ${episodeExpectations.length} episodes expecting images\n`);
    
    // Step 3: Match them up
    const { matches, orphanedImages, missingImages } = await matchImagesWithEpisodes(
      actualImages, 
      episodeExpectations
    );
    
    // Step 4: Generate report
    await generateReport(matches, orphanedImages, missingImages);
    
    // Step 5: Ask user if they want to fix the paths
    console.log('\n🔧 Would you like to update the episode JSON files to match actual image locations?');
    console.log('This will create backups of the original files.');
    
    // For now, just show what would be updated
    const needsUpdate = matches.filter(m => m.needsUpdate);
    if (needsUpdate.length > 0) {
      console.log(`\n📝 Would update ${needsUpdate.length} episodes:`);
      needsUpdate.forEach(match => {
        console.log(`• ${match.episode.title}: ${match.image.webPath}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}