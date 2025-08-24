# Browse Build Process

The Browse Build Process generates raw thematic movie collections using AI analysis. This process is **separate** from the Production Browse System and serves as the content generation pipeline that feeds the production system.

## Process Overview

The Build Process transforms genre-categorized movies into thematic collections through AI-powered analysis. The output requires filtering and curation before becoming production-ready browse collections.

### Key Principles

- **Volume over precision**: Generate comprehensive thematic coverage
- **Genre-focused**: Process one genre at a time for thematic coherence  
- **Sequential processing**: One movie at a time to avoid timeouts
- **Cost-optimized**: Use batch API and prompt caching for efficiency

## System Architecture

### Input Data Flow
```
Genre Selection → Movie Categorization → Build Process → Raw Collections
```

1. **Genre Selection**: Choose genre to process (Drama, Comedy, Musical, etc.)
2. **Movie Categorization**: Load movie UUIDs from categorization data  
3. **Build Processing**: Generate thematic collections via AI analysis
4. **Output Generation**: Raw collection data in JSON format

### Processing Pipeline

#### Stage 1: Data Preparation
```javascript
// Load genre movies from categorization
const categoryData = JSON.parse(fs.readFileSync('movie-categorization.json'));
const movieUuids = categoryData.categories[genre]; // e.g., 9,531 Drama movies

// Create processing batches (100 movies per batch)
const batches = chunkArray(movieUuids, 100);
```

#### Stage 2: Sequential AI Processing
```javascript
// Process each movie individually against ALL existing collections
for (const movie of movies) {
  const prompt = buildPrompt(movie, allExistingCollections);
  const response = await callClaudeAPI(prompt);
  
  // Parse response: existing collection assignments + new collections
  updateCollections(response.assignments, response.newCollections);
}
```

#### Stage 3: Build Output Generation
```json
{
  "category": "Musical",
  "method": "sequential-processing",
  "totalLists": 501,
  "totalMoviesProcessed": 555,
  "totalCost": 3.37,
  "allLists": [
    {
      "name": "Early Sound Revolution Films",
      "movieIds": ["uuid1", "uuid2", ...],
      "createdAt": "2025-08-20T21:57:04.271Z"
    }
  ]
}
```

## Core Components

### Browse Collection Generator
**File**: `browse-collection-generator.js` (renamed from production-list-analyzer.js)
**Purpose**: Main processing engine for generating thematic collections

#### Key Features
- **Sequential processing**: Avoids batch timeout issues
- **Context management**: Maintains full collection context for quality
- **Progress tracking**: Resumable processing with saved state
- **Cost monitoring**: Real-time API cost tracking

#### Configuration
```javascript
const CONFIG = {
  USE_BATCH_API: false,          // Disable for sequential processing
  BATCH_SIZE: 1,                 // Process one movie at a time  
  MAX_RETRIES: 3,               // Retry failed movies
  SAVE_INTERVAL: 10,            // Save progress every N movies
  CONCURRENT_MOVIES: 1,         // No concurrency to avoid timeouts
  USE_PROMPT_CACHING: true      // Enable for cost savings
};
```

### Genre Automation System
**File**: `genre-browse-automation.js` (renamed from multi-genre-automation.js)
**Purpose**: Orchestrate build process across multiple genres

#### Processing Strategy
```javascript
// Sequential genre processing
const GENRES = ['Musical', 'Comedy', 'Drama', 'Action', 'Horror'];

for (const genre of GENRES) {
  console.log(`Starting ${genre} build process...`);
  
  // Run browse collection generator
  await runBuildProcess(genre);
  
  // Apply post-processing filters
  await filterBuildOutput(genre);
  
  console.log(`${genre} build complete.`);
}
```

## AI Prompt Engineering

### Collection Assignment Prompt
```
You are a film curator organizing [GENRE] films into thematic collections.

For the movie: "[TITLE]" ([YEAR])
Review the existing collections below and determine:
1. Which existing collections this movie fits into (match as many as possible)
2. Whether a new collection should be created (only if no good fits exist)

Existing Collections:
[List of all current collections with movie examples]

Response format:
{
  "assignments": [
    {"collectionName": "Film Noir Classics", "reason": "Classic noir cinematography and themes"}
  ],
  "newCollection": {
    "name": "Cold War Thrillers", 
    "reason": "Distinct Cold War espionage themes not covered by existing collections"
  }
}
```

