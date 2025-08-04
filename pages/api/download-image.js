// API endpoint for downloading and processing images from alternative sources
import { ImageSourceManager } from '../../lib/image-sources';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, episode } = req.body;

    if (!image || !episode) {
      return res.status(400).json({ error: 'Image and episode data required' });
    }

    // Generate target path based on episode info
    const episodeSlug = episode.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const seriesSlug = episode.series
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    if (!episodeSlug || !seriesSlug) {
      return res.status(400).json({ error: 'Invalid episode information' });
    }

    // Determine target directory based on series
    const seriesMapping = {
      'contemporary-auteurs': 'contemporary-auteurs',
      'technical-evolution': 'technical-evolution', 
      'decades': 'decades',
      'film-noir': 'film-noir',
      'classic-film-noir': 'film-noir'
    };

    const targetDir = seriesMapping[seriesSlug] || seriesSlug;
    const fileName = `${episodeSlug}.jpg`;
    
    // Ensure target directory exists
    const heroDir = path.join(process.cwd(), 'public', 'images', 'hero', targetDir);
    await fs.mkdir(heroDir, { recursive: true });
    
    const targetPath = path.join(heroDir, fileName);
    const relativePath = `/images/hero/${targetDir}/${fileName}`;

    // Download and process image
    const manager = new ImageSourceManager();
    const result = await manager.downloadImage(image, targetPath);

    if (!result.success) {
      return res.status(500).json({
        error: 'Download failed',
        message: result.error
      });
    }

    // Update episode JSON file if possible
    try {
      await updateEpisodeHeroImage(episode, relativePath);
    } catch (error) {
      console.warn('Could not update episode JSON:', error.message);
      // Continue anyway - manual update will be needed
    }

    // Save attribution information
    await saveAttribution(image, episode, relativePath);

    return res.status(200).json({
      success: true,
      imagePath: relativePath,
      attribution: result.attribution,
      episode: {
        title: episode.title,
        series: episode.series,
        theme: episode.theme
      },
      source: {
        type: image.source,
        url: image.unsplashUrl || image.pexelsUrl,
        photographer: image.photographer
      }
    });

  } catch (error) {
    console.error('Image download API error:', error);
    
    return res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
}

async function updateEpisodeHeroImage(episode, imagePath) {
  // Try to find and update the episode JSON file
  const episodesDir = path.join(process.cwd(), 'data', 'episodes');
  
  try {
    const files = await fs.readdir(episodesDir);
    const episodeFiles = files.filter(f => f.startsWith('genius-') && f.endsWith('.json'));

    // Search for matching episode file
    for (const file of episodeFiles) {
      try {
        const filePath = path.join(episodesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const episodeData = JSON.parse(content);

        // Check if this is the matching episode
        const titleMatch = episodeData.episode?.title
          ?.toLowerCase()
          .includes(episode.title.toLowerCase());
        
        if (titleMatch) {
          // Update hero image path
          episodeData.heroImage = imagePath;
          
          // Add metadata about the source
          episodeData.heroImageSource = {
            type: 'auto-generated',
            timestamp: new Date().toISOString(),
            originalSource: episode.source?.type || 'unknown'
          };

          // Write back to file
          await fs.writeFile(filePath, JSON.stringify(episodeData, null, 2), 'utf-8');
          console.log(`Updated ${file} with hero image: ${imagePath}`);
          return;
        }

      } catch (error) {
        console.warn(`Error processing ${file}:`, error.message);
        continue;
      }
    }

    console.warn('Could not find matching episode file to update');

  } catch (error) {
    console.error('Error updating episode JSON:', error);
    throw error;
  }
}

async function saveAttribution(image, episode, imagePath) {
  // Save attribution information for licensing compliance
  const attribution = {
    episode: {
      title: episode.title,
      series: episode.series,
      theme: episode.theme
    },
    image: {
      id: image.id,
      source: image.source,
      url: image.url,
      downloadUrl: image.downloadUrl,
      photographer: image.photographer,
      photographerUrl: image.photographerUrl,
      sourceUrl: image.unsplashUrl || image.pexelsUrl,
      description: image.description
    },
    usage: {
      path: imagePath,
      purpose: 'Hero image for educational film content',
      downloadedAt: new Date().toISOString(),
      license: getSourceLicense(image.source)
    }
  };

  // Save to attribution file
  const attributionDir = path.join(process.cwd(), 'data', 'image-attributions');
  await fs.mkdir(attributionDir, { recursive: true });
  
  const attributionFile = path.join(attributionDir, 'hero-images.json');
  
  let attributions = [];
  try {
    const existing = await fs.readFile(attributionFile, 'utf-8');
    attributions = JSON.parse(existing);
  } catch (error) {
    // File doesn't exist yet, start with empty array
  }

  attributions.push(attribution);
  
  await fs.writeFile(attributionFile, JSON.stringify(attributions, null, 2), 'utf-8');
}

function getSourceLicense(source) {
  switch (source) {
    case 'unsplash':
      return 'Unsplash License (Free for commercial and non-commercial use)';
    case 'pexels':
      return 'Pexels License (Free for commercial and non-commercial use)';
    case 'tmdb':
      return 'Fair Use (Educational/Critical Commentary)';
    default:
      return 'Unknown - Review licensing requirements';
  }
}