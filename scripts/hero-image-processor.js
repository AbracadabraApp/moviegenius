#!/usr/bin/env node

/**
 * Hero Image Batch Processor
 * 
 * This script helps streamline your Midjourney workflow by:
 * 1. Organizing downloaded images into proper directory structure
 * 2. Renaming images to match episode naming convention
 * 3. Updating episode JSON files with correct hero image paths
 * 4. Optimizing images for web delivery
 * 
 * Usage:
 *   node scripts/hero-image-processor.js
 */

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  heroImagesDir: path.join(__dirname, '../public/images/hero'),
  episodesDir: path.join(__dirname, '../data/episodes'),
  downloadDir: path.join(process.env.HOME, 'Downloads'), // Default download location
  supportedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  targetWidth: 1200,
  targetHeight: 600,
};

// Episode series mapping for organization
const SERIES_MAPPING = {
  'coen-brothers': 'contemporary-auteurs',
  'digital-revolution': 'technical-evolution',
  '1970s-auteur': 'decades',
  '1990s-independent': 'decades',
  'german-expressionism': 'film-noir',
  'from-novels-to-noir': 'film-noir',
  'urban-anxiety': 'film-noir',
  'femme-fatales': 'film-noir',
  'moral-ambiguity': 'film-noir',
  'noirs-legacy': 'film-noir',
};

// Interactive CLI helper
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
};

