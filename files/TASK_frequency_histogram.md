# Task: MoreIdeas Recommendation Frequency Histogram

## Goal

Count how often each unique (title, year) pair appears as a recommendation across
all MoreIdeas records. Use the resulting frequency distribution to prioritize
which missing films to investigate, match, or add to the catalog.

## Why this matters

MovieGenius optimizes for foreign and obscure film discovery. The 30% of MoreIdeas
recommendations that don't match our catalog are a mix of:

1. Films we have but can't match (matcher bugs — already being addressed)
2. Films we should add to the catalog (the interesting category)
3. Genuinely long-tail films we may not need (correct rejections)

Recommendation frequency is the cheapest signal to separate these. A film
recommended 50 times across the corpus matters more than one recommended once,
regardless of its objective popularity. The histogram tells us where to spend
effort.

## Deliverable

A `more_ideas_frequency` table plus three CSV exports, ranked by occurrence
count. Plus a one-paragraph human summary after manual classification of the
top 50 missing films.

## Constraints

- Do not modify `more_ideas` or `movies` — read-only against both.
  `more_ideas_frequency` is a new table.
- Do not auto-resolve missing films via web lookup in this pass. Just produce
  the data.
- If `more_ideas` has >1M rows, add an index on `created_at` if it doesn't
  exist, but don't optimize further unless it times out.
- Cutoff date `'2026-05-09'` matches the existing test script. Keep it
  consistent so numbers are comparable.
- Reuse the existing `normalizeTitle` function from `lib/search-matching.js`.
  Do not reimplement it in SQL.

---

## Observability requirements (applies to every script in this task)

Every script must report progress continuously. No silent runs. The operator
should be able to tell, at any moment, whether the script is making progress,
how far along it is, and roughly when it will finish.

### 1. Pre-flight summary

Before doing work, print what's about to happen:

```
[12:04:31] Starting recommendation frequency analysis
[12:04:31] Source: more_ideas table, created_at < '2026-05-09'
[12:04:31] Estimated rows to process: 42,325
[12:04:31] Batch size: 5,000
[12:04:31] Estimated batches: 9
```

If the script can't estimate up front, say so explicitly:
*"Row count unknown — will report after first batch."* Never start work silently.

### 2. Heartbeat every 5 seconds OR every batch, whichever is more frequent

Long-running queries with no output look identical to hung queries. For pure SQL
operations that take >10 seconds, wrap them in a Node script that logs before
and after.

For batched loops, log every batch:

```
[12:04:35] Batch 1/9 complete — 5,000/42,325 (11.8%) — 4.2s — ETA 12:05:13
[12:04:39] Batch 2/9 complete — 10,000/42,325 (23.6%) — 4.1s — ETA 12:05:10
[12:04:43] Batch 3/9 complete — 15,000/42,325 (35.4%) — 4.0s — ETA 12:05:08
```

ETA recalculates each batch from a rolling average of the last 3 batches, not
the cumulative average. If batches are getting slower, the ETA should reflect
that.

### 3. Checkpoints to disk

Every batch writes its results to a checkpoint file before moving on:

```
checkpoints/frequency_analysis_batch_03.json
```

If the script dies, restarting it resumes from the last completed checkpoint.
The script reads `checkpoints/` on startup, finds the highest completed batch
number, and starts from the next one.

For SQL-side work where checkpointing rows is awkward, checkpoint by ID range:
store `{last_processed_id: 28000, batch: 6, ts: '...'}` and resume with
`WHERE id > 28000`.

### 4. Final summary

At the end, print a structured summary:

