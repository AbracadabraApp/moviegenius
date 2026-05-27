# Genius System V2 Refactoring Plan

## Current Issues

The current Genius system implementation has insufficient separation of concerns:

### Problems
1. **Hardcoded Tier Names** - Tier configurations spread across multiple files:
   - `TierNavigationBar` has hardcoded array of tier names
   - `CategoryEssentials.subcategories()` returns hardcoded names
   - Progress calculations iterate through hardcoded tier lists
   - UI components directly reference specific tier names

2. **No Single Source of Truth** - Configuration scattered:
   - `genius_data.json` has the data
   - `GeniusDataStore` loads and indexes it
   - UI components don't fully rely on data store for tier configuration
   - `TIER_SPEC.md` documents the names but isn't enforced in code

3. **Tight Coupling** - Data and presentation intertwined:
   - Movie lists embedded in JSON with tier names
   - Can't rename a tier without updating multiple files
   - Can't add/remove tiers without code changes
   - No way to customize tier order or display properties

## Proposed V2 Architecture

### 1. Core Data Models

```swift
// Single configuration source
struct TierConfiguration: Codable {
    let id: String           // Unique identifier (e.g., "beginner")
    let displayName: String  // User-facing name (e.g., "Beginner")
    let order: Int          // Display order
    let color: Color        // Theme color
    let description: String // Optional description
    let films: [GeniusMovie] // Associated films
}

struct CategoryConfiguration: Codable {
    let id: String
    let displayName: String
    let type: CategoryType  // .genre, .awards, .persons
    let tiers: [TierConfiguration]
}

enum CategoryType: String, Codable {
    case genre
    case awards
    case persons
}
```

### 2. Centralized Data Store

```swift
class GeniusDataStore {
    // Single source of truth for all configuration
    private(set) var categories: [CategoryConfiguration] = []

    // Dynamic tier management
    func tiersForCategory(_ categoryId: String) -> [TierConfiguration]
    func updateTierName(_ tierId: String, newName: String)
    func addFilmToTier(_ film: GeniusMovie, tierId: String, categoryId: String)
    func removeTier(_ tierId: String, from categoryId: String)
    func addTier(_ tier: TierConfiguration, to categoryId: String)
    func reorderTiers(in categoryId: String, newOrder: [String])

    // Film management
    func filmsForTier(_ tierId: String, in categoryId: String) -> [GeniusMovie]
    func moveFilm(_ filmId: Int, from: String, to: String, in categoryId: String)

    // Persistence
    func save() throws
    func reload() throws
}
```

### 3. UI Components Driven by Configuration

```swift
// Navigation bar that adapts to any tier configuration
struct TierNavigationBar: View {
    let tiers: [TierConfiguration]  // No hardcoded names!
    let currentTierId: String?

    var body: some View {
        HStack(spacing: 2) {
            ForEach(tiers, id: \.id) { tier in
                NavigationLink(destination: TierFilmsView(tier: tier)) {
                    TierSection(
                        config: tier,
                        isActive: tier.id == currentTierId
                    )
                }
            }
        }
    }
}

// Generic tier display component
struct TierFilmsView: View {
    let tier: TierConfiguration

    var body: some View {
        // Renders based on configuration, not hardcoded values
        ScrollView {
            Text(tier.displayName)
                .font(.title)

            ForEach(tier.films) { film in
                MovieCard(film: film)
            }
        }
    }
}
```

### 4. JSON Configuration Format

```json
{
  "version": "2.0",
  "categories": [
    {
      "id": "action",
      "displayName": "Action",
      "type": "genre",
      "tiers": [
        {
          "id": "beginner",
          "displayName": "Beginner",
          "order": 1,
          "color": "#808080",
          "description": "Start your journey with accessible action classics",
          "films": [...]
        },
        {
          "id": "fan",
          "displayName": "Fan",
          "order": 2,
          "color": "#CD7F32",
          "description": "For those who appreciate the genre",
          "films": [...]
        }
      ]
    }
  ]
}
```

## Implementation Benefits

### 1. Dynamic Configuration
- Add/remove tiers without code changes
- Rename tiers by updating JSON
- Reorder tiers through configuration
- Customize colors and descriptions

### 2. Clean Separation
- UI components just render what they're given
- No hardcoded tier names in Swift code
- Single source of truth for all configuration
- Data layer completely independent of presentation

### 3. Extensibility
- Easy to add new tier properties (icons, badges, etc.)
- Support for different tier structures per category
- Could add user-specific tier customization
- Enable A/B testing different tier configurations

### 4. Maintainability
- Change tier names in one place
- Clear data flow from JSON → Store → UI
- Testable components with mock configurations
- Reduced coupling between components

## Migration Strategy

### Phase 1: Data Layer (1 week)
1. Create new data models
2. Update JSON format with backward compatibility
3. Implement new GeniusDataStore with migration support
4. Add unit tests for data layer

### Phase 2: UI Refactor (2 weeks)
1. Create new configuration-driven UI components
2. Replace hardcoded tier references one by one
3. Update navigation to use tier IDs instead of names
4. Test on device with various configurations

### Phase 3: Cleanup (3 days)
1. Remove old hardcoded tier arrays
2. Delete obsolete UI components
3. Update documentation
4. Performance optimization

### Phase 4: Enhancement (Optional)
1. Add admin UI for tier management
2. Implement tier reordering
3. Add tier statistics/analytics
4. Create tier progression features

## Risk Mitigation

1. **Keep existing system working** during migration
2. **Feature flag** to toggle between v1/v2
3. **Extensive testing** with production data
4. **Rollback plan** if issues arise
5. **Gradual rollout** to beta users first

## Success Metrics

- ✅ Zero hardcoded tier names in Swift code
- ✅ Can add/remove/rename tiers without recompiling
- ✅ All tier configuration in single JSON file
- ✅ UI components work with any tier configuration
- ✅ Reduced code complexity (target: 50% less code in GeniusView.swift)
- ✅ Improved testability (target: 90% unit test coverage)

## Timeline Estimate

- **Total Duration**: 3-4 weeks
- **Development**: 2-3 weeks
- **Testing**: 1 week
- **Deployment**: 2-3 days

## Next Steps

1. Review and approve plan
2. Create feature branch `genius-v2-refactor`
3. Set up feature flag infrastructure
4. Begin Phase 1 implementation
5. Weekly progress reviews

---

*Last Updated: May 26, 2026*
*Status: Planning*
*Owner: TBD*