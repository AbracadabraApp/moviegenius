#!/usr/bin/env node
/**
 * Test link processing with actual nuclear static data
 */

import fs from 'fs';
import {
  buildMovieLookup,
  processTextLinks,
  validateStaticData,
} from './lib/utils/nuclear-link-utils.js';

// Load City Lights nuclear static file
const cityLightsPath = './nuclear-static/901.json';
const cityLights = JSON.parse(fs.readFileSync(cityLightsPath, 'utf8'));

console.log('🧪 Testing Link Processing');
console.log('===========================\n');

console.log('📄 Original City Lights data:');
console.log(`Title: ${cityLights.props.title}`);
console.log(`Sections: ${cityLights.props.sections.length}`);

// Find text sections with movie mentions
const textSections = cityLights.props.sections.filter(s => s.type === 'text');
console.log(`\n📝 Text sections: ${textSections.length}`);

textSections.forEach((section, index) => {
  console.log(`\nSection ${index}:`);
  console.log(section.content.substring(0, 200) + '...');

  const movieMentions = section.content.match(/\*\*[^*]+\*\* \(\d{4}\)/g);
  if (movieMentions) {
    console.log(`🎬 Movie mentions: ${movieMentions.join(', ')}`);
  }
});

// Build movie lookup from sections
console.log('\n🔍 Building movie lookup...');
const movieLookup = buildMovieLookup(cityLights.props.sections, cityLights.props.title);
console.log(`Built lookup with ${movieLookup.size} movies`);

// Show lookup contents
console.log('\n📚 Movie lookup contents:');
for (const [key, value] of movieLookup) {
  console.log(`  "${key}" -> ${value.title} (TMDB: ${value.tmdb_id})`);
}

// Process text links
console.log('\n🔄 Processing text links...');
const processedSections = cityLights.props.sections.map(section => {
  if (section.type === 'text' && section.content) {
    const original = section.content;
    const processed = processTextLinks(section.content, movieLookup, cityLights.props.title);

    if (original !== processed) {
      console.log(`\n✏️  Section processed:`);
      console.log(`Before: ${original.substring(0, 100)}...`);
      console.log(`After:  ${processed.substring(0, 100)}...`);
    }

    return {
      ...section,
      content: processed,
    };
  }
  return section;
});

// Create processed static data
const processedData = {
  ...cityLights,
  props: {
    ...cityLights.props,
    sections: processedSections,
  },
};

// Validate the processed data
console.log('\n✅ Validating processed data...');
const validation = validateStaticData(processedData, cityLights.props.title);
console.log(`Valid: ${validation.valid}`);
if (!validation.valid) {
  console.log('Issues:');
  validation.issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('🎉 All validation checks passed!');
}