async function main() {
  console.log('🎬 Hero Image Batch Processor');
  console.log('================================\n');

  try {
    const mode = await askQuestion(`Choose mode:
1. Process downloaded images from ${CONFIG.downloadDir}
2. Sequential processing from guidance report
3. Direct assignment (specify episode file)
4. Interactive image assignment
5. Bulk update episode JSON files
6. Generate missing image list
7. Next episode workflow (generate → specify filename → repeat)

Enter choice (1-7): `);

    switch (mode.trim()) {
      case '1':
        await processDownloadedImages();
        break;
      case '2':
        await processSequentialFromGuidance();
        break;
      case '3':
        await directEpisodeAssignment();
        break;
      case '4':
        await interactiveImageAssignment();
        break;
      case '5':
        await bulkUpdateEpisodeFiles();
        break;
      case '6':
        await generateMissingImageList();
        break;
      case '7':
        await nextEpisodeWorkflow();
        break;
      default:
        console.log('Invalid choice. Exiting.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

/**
 * Process images from Downloads folder
 */
async function processDownloadedImages() {
  console.log('\n📁 Scanning Downloads folder for hero images...\n');

  try {
    const files = await fs.readdir(CONFIG.downloadDir);
    const imageFiles = files.filter(file => 
      CONFIG.supportedExtensions.some(ext => 
        file.toLowerCase().endsWith(ext)
      )
    );

    if (imageFiles.length === 0) {
      console.log('No image files found in Downloads folder.');
      return;
    }

    console.log(`Found ${imageFiles.length} image files:`);
    imageFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const selectedFile = await askQuestion('\nEnter file number to process (or "all" for batch): ');

    if (selectedFile.toLowerCase() === 'all') {
      for (const file of imageFiles) {
        await processImage(file);
      }
    } else {
      const fileIndex = parseInt(selectedFile) - 1;
      if (fileIndex >= 0 && fileIndex < imageFiles.length) {
        await processImage(imageFiles[fileIndex]);
      } else {
        console.log('Invalid selection.');
      }
    }

  } catch (error) {
    console.error('Error scanning downloads:', error.message);
  }
}

/**
 * Process a single image file
 */
async function processImage(filename) {
  console.log(`\n🎨 Processing: ${filename}`);
  
  const sourceFile = path.join(CONFIG.downloadDir, filename);
  
  // Interactive episode selection
  const episodeInfo = await getEpisodeInfo();
  if (!episodeInfo) return;

  const { seriesDir, episodeSlug } = episodeInfo;
  const targetDir = path.join(CONFIG.heroImagesDir, seriesDir);
  const targetFile = path.join(targetDir, `${episodeSlug}.jpg`);

  try {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Copy and rename file
    await fs.copyFile(sourceFile, targetFile);
    console.log(`✅ Copied to: ${path.relative(CONFIG.heroImagesDir, targetFile)}`);

    // Update episode JSON
    await updateEpisodeJson(episodeInfo.episodeFile, seriesDir, episodeSlug);

    // Optional: Move original to processed folder
    const processedDir = path.join(CONFIG.downloadDir, 'processed-hero-images');
    await fs.mkdir(processedDir, { recursive: true });
    await fs.rename(sourceFile, path.join(processedDir, filename));
    console.log(`📁 Moved original to: processed-hero-images/`);

  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
  }
}

/**
 * Interactive episode information gathering
 */
async function getEpisodeInfo() {
  console.log('\n📝 Episode Information:');
  
  const episodeTitle = await askQuestion('Episode title (for filename): ');
  if (!episodeTitle.trim()) return null;

  const seriesOptions = Object.values(SERIES_MAPPING).filter((v, i, a) => a.indexOf(v) === i);
  console.log('\nAvailable series:');
  seriesOptions.forEach((series, index) => {
    console.log(`${index + 1}. ${series}`);
  });

  const seriesChoice = await askQuestion('Series number: ');
  const seriesIndex = parseInt(seriesChoice) - 1;
  
  if (seriesIndex < 0 || seriesIndex >= seriesOptions.length) {
    console.log('Invalid series selection.');
    return null;
  }

  const seriesDir = seriesOptions[seriesIndex];
  const episodeSlug = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');

  // Find corresponding episode JSON file
  const episodeFile = await findEpisodeFile(episodeSlug);

  return {
    seriesDir,
    episodeSlug,
    episodeFile,
    title: episodeTitle
  };
}

/**
 * Find episode JSON file by slug
 */
async function findEpisodeFile(slug) {
  try {
    const files = await fs.readdir(CONFIG.episodesDir);
    const episodeFiles = files.filter(file => 
      file.startsWith('genius-') && file.endsWith('.json')
    );

    // Try to match by content inspection
    for (const file of episodeFiles) {
      try {
        const content = await fs.readFile(path.join(CONFIG.episodesDir, file), 'utf-8');
        const episode = JSON.parse(content);
        const titleSlug = episode.episode.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        if (titleSlug.includes(slug) || slug.includes(titleSlug)) {
          return file;
        }
      } catch (error) {
        // Skip malformed files
      }
    }

    console.log(`\nCouldn't auto-match episode file. Available files:`);
    episodeFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const choice = await askQuestion('Select episode file number: ');
    const fileIndex = parseInt(choice) - 1;
    
    if (fileIndex >= 0 && fileIndex < episodeFiles.length) {
      return episodeFiles[fileIndex];
    }

  } catch (error) {
    console.error('Error finding episode file:', error.message);
  }
  
  return null;
}

/**
 * Update episode JSON with hero image path
 */
async function updateEpisodeJson(filename, seriesDir, episodeSlug) {
  if (!filename) return;

  try {
    const filePath = path.join(CONFIG.episodesDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const episode = JSON.parse(content);

    // Update hero image path
    const heroImagePath = `/images/hero/${seriesDir}/${episodeSlug}.jpg`;
    episode.heroImage = heroImagePath;

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(episode, null, 2), 'utf-8');
    console.log(`✅ Updated ${filename} with hero image path`);

  } catch (error) {
    console.error(`Error updating episode JSON:`, error.message);
  }
}

/**
 * Interactive image assignment for existing files
 */
async function interactiveImageAssignment() {
  console.log('\n🎯 Interactive Image Assignment\n');
  
  try {
    // Scan for existing images in hero directories
    const seriesDirs = await fs.readdir(CONFIG.heroImagesDir);
    const existingImages = [];

    for (const seriesDir of seriesDirs) {
      if (seriesDir === 'README.md') continue;
      
      const seriesPath = path.join(CONFIG.heroImagesDir, seriesDir);
      const stat = await fs.stat(seriesPath);
      
      if (stat.isDirectory()) {
        const images = await fs.readdir(seriesPath);
        images.forEach(image => {
          if (CONFIG.supportedExtensions.some(ext => image.toLowerCase().endsWith(ext))) {
            existingImages.push({ series: seriesDir, filename: image });
          }
        });
      }
    }

    console.log(`Found ${existingImages.length} existing hero images:`);
    existingImages.forEach((img, index) => {
      console.log(`${index + 1}. ${img.series}/${img.filename}`);
    });

    // Interactive assignment to episodes
    const shouldAssign = await askQuestion('\nAssign these to episode files? (y/n): ');
    if (shouldAssign.toLowerCase() === 'y') {
      for (const img of existingImages) {
        await assignImageToEpisode(img);
      }
    }

  } catch (error) {
    console.error('Error in interactive assignment:', error.message);
  }
}

/**
 * Assign an image to an episode
 */
async function assignImageToEpisode(image) {
  console.log(`\n📋 Assigning: ${image.series}/${image.filename}`);
  
  const episodeFile = await askQuestion('Episode file name (or skip): ');
  if (episodeFile.toLowerCase() === 'skip') return;

  const heroImagePath = `/images/hero/${image.series}/${image.filename}`;
  await updateEpisodeJson(episodeFile, image.series, path.parse(image.filename).name);
}

/**
 * Bulk update all episode JSON files
 */
async function bulkUpdateEpisodeFiles() {
  console.log('\n🔄 Bulk updating episode JSON files...\n');
  
  try {
    const files = await fs.readdir(CONFIG.episodesDir);
    const episodeFiles = files.filter(file => 
      file.startsWith('genius-') && file.endsWith('.json')
    );

    for (const file of episodeFiles) {
      try {
        const content = await fs.readFile(path.join(CONFIG.episodesDir, file), 'utf-8');
        const episode = JSON.parse(content);

        // Check if hero image path needs standardization
        if (episode.heroImage && episode.heroImage.includes('theme-')) {
          console.log(`📝 Standardizing path in ${file}`);
          
          // Extract episode info for standardized path
          const titleSlug = episode.episode.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const seriesSlug = episode.series.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
          
          // Map to standardized series directory
          const seriesDir = SERIES_MAPPING[titleSlug] || seriesSlug;
          const newPath = `/images/hero/${seriesDir}/${titleSlug}.jpg`;
          
          episode.heroImage = newPath;
          
          await fs.writeFile(
            path.join(CONFIG.episodesDir, file), 
            JSON.stringify(episode, null, 2), 
            'utf-8'
          );
          
          console.log(`✅ Updated ${file}`);
        }

      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }

  } catch (error) {
    console.error('Error in bulk update:', error.message);
  }
}

/**
 * Direct assignment - specify episode file directly
 */
async function directEpisodeAssignment() {
  console.log('\n🎯 Direct Episode Assignment\n');
  
  while (true) {
    try {
      // Show available images
      const files = await fs.readdir(CONFIG.downloadDir);
      const imageFiles = files.filter(file => 
        CONFIG.supportedExtensions.some(ext => 
          file.toLowerCase().endsWith(ext)
        )
      );

      if (imageFiles.length === 0) {
        console.log('No image files found in Downloads folder.');
        break;
      }

      console.log(`\nFound ${imageFiles.length} image files:`);
      imageFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });

      // Select image
      const imageChoice = await askQuestion(`\nSelect image (1-${imageFiles.length}) or 'q' to quit: `);
      
      if (imageChoice.toLowerCase() === 'q') {
        console.log('Exiting direct assignment mode.');
        break;
      }

      const imageIndex = parseInt(imageChoice) - 1;
      
      if (imageIndex < 0 || imageIndex >= imageFiles.length) {
        console.log('Invalid image selection. Try again.');
        continue;
      }

      const selectedImage = imageFiles[imageIndex];

      // Get episode file directly
      const episodeFile = await askQuestion('\nEnter episode filename (e.g., genius-1-2-3.json) or "skip" to select different image: ');
      
      if (episodeFile.toLowerCase() === 'skip') {
        continue;
      }

      if (!episodeFile.endsWith('.json')) {
        console.log('Episode file must end with .json');
        continue;
      }

      // Load the episode to get details
      try {
        const episodePath = path.join(CONFIG.episodesDir, episodeFile);
        const content = await fs.readFile(episodePath, 'utf-8');
        const episode = JSON.parse(content);

        console.log(`\n📋 Episode Details:`);
        console.log(`Title: ${episode.episode?.title || 'Unknown'}`);
        console.log(`Series: ${episode.series?.title || 'Unknown'}`);
        console.log(`Theme: ${episode.theme?.title || 'Unknown'}`);

        const confirm = await askQuestion(`\nAssign "${selectedImage}" to this episode? (y/n): `);
        
        if (confirm.toLowerCase() === 'y') {
          episode.filename = episodeFile; // Add filename for processing
          await processImageForEpisode(selectedImage, episode);
          console.log('\n✅ Assignment complete!');
        } else {
          console.log('Assignment cancelled.');
        }

      } catch (error) {
        console.error(`Error loading episode file ${episodeFile}:`, error.message);
        console.log('Try again with a different episode file.');
      }

    } catch (error) {
      console.error('Error in direct assignment:', error.message);
    }
  }
}

/**
 * Process images sequentially following guidance report order
 */
async function processSequentialFromGuidance() {
  console.log('\n📋 Sequential Processing from Guidance Report\n');
  
  try {
    // Load episodes from guidance report order
    const episodes = await loadEpisodeData();
    if (episodes.length === 0) {
      console.log('No episodes found.');
      return;
    }

    // Sort episodes by theme and series for consistent processing order
    episodes.sort((a, b) => {
      const aTheme = a.theme?.title || 'ZZZ';
      const bTheme = b.theme?.title || 'ZZZ';
      if (aTheme !== bTheme) return aTheme.localeCompare(bTheme);
      
      const aSeries = a.series?.title || 'ZZZ';
      const bSeries = b.series?.title || 'ZZZ';
      if (aSeries !== bSeries) return aSeries.localeCompare(bSeries);
      
      // Use filename as final sort key
      return a.filename.localeCompare(b.filename);
    });

    // Show available images
    const files = await fs.readdir(CONFIG.downloadDir);
    const imageFiles = files.filter(file => 
      CONFIG.supportedExtensions.some(ext => 
        file.toLowerCase().endsWith(ext)
      )
    );

    if (imageFiles.length === 0) {
      console.log('No image files found in Downloads folder.');
      return;
    }

    console.log(`Found ${imageFiles.length} image files in Downloads`);
    console.log(`Processing ${episodes.length} episodes in order\n`);

    // Process each episode in order
    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      const episodeTitle = episode.episode?.title || 'Untitled';
      const seriesTitle = episode.series?.title || 'Unknown';
      const themeTitle = episode.theme?.title || 'Unknown';
      
      // Check if episode already has a hero image
      const hasImage = episode.heroImage && !episode.heroImage.includes('placeholder');
      const status = hasImage ? '✅' : '❌';
      
      console.log(`\n${status} Episode ${i + 1}/${episodes.length}`);
      console.log(`Theme: ${themeTitle}`);
      console.log(`Series: ${seriesTitle}`);
      console.log(`Title: ${episodeTitle}`);
      console.log(`File: ${episode.filename}`);
      
      if (hasImage) {
        console.log(`Current image: ${episode.heroImage}`);
        const skip = await askQuestion('Already has image. Skip? (y/n): ');
        if (skip.toLowerCase() === 'y') continue;
      }

      // Show available images
      console.log('\nAvailable images:');
      imageFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
      });

      const choice = await askQuestion(`\nSelect image for "${episodeTitle}" (1-${imageFiles.length} or 's' to skip): `);
      
      if (choice.toLowerCase() === 's') {
        console.log('Skipped.');
        continue;
      }

      const imageIndex = parseInt(choice) - 1;
      if (imageIndex < 0 || imageIndex >= imageFiles.length) {
        console.log('Invalid selection, skipping.');
        continue;
      }

      const selectedImage = imageFiles[imageIndex];
      
      // Process the image for this episode
      await processImageForEpisode(selectedImage, episode);
      
      // Remove processed image from the list
      imageFiles.splice(imageIndex, 1);
      
      if (imageFiles.length === 0) {
        console.log('\nAll images processed!');
        break;
      }
    }

  } catch (error) {
    console.error('Error in sequential processing:', error.message);
  }
}

