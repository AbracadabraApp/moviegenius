# Browse Collections Configuration

## Changing the Collection Size Threshold

The browse data transformation script supports a configurable `MIN_MOVIES` threshold to control which collections are included in the database.

### Current Setting
**Default: ≥4 movies per collection** → 3,488 collections

### Available Options

| Threshold | Collections | % of Total | Notes |
|-----------|-------------|------------|-------|
| ≥3 movies | 4,127 | 38.3% | Maximum coverage, some incomplete sets |
| ≥4 movies | 3,488 | 32.4% | **Current default** - Good balance |
| ≥5 movies | 3,095 | 28.7% | Higher quality threshold |
| ≥6 movies | 2,807 | 26.1% | Production-ready threshold |
| ≥8 movies | 2,388 | 22.2% | Well-developed collections only |
| ≥10 movies | 2,111 | 19.6% | Substantial collections only |

### How to Change the Threshold

#### Method 1: Command Line Argument
```bash
node scripts/transform-browse-data.js 3    # Use ≥3 movies
node scripts/transform-browse-data.js 6    # Use ≥6 movies
```

#### Method 2: Environment Variable
```bash
MIN_MOVIES=3 node scripts/transform-browse-data.js
MIN_MOVIES=6 node scripts/transform-browse-data.js
```

#### Method 3: Edit the Script
Open `scripts/transform-browse-data.js` and change the default:
```javascript
const MIN_MOVIES = parseInt(process.env.MIN_MOVIES || process.argv[2] || '4');
//                                                                       ↑ Change this number
```

### Current Results (≥4 movies)
- **3,488 collections** across 35 genres
- **101,718 movie assignments**
- Covers major thematic groupings while maintaining quality

### Re-running the Import

To change the threshold and re-import data:

1. Run transform script with new threshold:
   ```bash
   node scripts/transform-browse-data.js 3
   ```

2. Clear existing browse data from database (if needed):
   ```sql
   TRUNCATE browse_lists CASCADE;
   ```

3. Run database insertion script with new data

### Recommendation

- **Start with ≥4**: Good balance of coverage and quality
- **Monitor search behavior**: If users frequently get no results, lower to ≥3
- **Optimize over time**: Can increase to ≥5 or ≥6 if quality issues arise
