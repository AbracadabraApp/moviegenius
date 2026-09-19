import fs from 'fs';

// Read current genius_data.json
const inputPath = 'ios/moviegenius/moviegenius/Resources/genius_data.json';
const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

console.log('Adding schemaVersion and order fields...');

// Tier order mapping
const tierOrder = {
  'Essential': 0,
  'Foundational': 1,
  'Connoisseur': 2,
  'Specialist': 3,
  'Genius': 4
};

// Add schemaVersion at root and order to each tier
const newData = {
  schemaVersion: 1,
  categories: data.categories.map(category => ({
    category: category.category,
    tiers: category.tiers.map(tier => ({
      name: tier.name,
      order: tierOrder[tier.name],
      films: tier.films
    }))
  }))
};

// Backup original
const backupPath = inputPath + '.backup-no-schema';
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
console.log(`✅ Backup created: ${backupPath}`);

// Write updated data
fs.writeFileSync(inputPath, JSON.stringify(newData, null, 2));
console.log(`✅ Updated data written: ${inputPath}`);
console.log(`   - Added schemaVersion: 1`);
console.log(`   - Added order field to all tiers`);