### Prompt Optimization Features
- **Context caching**: Reuse collection context across movies
- **Batch processing**: Group similar movies when possible
- **Cost tracking**: Monitor token usage and API costs
- **Quality scoring**: Rate collection assignments for filtering

## Build Output Management

### File Structure
```
/{genre}-build/
├── {genre}-build-lists.json      # Main build output
├── {genre}-build-progress.json   # Processing state
├── {genre}-build.log             # Processing logs
└── batches/                      # Batch processing artifacts
    ├── batch-001.json
    └── batch-002.json
```

### Build Data Format
```json
{
  "category": "Drama",
  "method": "sequential-processing", 
  "buildMetadata": {
    "startTime": "2025-08-21T10:00:00Z",
    "endTime": "2025-08-21T18:30:00Z",
    "totalDuration": "8.5 hours",
    "processingMode": "sequential"
  },
  "statistics": {
    "totalLists": 847,
    "totalMoviesProcessed": 9531,
    "totalCost": 124.50,
    "averageListSize": 11.2,
    "newListsCreated": 723,
    "existingListAssignments": 8808
  },
  "allLists": [...]
}
```

## Quality Control

### Build-Time Filtering
```javascript
// Filter during build process
const validCollections = buildOutput.allLists.filter(collection => {
  // Remove single-movie collections
  if (collection.movieIds.length < 2) return false;
  
  // Remove generic/weak themes  
  if (isGenericTheme(collection.name)) return false;
  
  return true;
});
```

### Post-Build Analysis
- **Size distribution**: Analyze collection size patterns
- **Theme quality**: Review collection names for coherence
- **Coverage analysis**: Ensure broad thematic representation
- **Duplicate detection**: Identify similar/overlapping collections

## Performance Considerations

### Sequential Processing Benefits
- **No timeout issues**: Process movies individually
- **Memory efficiency**: Controlled memory usage patterns
- **Resumable operations**: Can restart from any point
- **Cost predictability**: Linear cost scaling

### Timeout Prevention
```javascript
// Original problematic pattern (parallel batch submission)
for (batch of batches) {
  submitBatch(batch); // Submit all batches immediately
}
await Promise.all(batchPromises); // Wait for all (causes timeouts)

// Fixed pattern (sequential processing)  
for (batch of batches) {
  await processBatch(batch); // Process one batch completely before next
}
```

## Error Handling & Recovery

### Failure Recovery
```javascript
// Resume from last processed movie
const progress = loadProgress();
const remainingMovies = movies.slice(progress.lastProcessedIndex + 1);

// Track failures for retry
const failures = [];
for (const movie of remainingMovies) {
  try {
    await processMovie(movie);
  } catch (error) {
    failures.push({movieId: movie.id, error: error.message});
  }
}
```

### Build Validation
- **Data integrity**: Verify all movie UUIDs are valid
- **Collection consistency**: Check for malformed collection data
- **Progress tracking**: Ensure processing state is accurate
- **Cost validation**: Verify API costs match processing volume

## Integration with Production System

### Build-to-Production Pipeline
```
Build Output → Quality Filter → Production Transform → Database Insert
```

1. **Build Output**: Raw collections from AI processing
2. **Quality Filter**: Remove collections with <6 movies
3. **Production Transform**: Convert to production schema format
4. **Database Insert**: Populate production browse tables

### Handoff Requirements
- **Consistent UUIDs**: Movie UUIDs must match production database
- **Quality metrics**: Provide filtering statistics
- **Build metadata**: Include processing details for auditing
- **Error reporting**: Document any processing failures

## Monitoring & Optimization

### Build Metrics
- **Processing rate**: Movies processed per hour
- **Cost efficiency**: Cost per movie processed
- **Quality ratio**: Collections retained after filtering
- **Error rate**: Percentage of failed movie assignments

### Performance Optimization
- **Prompt caching**: Reduce token costs through context reuse
- **Batch sizing**: Optimize batch sizes for API efficiency  
- **Parallel strategies**: Selective parallelization for safe speedup
- **Resource monitoring**: Track memory and CPU usage patterns