# Episode Migration Guide

This guide covers the migration of Genius episode content from JSON files to database storage, improving scalability, performance, and management capabilities.

## Migration Overview

The migration moves episode content from:
- **From**: Individual JSON files in `/data/episodes/`
- **To**: PostgreSQL database table with JSONB content storage
- **Benefit**: Better performance, caching, and content management

## Database Schema

### Episodes Table Structure

```sql
CREATE TABLE episodes (
    id SERIAL PRIMARY KEY,
    theme_id INTEGER NOT NULL,
    series_id INTEGER NOT NULL,
    episode_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    content JSONB NOT NULL,
    hero_image TEXT,
    generated_at TIMESTAMP,
    version TEXT,
    locked BOOLEAN DEFAULT false,
    locked_at TIMESTAMP,
    locked_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT episodes_unique_key UNIQUE(theme_id, series_id, episode_id)
);
```

### Key Features

- **JSONB content**: Efficient storage and querying of episode content
- **Locking mechanism**: Prevents accidental content regeneration
- **Automatic timestamps**: Tracks creation and modification
- **Unique constraints**: Ensures no duplicate episodes
- **GIN indexes**: Fast content searches

## Migration Process

### 1. Set Up Database Schema

First, create the episodes table and indexes:

```bash
# Apply the schema (adjust connection details as needed)
psql $DATABASE_URL -f scripts/episodes-schema.sql
```

### 2. Run Migration Script

The migration script transfers all JSON files to the database:

```bash
# Dry run to see what would be migrated
node scripts/migrate-episodes-to-db.js --dry-run

# Perform actual migration
node scripts/migrate-episodes-to-db.js

# Force overwrite existing episodes
node scripts/migrate-episodes-to-db.js --force
```

### 3. Test Migration

Verify the migration was successful:

```bash
# Run comprehensive tests
node scripts/test-episode-migration.js
```

### 4. Monitor Application

The application now uses database-first loading with file system fallback:

- Database queries are cached using Redis
- File system fallback ensures backward compatibility
- Detailed logging shows data source for each episode

## API Changes

### Episode Loading

The episode loading now follows this priority:

1. **Database first**: Query episodes table
2. **File fallback**: Read JSON files if database fails
3. **Error handling**: Graceful degradation with detailed logging

### Caching Strategy

Episodes are cached with the following TTL:
- **Episode content**: 24 hours (same as movie analysis)
- **Episode lists**: 1 hour (for theme/series listings)
- **Cache invalidation**: Automatic when episodes are updated

## File Structure

```
moviegenius/
├── data/
│   ├── episodes/           # Legacy JSON files (kept as backup)
│   └── genius-config.json  # Episode metadata configuration
├── lib/
│   ├── supabase.js        # Database services (EpisodeService added)
│   └── cache.js           # Caching (episode methods added)
├── pages/
│   ├── genius/[...params].js  # Updated to use database
│   └── api/series-episode.js  # Updated with database queries
└── scripts/
    ├── episodes-schema.sql           # Database schema
    ├── migrate-episodes-to-db.js     # Migration script
    └── test-episode-migration.js     # Test suite
```

## New Database Services

### EpisodeService Methods

```javascript
import { EpisodeService } from '../lib/supabase.js';

// Get specific episode
const episode = await EpisodeService.getEpisode(themeId, seriesId, episodeId);

// Get all episodes for a series
const episodes = await EpisodeService.getEpisodesBySeries(themeId, seriesId);

// Search episodes
const results = await EpisodeService.searchEpisodes('noir');

// Lock/unlock episodes
await EpisodeService.lockEpisode(themeId, seriesId, episodeId, 'user');
await EpisodeService.unlockEpisode(themeId, seriesId, episodeId);

// Insert/update episode
await EpisodeService.upsertEpisode(episodeData);
```

### Cache Service Methods

```javascript
import { getCache } from '../lib/cache.js';

const cache = getCache();

// Cache episode content
const content = await cache.cacheEpisodeContent(themeId, seriesId, episodeId, async () => {
    return await EpisodeService.getEpisode(themeId, seriesId, episodeId);
});

// Invalidate episode caches
await cache.invalidateEpisodeCache(themeId, seriesId, episodeId);
await cache.invalidateSeriesCache(themeId, seriesId);
await cache.invalidateThemeCache(themeId);
```

## Rollback Strategy

If issues arise, you can quickly rollback:

1. **Feature flag**: Set `USE_FILE_EPISODES=true` in environment
2. **Database disable**: The file system fallback will handle all requests
3. **Code rollback**: Revert to previous commit if needed

The JSON files remain untouched during migration as a safety backup.

## Performance Benefits

### Before Migration (File System)
- Build time increases with episode count
- No caching of episode content
- File I/O during static generation
- Difficult content management

### After Migration (Database)
- Constant build time regardless of episode count
- Redis caching with configurable TTL
- Efficient database queries with indexes
- Easy content updates without rebuilds

## Monitoring

### Success Indicators
- All episodes load without errors
- Database queries are cached effectively
- No file system fallbacks during normal operation
- Fast page generation times

### Warning Signs
- Frequent database connection errors
- High file system fallback usage
- Slow episode page loading
- Cache misses above 10%

## Troubleshooting

### Common Issues

**Episode not found in database**
- Check if migration completed successfully
- Verify theme/series/episode ID mapping
- Check database connectivity

**Slow episode loading**
- Monitor Redis cache hit rates
- Check database query performance
- Verify indexes are created

**Lock-related errors**
- Check episode lock status in database
- Use `--force` flag if needed for regeneration
- Verify lock timestamps are reasonable

### Debug Commands

```bash
# Check episode count
echo "SELECT theme_id, series_id, COUNT(*) FROM episodes GROUP BY theme_id, series_id;" | psql $DATABASE_URL

# Check locked episodes
echo "SELECT theme_id, series_id, episode_id, title, locked_by FROM episodes WHERE locked = true;" | psql $DATABASE_URL

# Check recent episodes
echo "SELECT theme_id, series_id, episode_id, title, created_at FROM episodes ORDER BY created_at DESC LIMIT 10;" | psql $DATABASE_URL
```

## Future Enhancements

With episodes in the database, future improvements become possible:

1. **Content versioning**: Track episode content changes over time
2. **Collaborative editing**: Multiple users can safely edit episodes
3. **Analytics**: Track popular episodes and content performance
4. **A/B testing**: Test different episode content variations
5. **Automated updates**: Regenerate episodes based on triggers
6. **Content validation**: Ensure episode quality and consistency

This migration provides a solid foundation for scaling the Genius educational content system.