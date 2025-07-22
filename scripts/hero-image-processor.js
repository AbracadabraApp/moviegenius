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

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

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

Enter choice (1-6): `);

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
if (require.main === module) {
  main();
}

module.exports = {
  processImage,
  updateEpisodeJson,
  generateMissingImageList
};