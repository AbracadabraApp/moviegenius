#!/usr/bin/env node

/**
 * Locked Component Integrity Checker
 * 
 * Automatically detects modifications to locked/critical components
 * and validates that essential functionality remains intact.
 * 
 * Usage: node scripts/check-locked-components.js
 * 
 * Exit codes:
 * 0 = All locked components are valid
 * 1 = Critical components have been modified
 * 2 = Script error
 */

const fs = require('fs');
const path = require('path');

// Define locked components and their critical sections
const LOCKED_COMPONENTS = {
  'components/MediaCard.js': {
    lockFile: 'components/MediaCard.LOCK',
    criticalSections: [
      {
        name: 'tmdbId prop in interface',
        pattern: /tmdbId\s*[}),]/,
        required: true,
        errorMsg: 'CRITICAL: tmdbId prop missing from MediaCard interface'
      },
      {
        name: 'handleCardClick navigation',
        pattern: /router\.push\(`\/movie\/\$\{movieTmdbId\}`\)/,
        required: true,
        errorMsg: 'CRITICAL: TMDB ID navigation logic modified in handleCardClick'
      },
      {
        name: 'movieTmdbId state',
        pattern: /const \[movieTmdbId, setMovieTmdbId\]/,
        required: true,
        errorMsg: 'CRITICAL: movieTmdbId state management removed'
      },
      {
        name: 'TMDB ID fallback navigation',
        pattern: /router\.push\(`\/media\/\$\{fallbackId\}`\)/,
        required: true,
        errorMsg: 'CRITICAL: Fallback navigation logic removed'
      },
      {
        name: 'Marketing slug length validation (75 chars)',
        pattern: /slug\.length <= 75/,
        required: true,
        errorMsg: 'CRITICAL: Marketing slug length limit modified - should be 75 characters'
      },
      {
        name: 'TMDB plot summary rejection',
        pattern: /!slug\.includes\('Plot:'\)/,
        required: true,
        errorMsg: 'CRITICAL: TMDB plot summary protection removed - preserves marketing copy'
      },
      {
        name: 'Concise marketing tagline preference',
        pattern: /preferConcise: true/,
        required: true,
        errorMsg: 'CRITICAL: Concise marketing tagline preference removed from API calls'
      },
      {
        name: 'Marketing slug display spacing',
        pattern: /marginTop: '2px'/,
        required: true,
        errorMsg: 'CRITICAL: Marketing slug spacing modified - should be 2px for taglines'
      }
    ]
  },
  'components/FilmLoadingMessage.js': {
    lockFile: null,
    criticalSections: [
      {
        name: 'No technical message exposure',
        pattern: /film-themed messages from loading-messages\.json/,
        required: true,
        errorMsg: 'CRITICAL: FilmLoadingMessage component modified to allow technical messages'
      },
      {
        name: 'Film-themed icons only',
        pattern: /film-movie-reel-icon\.png/,
        required: true,
        errorMsg: 'CRITICAL: Core film icons removed from loading system'
      }
    ]
  },
  'pages/movie/[id].js': {
    lockFile: null, // No dedicated lock file yet
    criticalSections: [
      {
        name: 'MediaCard tmdbId prop passing',
        pattern: /tmdbId=\{movie\.tmdb_id\}/,
        required: true,
        errorMsg: 'CRITICAL: MediaCard not receiving tmdb_id prop in movie detail page'
      },
      {
        name: 'Movie object tmdb_id field',
        pattern: /tmdb_id:\s*(null|data\.tmdb_id)/,
        required: true,
        errorMsg: 'CRITICAL: Movie objects missing tmdb_id field in parsing functions'
      },
      {
        name: 'No TMDB technical messages',
        pattern: /(?!.*Fetching.*TMDB)/,
        required: true,
        errorMsg: 'CRITICAL: Technical TMDB message exposed to users - use film-themed messages'
      },
      {
        name: 'Film-themed loading messages',
        pattern: /(Consulting the film|Diving into the vault)/,
        required: true,
        errorMsg: 'CRITICAL: Loading messages not using film-themed content'
      }
    ]
  }
};

class ComponentIntegrityChecker {
  constructor() {
    this.results = {
      checked: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  checkComponent(componentPath, config) {
    console.log(`\n🔍 Checking locked component: ${componentPath}`);
    
    if (!fs.existsSync(componentPath)) {
      this.results.errors.push(`❌ Component file not found: ${componentPath}`);
      this.results.failed++;
      return false;
    }

    const content = fs.readFileSync(componentPath, 'utf8');
    let componentPassed = true;

    // Check if lock file exists and is recent
    if (config.lockFile) {
      if (!fs.existsSync(config.lockFile)) {
        this.results.errors.push(`⚠️  Lock file missing: ${config.lockFile}`);
      } else {
        console.log(`✅ Lock file present: ${config.lockFile}`);
      }
    }

    // Check each critical section
    for (const section of config.criticalSections) {
      const found = section.pattern.test(content);
      
      if (section.required && !found) {
        this.results.errors.push(`❌ ${section.errorMsg}`);
        componentPassed = false;
      } else if (found) {
        console.log(`✅ ${section.name} - OK`);
      }
    }

    this.results.checked++;
    if (componentPassed) {
      this.results.passed++;
      console.log(`✅ ${componentPath} - All critical sections intact`);
    } else {
      this.results.failed++;
      console.log(`❌ ${componentPath} - Critical sections modified`);
    }

    return componentPassed;
  }

  async run() {
    console.log('🔒 MovieGenius Locked Component Integrity Check');
    console.log('═════════════════════════════════════════════\n');

    let allPassed = true;

    for (const [componentPath, config] of Object.entries(LOCKED_COMPONENTS)) {
      const passed = this.checkComponent(componentPath, config);
      if (!passed) {
        allPassed = false;
      }
    }

    console.log('\n📊 Check Results:');
    console.log('═════════════════');
    console.log(`Checked: ${this.results.checked}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);

    if (this.results.errors.length > 0) {
      console.log('\n🚨 Issues Found:');
      this.results.errors.forEach(error => console.log(`   ${error}`));
    }

    if (allPassed) {
      console.log('\n🎉 All locked components are intact!');
      process.exit(0);
    } else {
      console.log('\n💥 CRITICAL: Locked components have been modified!');
      console.log('\n🔧 Recommended Actions:');
      console.log('1. Review changes to locked components');
      console.log('2. Restore from backup if navigation is broken');
      console.log('3. Test movie page navigation thoroughly');
      console.log('4. Check MediaCard.LOCK for change protocol');
      
      process.exit(1);
    }
  }
}

// Run the checker if called directly
if (require.main === module) {
  const checker = new ComponentIntegrityChecker();
  checker.run().catch(error => {
    console.error('Script error:', error);
    process.exit(2);
  });
}

module.exports = ComponentIntegrityChecker;