/**
 * Process a specific image for a specific episode
 */
async function processImageForEpisode(filename, episode) {
  console.log(`\n🎨 Processing: ${filename} → ${episode.episode.title}`);
  
  const sourceFile = path.join(CONFIG.downloadDir, filename);
  const episodeTitle = episode.episode?.title || '';
  const seriesTitle = episode.series?.title || '';
  
  // Generate episode slug and series directory
  const episodeSlug = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const seriesSlug = seriesTitle.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Map to standardized series directory
  const seriesDir = SERIES_MAPPING[episodeSlug] || 
                   SERIES_MAPPING[seriesSlug] || 
                   seriesSlug.replace(/[^a-z0-9-]/g, '');
  
  const targetDir = path.join(CONFIG.heroImagesDir, seriesDir);
  const targetFile = path.join(targetDir, `${episodeSlug}.jpg`);

  try {
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Copy and rename file
    await fs.copyFile(sourceFile, targetFile);
    console.log(`✅ Copied to: ${path.relative(CONFIG.heroImagesDir, targetFile)}`);

    // Update episode JSON
    await updateEpisodeJsonForEpisode(episode.filename, seriesDir, episodeSlug);

    // Optional: Move original to processed folder
    const processedDir = path.join(CONFIG.downloadDir, 'processed-hero-images');
    await fs.mkdir(processedDir, { recursive: true });
    await fs.rename(sourceFile, path.join(processedDir, filename));
    console.log(`📁 Moved original to: processed-hero-images/`);

  } catch (error) {
    console.error(`Error processing ${filename}:`, error.message);
  }
}

