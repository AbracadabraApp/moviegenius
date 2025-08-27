// Transform unhelpful "(Part N)" names into meaningful alternatives

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

  // Transform strategies based on patterns
  
  // Strategy 1: Add descriptive qualifiers
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

  // Strategy 2: Add era/style distinctions  
  const eraQualifiers = ['Vintage', 'Golden Age', 'New Wave', 'Contemporary', 'Modern', 'Classic', 'Retro', 'Current'];
  
  // Strategy 3: Add scale/intensity distinctions
  const intensityQualifiers = ['Essential', 'Hidden Gems', 'Deep Cuts', 'Overlooked', 'Cult Favorites', 'Popular', 'Rare Finds'];

  // Strategy 4: Geographic/cultural distinctions
  const culturalQualifiers = ['American', 'International', 'European', 'Asian', 'British', 'Independent', 'Hollywood', 'Foreign'];

  // Choose transformation based on base name patterns
  let newName = cleanBase;
  
  if (cleanBase.toLowerCase().includes('comedies')) {
    const qualifier = qualifiers.comedy?.[partNumber - 1] || eraQualifiers[partNumber - 1] || `Volume ${partNumber}`;
    newName = `${qualifier} ${cleanBase}`;
  } else if (cleanBase.toLowerCase().includes('crime')) {
    const qualifier = qualifiers.crime?.[partNumber - 1] || culturalQualifiers[partNumber - 1] || `${intensityQualifiers[partNumber - 1]} ${cleanBase}`;
    newName = qualifier.includes(cleanBase) ? qualifier : `${qualifier} ${cleanBase}`;
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

// Test with actual examples
const examples = [
  { name: "Criminal Mishap Comedies (Part 8)", category: "comedy" },
  { name: "Dark Comedy Accidents (Part 7)", category: "comedy" },  
  { name: "British Crime Films (Part 2)", category: "crime" },
  { name: "Amateur Heist Failures (Part 2)", category: "crime" },
  { name: "Psychological Captivity Films (Part 4)", category: "thriller" },
  { name: "Genre-Twist Endings (Part 2)", category: "thriller" },
  { name: "Hidden Identity Thrillers (Part 7)", category: "thriller" },
  { name: "Wedding-Themed Romantic Comedies (Part 1)", category: "romance" },
  { name: "Small Town Community Stories (Part 2)", category: "drama" },
  { name: "Nonconformist Family Stories (Part 5)", category: "drama" },
  { name: "Identity Fraud Adventures (Part 3)", category: "comedy" }
];

console.log("=== PART NAME TRANSFORMATIONS ===\n");

examples.forEach((example, index) => {
  const transformed = transformPartName(example.name, example.category);
  console.log(`${index + 1}. Original: "${example.name}"`);
  console.log(`   Better:   "${transformed}"`);
  console.log("");
});

console.log("\n=== TRANSFORMATION STRATEGIES ===");
console.log("• Adds meaningful qualifiers instead of useless part numbers");
console.log("• Uses genre-appropriate descriptors (Classic, Modern, International, etc.)");  
console.log("• Creates distinct identities for each collection");
console.log("• Makes names actually helpful for discovery");
console.log("• No navigation needed - each name stands alone");

export { transformPartName };