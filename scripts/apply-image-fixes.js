#!/usr/bin/env node

/**
 * Apply Hero Image Fixes
 * 
 * Updates episode JSON files with correct hero image paths
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  episodesDir: path.join(__dirname, '../data/episodes'),
  backupDir: path.join(__dirname, '../backups/episodes-pre-image-fix'),
};

// High-confidence matches from our analysis
const FIXES = [
  {
    title: 'German Expressionism',
    file: 'genius-1-1-1.json',
    newPath: '/images/hero/film-noir/1-german-expressionism.jpg'
  },
  {
    title: 'From Novels to Noir', 
    file: 'genius-1-1-2.json',
    newPath: '/images/hero/film-noir/2-novel.jpg'
  },
  {
    title: 'Urban Anxiety',
    file: 'genius-1-1-3.json', 
    newPath: '/images/hero/film-noir/3-mitchum.jpg'
  },
  {
    title: 'Femme Fatales',
    file: 'genius-1-1-4.json',
    newPath: '/images/hero/film-noir/4-femme-fateles.jpg'
  },
  {
    title: 'Moral Ambiguity', 
    file: 'genius-1-1-5.json',
    newPath: '/images/hero/film-noir/5-moral-ambiguity.jpg'
  },
  {
    title: 'Noir\'s Legacy',
    file: 'genius-1-1-6.json',
    newPath: '/images/hero/film-noir/6-noirs-legacy.jpg'
  },
  {
    title: 'Giallo: Italian Horror Aesthetics',
    file: 'genius-1-2-1.json',
    newPath: '/images/hero/horror-suspense/1-giallo.jpg' 
  },
  {
    title: 'Cronenberg\'s Body Horror',
    file: 'genius-1-2-2.json',
    newPath: '/images/hero/horror-suspense/2-cronenberG.jpg'
  },
  {
    title: 'Silent Comedy Stars',
    file: 'genius-1-3-1.json', 
    newPath: '/images/hero/comedy-through-the-ages/silent-comedy-stars.jpg'
  },
  {
    title: 'Screwball Comedy: Battle of the Sexes',
    file: 'genius-1-3-2.json',
    newPath: '/images/hero/comedy-through-the-ages/screwball-comedy--battle-of-the-sexes.jpg'
  },
  {
    title: 'British Comedy: Ealing to Python', 
    file: 'genius-1-3-3.json',
    newPath: '/images/hero/comedy-through-the-ages/british-comedy--ealing-to-python.jpg'
  },
  {
    title: 'Saturday Night Live Cinema',
    file: 'genius-1-3-4.json',
    newPath: '/images/hero/comedy-through-the-ages/saturday-night-live-cinema.jpg'
  },
  {
    title: 'Judd Apatow & The New Comedy',
    file: 'genius-1-3-5.json', 
    newPath: '/images/hero/comedy-through-the-ages/judd-apatow---the-new-comedy.jpg'
  }
];

async function applyFixes() {
  console.log('🔧 Applying Hero Image Path Fixes');
  console.log('=================================\n');
  
  // Create backup directory
  await fs.mkdir(CONFIG.backupDir, { recursive: true });
  
  let fixedCount = 0;
  let errors = 0;
  
  for (const fix of FIXES) {
    try {
      const episodeFile = path.join(CONFIG.episodesDir, fix.file);
      
      // Check if file exists
      try {
        await fs.access(episodeFile);
      } catch (error) {
        console.log(`⚠️  File not found: ${fix.file}`);
        continue;
      }
      
      // Read current episode
      const content = await fs.readFile(episodeFile, 'utf-8');
      const episode = JSON.parse(content);
      
      // Create backup
      const backupFile = path.join(CONFIG.backupDir, fix.file);
      await fs.copyFile(episodeFile, backupFile);
      
      // Update hero image path
      const oldPath = episode.heroImage;
      episode.heroImage = fix.newPath;
      
      // Write updated episode
      await fs.writeFile(episodeFile, JSON.stringify(episode, null, 2), 'utf-8');
      
      console.log(`✅ Fixed: ${fix.title}`);
      console.log(`   From: ${oldPath || 'undefined'}`);
      console.log(`   To:   ${fix.newPath}\n`);
      
      fixedCount++;
      
    } catch (error) {
      console.log(`❌ Error fixing ${fix.title}: ${error.message}\n`);
      errors++;
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`✅ Fixed: ${fixedCount} episodes`);
  console.log(`❌ Errors: ${errors} episodes`);
  console.log(`💾 Backups saved to: ${CONFIG.backupDir}\n`);
  
  console.log('🌐 These episodes should now display hero images on your live site!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  applyFixes();
}