/**
 * Update episode JSON with hero image path for specific episode
 */
async function updateEpisodeJsonForEpisode(filename, seriesDir, episodeSlug) {
  try {
    const filePath = path.join(CONFIG.episodesDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const episode = JSON.parse(content);

    // Update hero image path
    const heroImagePath = `/images/hero/${seriesDir}/${episodeSlug}.jpg`;
    episode.heroImage = heroImagePath;

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(episode, null, 2), 'utf-8');
    console.log(`✅ Updated ${filename} with hero image path`);

  } catch (error) {
    console.error(`Error updating episode JSON:`, error.message);
  }
}

/**
 * Load episode data in the same order as the guidance report
 */
async function loadEpisodeData() {
  try {
    const episodesDir = path.join(__dirname, '../data/episodes');
    const files = await fs.readdir(episodesDir);
    const episodes = [];

    for (const file of files) {
      if (file.startsWith('genius-') && file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(episodesDir, file), 'utf-8');
          const episode = JSON.parse(content);
          episodes.push({
            filename: file,
            ...episode
          });
        } catch (error) {
          console.error(`Error loading ${file}:`, error.message);
        }
      }
    }

    return episodes;
  } catch (error) {
    console.error('Error loading episode data:', error.message);
    return [];
  }
}

/**
 * Generate list of episodes missing hero images
 */
