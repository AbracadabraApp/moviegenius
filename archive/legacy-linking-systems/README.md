# Legacy Linking Systems Archive

This directory contains deprecated movie and entity linking systems that were replaced by the V1 production-ready systems.

## Archived on: July 5, 2025

## Reason for Archival
These scripts created confusion in the codebase with multiple similar systems. They have been replaced by two clean V1-ready systems for movie linking.

## What Was Archived

### Old Entity Linking Systems
- `simple-entity-linker.js` - Early entity detection system
- `enhanced-entity-linker.js` - Enhanced version (superseded)
- `entity-linking/` - Complex entity linking directory system
- `entity-linking.backup/` - Backup of old entity system

### Legacy Test Scripts
- `test-movie-linking.js` - Old movie linking test
- `test-link-processing.js` - Old link processing test  
- `test-movie-links.js` - Old movie links test
- `test-complete-linking.js` - Old complete linking test
- `test-link-processing-simple.js` - Old simple link processing test

### Deprecated Utilities
- `proper-names.js` - Deprecated entity detection (line 149 shows it's disabled)
- `nuclear-link-utils.js` - Legacy nuclear linking utilities (different pattern system)

## Current V1 Systems (ACTIVE)

### Episode Linking System
- `lib/episode-movie-linker.js` - Episode movie linking logic
- `scripts/process-episode-links.js` - Batch processing script
- `test-episode-linking.js` - Test script

### Movie Analysis Linking System  
- `lib/movie-analysis-linker.js` - Movie analysis linking logic
- `scripts/process-movie-analysis-links.js` - Batch processing script
- `test-movie-analysis-linking.js` - Database-free test script
- `test-nuclear-static-patterns.js` - Pattern validation script

## Key Differences

### Old Systems
- Multiple competing implementations
- Complex entity detection rules
- Section-based movie lookups
- Search-based URLs
- Inconsistent patterns

### New V1 Systems
- Two focused, standalone systems
- Database-first with TMDB fallback
- Direct `/movie/TMDB_ID` links
- Self-reference prevention
- Consistent **Movie Title** patterns for analysis
- Consistent "Movie Title" (Year) patterns for episodes

## Safety Notes
These files are archived (not deleted) in case any legacy functionality needs to be referenced. However, they should NOT be used in production as they have been superseded by the V1 systems.

## V1 Launch Ready
The current episode and movie analysis linking systems are production-ready and validated for the V1 launch of moviegenius.ai.