```
[12:05:14] === Complete ===
[12:05:14] Total time: 43.2s
[12:05:14] Rows processed: 42,325
[12:05:14] Rows output: 18,712 unique (title, year) pairs
[12:05:14] Catalog status breakdown:
[12:05:14]   exact_match: 11,203 (59.9%)
[12:05:14]   normalized_match: 1,847 (9.9%)
[12:05:14]   fuzzy_year_match: 312 (1.7%)
[12:05:14]   missing: 5,350 (28.6%)
[12:05:14] Output files:
[12:05:14]   missing_high_frequency.csv (412 rows)
[12:05:14]   fuzzy_match_review.csv (89 rows)
[12:05:14]   missing_long_tail.csv (4,938 rows)
```

### 5. Errors are visible, not buried

If a row fails to process, log it inline:

```
[12:04:47] WARN batch 4 row 23: NULL year for title='Stalker' — skipping
```

Don't swallow exceptions into a counter. Every error gets a line. If the error
rate exceeds 1%, abort and surface the problem.

### 6. Make `tail -f` work

All output goes to stdout, flushed line-by-line. Operator should be able to run:

```bash
node scripts/frequency-analysis.js | tee logs/frequency-$(date +%s).log
```

…and watch it live or check the log afterwards. No log rotation, no fancy
spinners, no progress bars that only work in a TTY. Plain timestamped lines.

### 7. Long DB queries get their own treatment

If a single query is expected to take >30 seconds, wrap it:

```
[12:04:31] Running source extraction query (expected 30-60s)...
[12:05:08] Query complete — 42,325 rows returned in 37.2s
```

Kick off a background `setInterval` that prints
`[12:04:51] still waiting on extraction query... (20s elapsed)` every 10s while
the query runs.

### Anti-patterns to avoid

- Single `console.log("Done!")` at the end of a 20-minute script
- Progress bars that only update in TTY mode
- Logging only failures, not successes
- Counting in memory and reporting at the end (lost on crash)
- `console.log` from inside `Promise.all` over thousands of items

---

## Implementation steps

### Step 1: Build the frequency table

```sql
CREATE TABLE more_ideas_frequency AS
SELECT
  (idea->>'title')::text AS title,
  (idea->>'year')::integer AS year,
  COUNT(*) AS recommendation_count,
  COUNT(DISTINCT more_ideas.id) AS distinct_source_count
FROM more_ideas,
     jsonb_array_elements(ideas) AS idea
WHERE created_at < '2026-05-09'
  AND idea->>'title' IS NOT NULL
GROUP BY title, year
ORDER BY recommendation_count DESC;

CREATE INDEX idx_more_ideas_freq_count
  ON more_ideas_frequency (recommendation_count DESC);
CREATE INDEX idx_more_ideas_freq_title_year
  ON more_ideas_frequency (title, year);
```

`recommendation_count` counts every appearance. `distinct_source_count` counts
how many MoreIdeas records mention it — if a film appears 100 times but always
within the same 3 source records, that's a different signal than 100 times
across 100 sources.

### Step 2: Add title_normalized to the frequency table (Node script)

The normalize function lives in JS. Don't recreate it in SQL. Add a column,
populate from application code.

```sql
ALTER TABLE more_ideas_frequency ADD COLUMN title_normalized TEXT;
ALTER TABLE more_ideas_frequency ADD COLUMN catalog_status TEXT;
CREATE INDEX idx_more_ideas_freq_normalized
  ON more_ideas_frequency (title_normalized);
```

Then run `scripts/backfill-frequency-normalized.js` (see below).

### Step 3: Classify each row by catalog status

Once `title_normalized` is populated on `more_ideas_frequency`, run the
classification query. This depends on `movies.title_normalized` already
existing (separate migration from earlier work).

```sql
UPDATE more_ideas_frequency mif
SET catalog_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM movies m
    WHERE LOWER(m.title) = LOWER(mif.title) AND m.year = mif.year
  ) THEN 'exact_match'
  WHEN EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title_normalized = mif.title_normalized AND m.year = mif.year
  ) THEN 'normalized_match'
  WHEN EXISTS (
    SELECT 1 FROM movies m
    WHERE m.title_normalized = mif.title_normalized
      AND m.year BETWEEN mif.year - 1 AND mif.year + 1
  ) THEN 'fuzzy_year_match'
  ELSE 'missing'
END;
```