async function generateMissingImageList() {
  console.log('\n📋 Generating missing images list...\n');
  
  const missing = [];
  
  try {
    const files = await fs.readdir(CONFIG.episodesDir);
    const episodeFiles = files.filter(file => 
      file.startsWith('genius-') && file.endsWith('.json')
    );

    for (const file of episodeFiles) {
      try {
        const content = await fs.readFile(path.join(CONFIG.episodesDir, file), 'utf-8');
        const episode = JSON.parse(content);

        if (episode.heroImage) {
          const imagePath = path.join(__dirname, '..', 'public', episode.heroImage);
          
          try {
            await fs.access(imagePath);
          } catch {
            missing.push({
              episodeFile: file,
              title: episode.episode.title,
              subtitle: episode.episode.subtitle,
              series: episode.series.title,
              expectedPath: episode.heroImage
            });
          }
        } else {
          missing.push({
            episodeFile: file,
            title: episode.episode.title,
            subtitle: episode.episode.subtitle,
            series: episode.series.title,
            expectedPath: 'No path specified'
          });
        }

      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }

    if (missing.length === 0) {
      console.log('🎉 All episodes have hero images!');
    } else {
      console.log(`❌ Found ${missing.length} episodes missing hero images:\n`);
      missing.forEach((item, index) => {
        console.log(`${index + 1}. ${item.series}: ${item.title}`);
        console.log(`   ${item.subtitle}`);
        console.log(`   File: ${item.episodeFile}`);
        console.log(`   Expected: ${item.expectedPath}\n`);
      });

      // Save to file for reference
      const reportPath = path.join(__dirname, 'missing-hero-images.json');
      await fs.writeFile(reportPath, JSON.stringify(missing, null, 2));
      console.log(`📁 Report saved to: ${reportPath}`);
    }

  } catch (error) {
    console.error('Error generating missing list:', error.message);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

/**
 * Next Episode Workflow - Streamlined for Midjourney generation
 */
async function nextEpisodeWorkflow() {
  console.log('\n🎯 Next Episode Workflow');
  console.log('========================\n');
  console.log('This workflow will:');
  console.log('1. Show you the next episode that needs an image');
  console.log('2. Wait for you to generate it in Midjourney');
  console.log('3. Process the image when you provide the filename');
  console.log('4. Repeat until all episodes have images\n');

  try {
    // Load all episodes and find ones missing images
    const episodes = await loadEpisodeData();
    const episodesNeedingImages = [];

    for (const episode of episodes) {
      const hasImage = episode.heroImage && !episode.heroImage.includes('placeholder');
      if (!hasImage) {
        episodesNeedingImages.push(episode);
      }
    }

    if (episodesNeedingImages.length === 0) {
      console.log('🎉 All episodes already have hero images!');
      return;
    }

    // Sort by theme and series for consistent order
    episodesNeedingImages.sort((a, b) => {
      const aTheme = a.theme?.title || 'ZZZ';
      const bTheme = b.theme?.title || 'ZZZ';
      if (aTheme !== bTheme) return aTheme.localeCompare(bTheme);
      
      const aSeries = a.series?.title || 'ZZZ';
      const bSeries = b.series?.title || 'ZZZ';
      if (aSeries !== bSeries) return aSeries.localeCompare(bSeries);
      
      return a.filename.localeCompare(b.filename);
    });

    console.log(`Found ${episodesNeedingImages.length} episodes needing images\n`);

    // Process each episode
    for (let i = 0; i < episodesNeedingImages.length; i++) {
      const episode = episodesNeedingImages[i];
      const episodeTitle = episode.episode?.title || 'Untitled';
      const episodeSubtitle = episode.episode?.subtitle || '';
      const seriesTitle = episode.series?.title || 'Unknown';
      const themeTitle = episode.theme?.title || 'Unknown';
      
      console.log(`\n📋 NEXT EPISODE (${i + 1}/${episodesNeedingImages.length})`);
      console.log(`═══════════════════════════════════════`);
      console.log(`🎬 Title: ${episodeTitle}`);
      console.log(`📝 Subtitle: ${episodeSubtitle}`);
      console.log(`📁 Series: ${seriesTitle}`);
      console.log(`🎭 Theme: ${themeTitle}`);
      console.log(`📄 File: ${episode.filename}`);

      // Generate visual guidance for this episode
      const guidance = generateEpisodeGuidance(episode);
      console.log(`\n🎨 VISUAL GUIDANCE:`);
      console.log(`────────────────────`);
      console.log(`Mood: ${guidance.mood}`);
      console.log(`Colors: ${guidance.colors}`);
      console.log(`Elements: ${guidance.elements}`);
      console.log(`Style: ${guidance.style}`);
      console.log(`\n💡 MIDJOURNEY PROMPT:`);
      console.log(`─────────────────────────`);
      console.log(guidance.prompt);
      console.log(`─────────────────────────\n`);

      // Wait for user to generate image
      const action = await askQuestion(`Actions:
- Press ENTER when you've generated the image
- Type 'skip' to skip this episode
- Type 'quit' to exit

Action: `);

      if (action.toLowerCase() === 'quit') {
        console.log('Exiting workflow.');
        break;
      }

      if (action.toLowerCase() === 'skip') {
        console.log('Skipping this episode.\n');
        continue;
      }

      // Get filename from user
      const filename = await askQuestion('Enter the downloaded image filename (e.g., "image_001.png"): ');
      
      if (!filename.trim()) {
        console.log('No filename provided, skipping this episode.\n');
        continue;
      }

      // Check if file exists in downloads
      const sourceFile = path.join(CONFIG.downloadDir, filename.trim());
      try {
        await fs.access(sourceFile);
      } catch (error) {
        console.log(`❌ File "${filename}" not found in Downloads folder. Skipping.\n`);
        continue;
      }

      // Process the image for this episode
      await processImageForEpisode(filename.trim(), episode);
      console.log(`\n✅ Successfully processed image for "${episodeTitle}"`);
      console.log(`Remaining episodes: ${episodesNeedingImages.length - i - 1}\n`);
    }

    console.log('\n🎉 Workflow complete! All episodes processed.');

  } catch (error) {
    console.error('Error in next episode workflow:', error.message);
  }
}

/**
 * Generate episode guidance (copied from generate-guidance-report.js)
 */
function generateEpisodeGuidance(episode) {
  const title = episode.episode?.title || '';
  const subtitle = episode.episode?.subtitle || '';
  const seriesTitle = episode.series?.title || '';
  const themeTitle = episode.theme?.title || '';
  
  // Basic guidance based on theme and content
  let guidance = {
    mood: 'Sophisticated cinematic atmosphere',
    colors: 'Warm cinematic tones, professional color grading',
    elements: 'Educational film content, sophisticated presentation',
    style: 'Professional cinematography, editorial photography style',
    prompt: `Sophisticated cinematic atmosphere, ${subtitle.toLowerCase()}, warm golden lighting, rich contrast, film study aesthetic, --ar 2:1 --style raw`
  };

  // Check for specific themes and customize guidance
  if (themeTitle.toLowerCase().includes('noir') || title.toLowerCase().includes('noir')) {
    guidance = {
      mood: 'Dramatic shadows, high contrast, noir atmosphere',
      colors: 'Black and white with selective color, dramatic chiaroscuro lighting',
      elements: 'Film noir aesthetics, urban nighttime, venetian blind shadows',
      style: 'Classic film noir cinematography, dramatic lighting',
      prompt: `Film noir cinematography, dramatic chiaroscuro lighting, high contrast black and white, venetian blind shadows, urban nighttime streets, 1940s atmosphere, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('comedy')) {
    guidance = {
      mood: 'Light-hearted, energetic comedy atmosphere',
      colors: 'Bright, vibrant colors with good contrast',
      elements: 'Comedy film sets, expressive characters, dynamic scenes',
      style: 'Classic comedy cinematography, engaging composition',
      prompt: `Comedy cinema atmosphere, ${subtitle.toLowerCase()}, bright engaging lighting, classic Hollywood comedy style, dynamic composition, --ar 2:1 --style raw`
    };
  } else if (title.toLowerCase().includes('horror')) {
    guidance = {
      mood: 'Dark, suspenseful, atmospheric tension',
      colors: 'Dark moody palette with selective highlights',
      elements: 'Horror aesthetics, dramatic shadows, mysterious atmosphere',
      style: 'Genre cinematography, atmospheric lighting',
      prompt: `Horror cinema atmosphere, ${subtitle.toLowerCase()}, dramatic atmospheric lighting, psychological tension, dark moody aesthetics, --ar 2:1 --style raw`
    };
  }

  return guidance;
}

export {
  processImage,
  updateEpisodeJson,
  generateMissingImageList,
  nextEpisodeWorkflow
};