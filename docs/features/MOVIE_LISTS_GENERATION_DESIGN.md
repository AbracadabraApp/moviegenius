# Movie Lists Generation System: Genre-Based List Creation

## Executive Summary

MovieGenius implements a genre-based system to generate 2,000-5,000 thematic movie lists from its 21K+ movie catalog using Claude AI. The approach uses title-only processing within genre categories to achieve cost efficiency while maintaining high-quality thematic categorization.

## Background Context

### Final Implementation Approach
- **64 Genre Categories**: Process movies grouped by consolidated genres (Drama, Comedy, Horror, etc.)
- **Title-Only Processing**: Use movie titles + years only (no full analysis text) for efficient token usage
- **Single-Pass Per Genre**: Each genre batch generates 20-30 thematic lists with 10-30 movies each
- **Target Output**: 2,000-5,000 total lists across all genres
- **Cost Efficiency**: ~$7 estimated total cost using optimized prompt approach

### Genre Categorization Results
**21,275 movies processed across 64 categories:**
- **Top Categories**: Drama (3,540), Comedy (3,934), Horror (2,142), Thriller (2,134)
- **Assignment Rate**: 83.4% assigned to specific genres, 16.6% unassigned
- **Multi-assignment**: Average 1.5 categories per movie
- **Unassigned Strategy**: Large "Drama" category for Claude to subdivide thematically

### Input Data Format (Title-Only)
```
Movie ID: "The Shawshank Redemption" (1994)
Movie ID: "Pulp Fiction" (1994)  
Movie ID: "The Godfather" (1972)
```

## Final Architecture: Single-Pass Genre Processing

### Core Design Decision

**Process movies in genre-grouped batches using title-only data for optimal cost/quality balance.**

### Key Design Elements:
- **Genre-Based Grouping**: 64 categories from Comedy (3,934) to Biblical (35)
- **Title-Only Processing**: Eliminates token limit issues while preserving semantic information
- **Single API Call Per Genre**: One call generates all thematic lists for that genre
- **Constraint-Based Prompting**: 2-4 word titles, 10-30 movies per list, avoid generic terms

## Implementation Status

### Completed Infrastructure
✅ **Genre Categorization**: 21,275 movies assigned to 64 categories  
✅ **Movie Data Extraction**: Title/year/ID format ready for Claude processing  
✅ **Prompt Engineering**: Optimized prompt with constraints and examples  
✅ **Test Framework**: Musical category test ready (`test-musical-lists.js`)  
✅ **Cost Tracking**: Real-time token usage and cost calculation

### Current Testing Phase
🧪 **Musical Category Test** (644 movies): Validates prompt effectiveness and cost estimates  
📊 **Expected Results**: 20-30 lists, $0.10-0.15 cost, JSON output format  
🎯 **Success Criteria**: Lists follow 2-4 word constraint, 10-30 movies each, specific themes  

### Next Steps
1. **Run Musical Test**: Execute `node test-musical-lists.js` to validate approach
2. **Analyze Results**: Review cost data, list quality, and prompt effectiveness  
3. **Scale to All Genres**: Process remaining 63 categories if test succeeds
4. **Future Enhancement**: Implement TF-IDF semantic clustering for cross-genre themes

### Cost Projections
- **Musical Test**: ~$0.11 (644 movies)
- **Full Implementation**: ~$7 (64 categories)  
- **Per Movie Cost**: ~$0.0003 each

## Prompt Engineering Details

### Final Prompt Structure

```
You are a film expert creating thematic movie lists. Below are [N] Musical films with their titles and release years.

Your task: Create 20-30 thematic lists, each containing 10-30 movies that share a specific theme or characteristic.

Requirements:
- List titles must be exactly 2-4 words
- Each list should have a clear, specific theme
- Include 10-30 movies per list (no more, no less)
- Each movie can appear in multiple lists if it fits multiple themes
- Avoid generic words like "Great", "Best", "Classic", "Famous" in list titles

Examples of good themes: "Broadway Stage Adaptations", "Biographical Music Stories", "Animated Musical Films"
Examples to avoid: "Great Musical Films", "Classic Hollywood Musicals"

Output format: {"lists": [{"name": "Theme Name", "movieIds": ["id1", "id2"]}]}
```

**Key Design Elements:**
- **Role Definition**: "Film expert" establishes authority and context
- **Specific Constraints**: 2-4 words, 10-30 movies, avoid generic terms  
- **Positive/Negative Examples**: Guide toward specific vs generic themes
- **JSON Structure**: Ensures consistent, parseable output
- **Multi-Assignment**: Movies can appear in multiple relevant lists

## Test Execution

**Command**: `node test-musical-lists.js`

**Expected Output Files**:
- `musical-test-results.json` - Complete results with cost data and generated lists
- `musical-test-raw-response.txt` - Raw Claude response (if JSON parsing fails)

**Success Validation**:
- 20-30 lists generated
- Each list contains 10-30 movies  
- List titles follow 2-4 word constraint
- Themes are specific, not generic
- Total cost under $0.15
- Valid JSON output format

Once Musical test validates the approach, scale to all 64 categories for full implementation.