For tables larger than ~100K rows, batch this UPDATE by ID range and log
progress (per observability requirements).

### Step 4: Generate the histogram report

```sql
SELECT
  catalog_status,
  CASE
    WHEN recommendation_count = 1 THEN '1'
    WHEN recommendation_count BETWEEN 2 AND 5 THEN '2-5'
    WHEN recommendation_count BETWEEN 6 AND 20 THEN '6-20'
    WHEN recommendation_count BETWEEN 21 AND 50 THEN '21-50'
    WHEN recommendation_count BETWEEN 51 AND 100 THEN '51-100'
    ELSE '100+'
  END AS frequency_bucket,
  COUNT(*) AS film_count
FROM more_ideas_frequency
GROUP BY catalog_status, frequency_bucket
ORDER BY catalog_status, MIN(recommendation_count);
```

Note: bucket cutoffs are guesses. After seeing the actual distribution, adjust
them. If everything clusters at "1-3 times" or "200+ times" with nothing in
between, the buckets should change.

### Step 5: Export priority lists

Three CSVs, ranked by `recommendation_count` descending:

1. **`missing_high_frequency.csv`** — `catalog_status = 'missing'`
   AND `recommendation_count >= 10`. The catalog gaps that matter.

2. **`fuzzy_match_review.csv`** — `catalog_status = 'fuzzy_year_match'`
   AND `recommendation_count >= 5`. Spot-check for correctness. Include both
   the recommendation's (title, year) and the matched movie's (title, year).

3. **`missing_long_tail.csv`** — `catalog_status = 'missing'`
   AND `recommendation_count < 10`. Don't act now, keep for later.

### Step 6: Manual classification (the only step that produces real information)

For the top 50 rows of `missing_high_frequency.csv`, classify each by hand:

- **In catalog under different title** — localization issue (e.g., "La Haine"
  vs "Hate"). Fixable by alternate-titles table or TMDB title lookup.
- **In catalog under different year** — year drift beyond ±1. May warrant
  widening the fuzzy window.
- **In catalog but TV show** — shouldn't be recommended. Upstream prompt fix.
- **Not in catalog, want to add** — feed into catalog expansion pipeline.
- **Not in catalog, decline** — out of scope (TV, short film, unreleased, etc.).
- **Not a real film** — LLM hallucination. Track frequency.

Output: a 50-row spreadsheet plus a one-paragraph summary of the distribution.
That summary tells us whether the bottleneck is the matcher, the catalog, or
the prompt.

---

## Definition of done

- `more_ideas_frequency` table exists, populated, classified.
- Three CSVs generated.
- Histogram report run, output captured.
- Top 50 manual classification complete with summary paragraph.

---

## Scripts to implement

Two Node scripts. Both follow the observability requirements above.

### `scripts/build-frequency-table.js`

Builds and populates `more_ideas_frequency` end-to-end:

1. Runs the SQL from Step 1 (with progress logging — the
   `jsonb_array_elements` extract on 42K+ recommendations can be slow).
2. Adds `title_normalized` and `catalog_status` columns (Step 2).
3. Imports `normalizeTitle` from `lib/search-matching.js`. Reads rows in
   batches of 5,000, computes normalized title, writes back. Checkpoints
   after each batch.
4. Runs the classification UPDATE (Step 3), batched if needed.
5. Generates the three CSVs (Step 5).
6. Prints the histogram report (Step 4) and final summary.

### `scripts/frequency-resume.js` (optional helper)

Reads `checkpoints/` directory, prints status of last run:

```
Last run: 2026-05-11 12:04:31
Completed batches: 3/9
Last processed: row 15,000
To resume: node scripts/build-frequency-table.js --resume
```

Useful if a long run dies and the operator wants to know where it stopped
before deciding whether to resume or restart.
