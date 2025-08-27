// Transform all movie-lists files: remove (Part N) names and enhance descriptions
import fs from 'fs';
import path from 'path';

function transformPartName(listName, category) {
  // If it doesn't have a part number, return as-is
  if (!listName.match(/\(Part\s*\d+\)/i)) {
    return listName;
  }

  // Extract the base name and part number
  const match = listName.match(/^(.*?)\s*\(Part\s*(\d+)\)\s*$/i);
  if (!match) return listName;

  const [, baseName, partNum] = match;
  const cleanBase = baseName.trim();
  const partNumber = parseInt(partNum);

  // Transform strategies with meaningful qualifiers
  const qualifiers = {
    comedy: ['Classic', 'Modern', 'International', 'Indie', 'Dark', 'Romantic', 'Slapstick', 'Satirical'],
    crime: ['Classic', 'International', 'Psychological', 'Violent', 'Noir', 'Heist', 'Detective', 'Gangster'],
    thriller: ['Classic', 'Psychological', 'Action', 'Supernatural', 'Tech', 'Political', 'Medical', 'Legal'],
    drama: ['Family', 'Historical', 'Contemporary', 'Character', 'Social', 'Period', 'Indie', 'Epic'],
    horror: ['Classic', 'Supernatural', 'Psychological', 'Slasher', 'Gothic', 'Modern', 'Foreign', 'Cult'],
    romance: ['Classic', 'Contemporary', 'Period', 'International', 'Indie', 'Teen', 'Mature', 'Fantasy'],
    action: ['Classic', 'Modern', 'International', 'Martial Arts', 'Spy', 'Military', 'Superhero', 'Revenge'],
    western: ['Classic', 'Modern', 'Spaghetti', 'Comedy', 'Revisionist', 'Epic', 'B-Movie', 'International']
  };

  const eraQualifiers = ['Vintage', 'Golden Age', 'New Wave', 'Contemporary', 'Modern', 'Classic', 'Retro', 'Current'];
  const intensityQualifiers = ['Essential', 'Hidden Gems', 'Deep Cuts', 'Overlooked', 'Cult Favorites', 'Popular', 'Rare Finds'];
  const culturalQualifiers = ['American', 'International', 'European', 'Asian', 'British', 'Independent', 'Hollywood', 'Foreign'];

  // Choose transformation based on base name patterns
  let newName = cleanBase;
  
  if (cleanBase.toLowerCase().includes('comedies')) {
    const qualifier = qualifiers.comedy?.[partNumber - 1] || eraQualifiers[partNumber - 1] || `Volume ${partNumber}`;
    newName = `${qualifier} ${cleanBase}`;
  } else if (cleanBase.toLowerCase().includes('crime')) {
    const qualifier = qualifiers.crime?.[partNumber - 1] || culturalQualifiers[partNumber - 1] || intensityQualifiers[partNumber - 1];
    newName = `${qualifier} ${cleanBase}`;
  } else if (cleanBase.toLowerCase().includes('thriller')) {
    const qualifier = qualifiers.thriller?.[partNumber - 1] || intensityQualifiers[partNumber - 1] || `Volume ${partNumber}`;
    newName = `${qualifier} ${cleanBase}`;
  } else if (cleanBase.toLowerCase().includes('stories') || cleanBase.toLowerCase().includes('tales')) {
    const qualifier = eraQualifiers[partNumber - 1] || culturalQualifiers[partNumber - 1] || `Volume ${partNumber}`;
    newName = `${qualifier} ${cleanBase}`;
  } else {
    // Generic fallback - use category-appropriate qualifiers
    const categoryQuals = qualifiers[category.toLowerCase()] || eraQualifiers;
    const qualifier = categoryQuals[partNumber - 1] || `Volume ${partNumber}`;
    newName = `${qualifier} ${cleanBase}`;
  }

  return newName;
}

function enhanceDescription(listName, category) {
  // Remove common suffixes for description
  const cleanName = listName
    .replace(/\s*\(Part\s*\d+\)\s*$/i, '')
    .replace(/\s*collection$/i, '')
    .trim();

  // Category-specific description templates
  const templates = {
    comedy: [
      "A collection of comedic films featuring",
      "Humorous movies exploring",
      "Comedy films centered around", 
      "Lighthearted movies about"
    ],
    crime: [
      "Crime films exploring",
      "A collection of movies about",
      "Thriller and crime films featuring",
      "Stories of criminal activity involving"
    ],
    thriller: [
      "Suspenseful films about",
      "Psychological thrillers featuring",
      "Tense movies exploring",
      "Edge-of-your-seat films about"
    ],
    romance: [
      "Romantic films featuring",
      "Love stories about", 
      "Romantic movies exploring",
      "Heartwarming tales of"
    ],
    drama: [
      "Dramatic films exploring",
      "Character-driven stories about",
      "Emotional movies featuring",
      "Compelling dramas about"
    ],
    action: [
      "Action-packed films featuring",
      "High-octane movies about",
      "Adrenaline-fueled stories of",
      "Exciting action films about"
    ],
    horror: [
      "Horror films featuring",
      "Spine-chilling movies about",
      "Terrifying stories of",
      "Frightening films exploring"
    ],
    'science fiction': [
      "Science fiction films exploring",
      "Futuristic movies about",
      "Sci-fi stories featuring",
      "Speculative films about"
    ],
    fantasy: [
      "Fantasy films featuring",
      "Magical stories about",
      "Fantastical movies exploring",
      "Enchanting tales of"
    ],
    western: [
      "Western films featuring",
      "Frontier stories about",
      "Wild West movies exploring",
      "Classic westerns about"
    ]
  };

  // Get template based on category
  const categoryTemplates = templates[category.toLowerCase()] || templates.drama;
  const template = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];

  // Extract key themes from list name for description
  const themes = extractThemes(cleanName);
  
  return `${template} ${themes.toLowerCase()}.`;
}

