import fs from 'fs';

// Read current genius_data.json
const inputPath = 'ios/moviegenius/moviegenius/Resources/genius_data.json';
const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

console.log(`Current structure: ${data.categories.length} categories`);
console.log(`Current tiers per category: ${data.categories[0].tiers.length}`);
console.log(`Total current lists: ${data.categories.length * data.categories[0].tiers.length}`);

// Define tier merge mapping
const tierMergeMap = [
  { newName: 'Essential', oldIndices: [0, 1] },      // Essential + Foundational
  { newName: 'Foundational', oldIndices: [2, 3] },   // Classics + Well-Versed
  { newName: 'Connoisseur', oldIndices: [4, 5] },    // Devotee + Connoisseur
  { newName: 'Specialist', oldIndices: [6, 7] },     // Deep Cuts + Specialist
  { newName: 'Genius', oldIndices: [8, 9] }          // Archivist + Master
];

// Transform data
const newData = {
  categories: data.categories.map(category => {
    const newTiers = tierMergeMap.map(({ newName, oldIndices }) => {
      // Concatenate films from the two old tiers
      const films = oldIndices.flatMap(idx => category.tiers[idx].films);

      return {
        name: newName,
        films: films
      };
    });

    return {
      category: category.category,
      tiers: newTiers
    };
  })
};

// Write to new file (backup original first)
const backupPath = inputPath + '.backup-10tier';
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
console.log(`\n✅ Backup created: ${backupPath}`);

fs.writeFileSync(inputPath, JSON.stringify(newData, null, 2));
console.log(`✅ New data written: ${inputPath}`);

console.log(`\nNew structure: ${newData.categories.length} categories`);
console.log(`New tiers per category: ${newData.categories[0].tiers.length}`);
console.log(`Total new lists: ${newData.categories.length * newData.categories[0].tiers.length}`);

// Show sample film counts
console.log(`\nSample film counts per tier (${newData.categories[0].category}):`);
newData.categories[0].tiers.forEach(tier => {
  console.log(`  ${tier.name}: ${tier.films.length} films`);
});
