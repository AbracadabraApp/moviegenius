# MediaCard Layout Change Plan - DEFERRED

**Status**: Saved for future implementation  
**Priority**: Low - pending impact assessment of shorter slugs and streaming
implementation  
**Date**: 2025-06-26

## Junior UX Developer's Original Proposal

### Current Layout Analysis

The MediaCard currently uses a two-column layout:

- Left column: Poster (100px wide)
- Right column: Text content (flex: 1) with:
  - Title at top
  - Year below title
  - Slug description
  - Bottom row with streaming (left) + actions (right)

### Proposed Change

Move to a stacked layout where streaming and actions get their own full-width
row:

**New Structure:**

1. Top section: Poster + Text (current layout)
   - Poster (left)
   - Title, Year, Slug (right)
2. Bottom section: Full-width row
   - Streaming info (left)
   - Action buttons (right)

## Senior Review Assessment

**Overall Assessment: GOOD PLAN with important caveats**

### ✅ Strengths

1. **Problem Analysis**: Correctly identified streaming text space constraints
2. **Solution Logic**: Stacked layout would provide more space for longer
   service names
3. **Structure**: Well-thought-out breakdown of required changes
4. **Risk Awareness**: Properly identified LOCKED COMPONENT risks

### ⚠️ Critical Concerns

1. **Lock File Violations**: Proposal suggests changes that violate lock
   restrictions
2. **Scope of Impact**: MediaCard used in 31+ files across application
3. **Significant Layout Change**: Row to column restructuring is high-risk

## Recommended Implementation Options

### Option A: Minimal Text Expansion (SAFER)

- Increase streamingInfo flex-basis to 60%
- Reduce icon margins from 8px to 4px
- Enhance text wrapping capabilities
- Add text-overflow: ellipsis for very long names

### Option B: Controlled Height Expansion (MODERATE RISK)

- Remove fixed minHeight: '150px'
- Add minHeight: 'fit-content'
- Preserve row structure but allow natural height expansion
- Add maxHeight: '200px' constraint

### Option C: Full Stacked Layout (HIGH RISK)

- Complete restructuring as originally proposed
- Only if Options A & B prove insufficient

## Testing Protocol

### Phase 1: Core Functionality

- Movie pages, Ask results, Search results
- Featured film sections, Mobile responsiveness

### Phase 2: Integration Points

- All 31+ import locations
- FeaturedFilmsSection, GeniusEpisodeTemplate
- iOS app compatibility

### Phase 3: Edge Cases

- Very long streaming service names
- Multiple streaming services
- Cards with no streaming data

## Implementation Timeline

**Phase 1**: Assess impact of shorter slugs (completed) **Phase 2**: Implement
actual streaming service integration (pending) **Phase 3**: Evaluate remaining
space constraints (future) **Phase 4**: Consider MediaCard layout changes if
still needed (future)

## Rationale for Deferral

Smart decision to wait because:

1. **Shorter slugs impact unknown**: 50-character limit may free up significant
   space
2. **Streaming implementation pending**: Actual service names may fit in current
   layout
3. **Risk vs. reward**: High-risk locked component changes should be last resort
4. **Data-driven decision**: Better to assess real-world usage first

---

**Next Steps**: Monitor space utilization after shorter slugs and streaming
implementation, then reassess if layout changes are still necessary.
