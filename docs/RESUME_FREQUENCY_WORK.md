# Resume: Catalog Expansion via Frequency Analysis

**Status:** ⏸️ PAUSED - Waiting for new More Ideas build (expected tomorrow)
**Last Updated:** 2026-05-11

---

## Quick Context

We analyzed recommendation frequency to find catalog gaps. Found **416 high-priority films** (8+ recommendations) not in our catalog, representing **6,704 broken recommendation links**.

---

## When You're Ready to Resume

### 1️⃣ Check if data changed
```bash
# Count more_ideas records
node --env-file=.env.local -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const client = await pool.connect();
  const result = await client.query('SELECT COUNT(*) FROM more_ideas WHERE created_at < \\'2026-05-09\\'');
  console.log('MoreIdeas records:', result.rows[0].count);
  client.release();
  await pool.end();
})();
"
```

If count changed significantly, re-run analysis:
```bash
# Drop table and re-run
psql $DATABASE_URL -c "DROP TABLE IF EXISTS more_ideas_frequency;"
node --env-file=.env.local files/build-frequency-table.js
```

### 2️⃣ Review updated results
```bash
# Check current Tier 1 count
node --env-file=.env.local -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  const client = await pool.connect();
  const tier1 = await client.query('SELECT COUNT(*) FROM more_ideas_frequency WHERE catalog_status=\\'missing\\' AND recommendation_count >= 8');
  const tier2 = await client.query('SELECT COUNT(*) FROM more_ideas_frequency WHERE catalog_status=\\'missing\\' AND recommendation_count BETWEEN 3 AND 7');
  console.log('Tier 1 (8+ recs):', tier1.rows[0].count, 'films');
  console.log('Tier 2 (3-7 recs):', tier2.rows[0].count, 'films');
  client.release();
  await pool.end();
})();
"
```

### 3️⃣ Make decisions

- [ ] Which analysis format? (V2 500-word or V3 200-word)
- [ ] TMDB API tier? (Free or paid)
- [ ] Manual review process? (Review all or confidence threshold)
- [ ] Batch size? (All 416 or split into batches)

### 4️⃣ Start Tier 1 implementation

Create scripts:
1. `scripts/match-missing-to-tmdb.js` - Match 416 films to TMDB
2. `scripts/bulk-add-movies.js` - Insert matched films into catalog
3. Run existing analysis generation pipeline

---

## Key Files

📄 **Full documentation:** `/Users/josh.petersen/moviegenius/docs/FREQUENCY_ANALYSIS_RESULTS.md`

📊 **Output CSVs:** `/Users/josh.petersen/moviegenius/output/`
- `missing_high_frequency.csv` - 293 films (10+ recs)
- `fuzzy_match_review.csv` - 559 films (review matches)
- `missing_long_tail.csv` - 12,590 films (defer)

🔧 **Analysis script:** `/Users/josh.petersen/moviegenius/files/build-frequency-table.js`

💾 **Database table:** `more_ideas_frequency` (42,325 rows)

---

## Quick Stats (as of 2026-05-11)

- **Catalog size:** 32,953 movies
- **Recommendation corpus:** 42,325 unique films
- **Coverage:** 69.6% (29,442 matched)
- **Gap:** 30.4% (12,883 missing)
- **Tier 1 target:** 416 films @ 8+ recs = 6,704 broken links
- **Tier 2 target:** 1,178 films @ 3-7 recs = 4,850 broken links

---

## Questions?

All details in `FREQUENCY_ANALYSIS_RESULTS.md` including:
- Full breakdown by frequency bucket
- Database schema and queries
- Script usage and checkpointing
- Proposed implementation plan
- Cost estimates
- Risk assessment