function extractThemes(listName) {
  // Convert list name to descriptive themes
  const themeMap = {
    'gambling': 'gambling, luck, and high stakes',
    'criminal mishap': 'criminal plans gone wrong',
    'dark comedy': 'dark humor and moral ambiguity', 
    'accidents': 'unexpected mishaps and their consequences',
    'intersecting lives': 'interconnected storylines and fate',
    'british crime': 'the British criminal underworld',
    'heist failures': 'failed robberies and bungled crimes',
    'amateur': 'inexperienced criminals and their blunders',
    'identity fraud': 'stolen identities and deception',
    'small town': 'small-town life and community dynamics',
    'western comedy': 'comedic takes on the Wild West',
    'fish out of water': 'characters in unfamiliar situations',
    'frontier business': 'entrepreneurship on the frontier',
    'dream reality': 'blurred lines between dreams and reality',
    'psychological captivity': 'mental imprisonment and control',
    'twist endings': 'unexpected plot revelations',
    'hidden identity': 'secret identities and revelations',
    'wedding themed': 'weddings and marriage ceremonies',
    'sister relationship': 'bonds between sisters',
    'nonconformist family': 'unconventional family dynamics',
    'satirical': 'satirical and witty commentary',
    'classic': 'timeless and influential stories',
    'international': 'diverse global perspectives',
    'modern': 'contemporary themes and storytelling'
  };

  // Look for themes in the list name
  const lowerName = listName.toLowerCase();
  for (const [key, description] of Object.entries(themeMap)) {
    if (lowerName.includes(key)) {
      return description;
    }
  }

  // Fallback: use the list name itself with some processing
  return listName
    .toLowerCase()
    .replace(/\b(films?|movies?|stories?|tales?|comedies|thrillers|dramas)\b/g, '')
    .replace(/\b(classic|modern|international|indie|dark|romantic|contemporary)\b/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'unique cinematic experiences';
}

function createUrlSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function transformAllMovieLists() {
  const movieListsDir = './public/data/movie-lists';
  const files = fs.readdirSync(movieListsDir);
  
  let totalProcessed = 0;
  let totalTransformed = 0;
  const transformations = [];

  console.log(`Found ${files.length} movie list files to process...`);

  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const filePath = path.join(movieListsDir, file);
    
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let fileChanged = false;

      if (data.lists && Array.isArray(data.lists)) {
        for (let i = 0; i < data.lists.length; i++) {
          const list = data.lists[i];
          const originalName = list.name;
          
          // Transform name if it has (Part N)
          const transformedName = transformPartName(list.name, list.category);
          
          if (transformedName !== originalName) {
            transformations.push({
              file: file,
              original: originalName,
              transformed: transformedName,
              category: list.category
            });
            
            list.name = transformedName;
            list.url_path = createUrlSlug(transformedName);
            fileChanged = true;
            totalTransformed++;
          }

          // Always enhance description
          list.description = enhanceDescription(transformedName, list.category);
          list.connectionReason = `Part of ${transformedName} collection`;
          fileChanged = true;
        }
      }

      if (fileChanged) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }

      totalProcessed++;

      if (totalProcessed % 1000 === 0) {
        console.log(`Processed ${totalProcessed} files...`);
      }

    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n=== TRANSFORMATION COMPLETE ===`);
  console.log(`Total files processed: ${totalProcessed}`);
  console.log(`Total names transformed: ${totalTransformed}`);
  console.log(`All descriptions enhanced: ${totalProcessed}`);

  // Show sample transformations
  console.log(`\n=== SAMPLE TRANSFORMATIONS ===`);
  transformations.slice(0, 15).forEach((t, i) => {
    console.log(`${i + 1}. "${t.original}" → "${t.transformed}" (${t.category})`);
  });

  if (transformations.length > 15) {
    console.log(`... and ${transformations.length - 15} more transformations`);
  }

  return {
    totalProcessed,
    totalTransformed,
    transformations
  };
}

// Run the transformation
transformAllMovieLists()
  .then(result => {
    console.log('\n✅ All movie lists successfully transformed!');
  })
  .catch(error => {
    console.error('❌ Error during transformation:', error);
  });