# Episode Content Generation Scripts

Add these scripts to your package.json:

```json
{
  "scripts": {
    "generate-episodes": "node scripts/generate-episode-content.js",
    "generate-episodes-single": "node scripts/generate-single-episode.js"
  }
}
```

## Usage

1. **Generate all episodes**: `npm run generate-episodes`
   - Processes all series and episodes in series-config.json
   - Uses concurrency limiting to respect API rate limits
   - Saves static content to `data/episodes/` directory

2. **Generate single episode**:
   `npm run generate-episodes-single -- --series=2 --episode=1`
   - Generates content for a specific episode
   - Useful for testing or regenerating specific content

## Directory Structure

```
data/
├── series-config.json           # Series and episode metadata
└── episodes/                    # Pre-generated episode content
    ├── series-2-episode-1.json  # Static episode content
    ├── series-2-episode-2.json
    └── ...
```

## Benefits

- **Instant loading**: Pages load immediately from static files
- **Dynamic enhancements**: MediaCards still fetch real-time streaming/poster
  data
- **Consistent quality**: All content generated with same high-quality prompts
- **Cost effective**: Generate once, serve many times
- **Cacheable**: Static files can be CDN cached for global performance
