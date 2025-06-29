# Quarantine Directory

This directory contains code that has been retired or is under review.

## Entity Linking System (Retired June 2025)

**Reason for Retirement:** Complex entity linking system was designed for comprehensive movie databases, but our database only covers ~2% of all films. The system created performance issues and false positives while missing most valid movie references.

**Replaced with:** Simple format-based linking using `**Movie Title** (Year)` pattern from Claude responses, combined with TMDB-first movie discovery.

**Files moved:**
- `entity-linking/` - Complete entity linking system
  - `MovieRegistry.js` - Movie detection and linking (500+ lines)
  - `EntityDetector.js` - Unified entity detection (600+ lines)  
  - `PersonRegistry.js` - Person name detection
  - `EntityConfig.js` - Configuration system
  - `SlugGenerator.js` - Slug generation utilities
  - `moderate-config.json` - Configuration presets
- `verify-movie.js` - Database verification API endpoint

**Note:** These files can be restored if architectural decisions change, but the simple format-based approach better matches our current database coverage and performance requirements.