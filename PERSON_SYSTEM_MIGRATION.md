# Person System Migration: From Names to IDs

This document describes the migration from a name-based person system to a simple ID-based system.

## Overview

**Before**: Person URLs used name slugs like `/person/christopher-nolan`
**After**: Person URLs use numeric IDs like `/person/12345`

## Key Design Principles

1. **Simplicity**: No complex deduplication algorithms or confidence scoring
2. **Unique IDs**: Each person gets a unique numeric identifier
3. **No Merging**: Different people with the same name become separate records
4. **Backward Compatibility**: Legacy name-based API calls still work during transition

## Database Changes

### New Tables

#### `persons` Table
```sql
CREATE TABLE persons (
    id SERIAL PRIMARY KEY,           -- Unique numeric ID for URLs
    name VARCHAR(255) NOT NULL,      -- Person name as-is, no normalization
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Modified Tables

#### `movie_contributors` Table
- **Added**: `person_id INTEGER` column with foreign key to `persons.id`
- **Kept**: `person_name` column for backward compatibility and rollback
- **Updated**: Unique constraint now uses `(movie_tmdb_id, person_id, role)`

## Migration Process

### 1. Run Migration Script
```bash
node scripts/execute-person-migration.js
```

This script:
- Creates the `persons` table
- Populates it with unique names from `movie_contributors`
- Adds `person_id` column to `movie_contributors`
- Updates all `movie_contributors` records with person IDs
- Creates necessary indexes and constraints

### 2. Verify Migration
```bash
node scripts/test-person-system.js
```

### 3. Rollback (if needed)
```bash
psql $DATABASE_URL -f scripts/rollback-person-migration.sql
```

## URL Changes

### Before (Name-based)
```
/person/christopher-nolan
/person/martin-scorsese
/person/quentin-tarantino
```

### After (ID-based)
```
/person/1
/person/2  
/person/3
```

## API Changes

### New ID-based API
```javascript
// Fetch person by ID (preferred)
const response = await fetch('/api/person-movies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ personId: 123 })
});
```

### Legacy Name-based API (still works)
```javascript
// Fetch person by name (legacy support)
const response = await fetch('/api/person-movies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ personName: "Christopher Nolan" })
});
```

## Response Format

### ID-based Response
```json
{
  "person": {
    "id": 123,
    "name": "Christopher Nolan",
    "movieCount": 11,
    "roles": ["director", "writer"]
  },
  "movies": [...],
  "source": "id_based_system"
}
```

### Name-based Response (legacy)
```json
{
  "personName": "Christopher Nolan",
  "movies": [...],
  "stats": {
    "movieCount": 11,
    "roles": ["director", "writer"]
  },
  "source": "legacy_name_based_system"
}
```

## Benefits of ID-based System

1. **No Name Conflicts**: Different people with same names get unique IDs
2. **Stable URLs**: Person URLs don't break if names change or have typos
3. **Simple Lookups**: Direct primary key lookups instead of string matching
4. **Scalable**: No complex deduplication logic to maintain
5. **Clear Separation**: Each person record is independent

## Potential Issues Resolved

### Before (Name-based Problems)
- `Christopher Nolan` and `christopher nolan` were different people
- Typos in names created duplicate person pages
- People with identical names were merged incorrectly
- Name-based URLs were fragile

### After (ID-based Solutions) 
- Each person gets unique ID regardless of name variations
- Typos just create separate person records (simple and safe)
- People with identical names are naturally separate
- Numeric URLs are stable and predictable

## File Changes Summary

### Created Files
- `scripts/create-persons-table.sql` - Schema for persons table
- `scripts/migrate-to-person-ids.sql` - Complete migration script
- `scripts/execute-person-migration.js` - Migration runner with validation
- `scripts/rollback-person-migration.sql` - Rollback script
- `scripts/test-person-system.js` - Testing and verification script

### Modified Files
- `pages/person/[id].js` - Updated to use numeric IDs only
- `pages/api/person-movies.js` - Supports both ID and name lookups

## Testing

After migration, test these scenarios:

1. **Valid person ID**: `/person/1` should show person details
2. **Invalid person ID**: `/person/99999` should show "Person not found"
3. **Non-numeric ID**: `/person/christopher-nolan` should show "Invalid Person ID"
4. **API with personId**: Should return person data with new format
5. **API with personName**: Should return data with legacy format

## Future Cleanup

After confirming the system works:

1. Remove `person_name` column from `movie_contributors` table
2. Update any remaining code that uses name-based person lookups
3. Add person search functionality if needed

## Rollback Plan

If issues arise:
1. Run `scripts/rollback-person-migration.sql`
2. Revert code changes to `pages/person/[id].js` and `pages/api/person-movies.js`
3. The system will be back to name-based URLs

The rollback is safe because we kept the `person_name` column during migration.