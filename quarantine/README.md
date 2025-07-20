# 🗂️ Quarantine Directory

This directory contains obsolete files and legacy code that have been removed
from the active codebase but preserved for reference.

## Why Quarantine?

Rather than deleting potentially valuable code history, we quarantine files
that:

- Are from early development phases and no longer relevant
- Contain architectural patterns that have been superseded
- Represent technical debt that clutters the active codebase

## Directory Structure

### `/legacy-data/`

**Removed:** January 2025  
**Reason:** Early static data architecture superseded by database + TMDB
integration

Contains:

- `afi100.json` - Static AFI 100 movie list from first week of project
- `afi100.backup.json` - Backup of AFI data
- `afi100/` - AFI-related subdirectory
- `media.js` - Legacy media management utility
- `media/[id].js` - Fallback media detail page route

**Why Removed:**

- AFI100 data is from the very first week of development
- Static JSON approach replaced by dynamic TMDB + database architecture
- MediaCard navigation now uses TMDB-first routing (no fallback routes needed)
- Legacy `/media/[id]` route conflicts with modern `/movie/[tmdbId]` pattern

## Safe to Delete?

These files are safe to delete entirely if:

1. No active development needs reference to early architecture patterns
2. Git history provides sufficient code archaeology
3. Disk space cleanup is needed

## Restoration Process

If any quarantined file is needed:

1. Move back to original location
2. Update imports/references
3. Test for compatibility with current architecture
4. Consider modern alternatives before restoration
