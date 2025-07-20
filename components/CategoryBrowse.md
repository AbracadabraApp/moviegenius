# CategoryBrowse Component

A reusable footer component that provides movie category buttons for discovery.
Links to the search page with pre-filtered results.

## Usage

```javascript
import CategoryBrowse from '../components/CategoryBrowse';

// Basic usage
<CategoryBrowse />

// With custom title
<CategoryBrowse title="Explore Movies" />

// Compact version (3 columns, smaller buttons)
<CategoryBrowse compact={true} />

// With custom styling
<CategoryBrowse style={{ marginTop: '20px' }} />
```

## Props

| Prop      | Type    | Default              | Description                                            |
| --------- | ------- | -------------------- | ------------------------------------------------------ |
| `title`   | string  | "Browse by Category" | Header text for the category section                   |
| `compact` | boolean | false                | Use compact layout (3 cols vs 2 cols, smaller buttons) |
| `style`   | object  | {}                   | Additional CSS styles to apply to container            |

## Categories

Each button links to `/search?category={slug}` with the following mappings:

- **Action Movies** → `/search?category=action` → "action movies"
- **Comedy Films** → `/search?category=comedy` → "comedy films"
- **Horror Movies** → `/search?category=horror` → "horror movies"
- **Sci-Fi Classics** → `/search?category=sci-fi` → "science fiction"
- **Drama Films** → `/search?category=drama` → "drama films"
- **Thriller Films** → `/search?category=thriller` → "thriller films"
- **Romance Movies** → `/search?category=romance` → "romance movies"
- **Animated Movies** → `/search?category=animated` → "animated movies"
- **Documentary** → `/search?category=documentary` → "documentary films"
- **Foreign Films** → `/search?category=foreign` → "international cinema"
- **Marvel Movies** → `/search?category=marvel` → "marvel movies"
- **Film Noir** → `/search?category=noir` → "film noir"

## Integration Examples

### Episode Pages

```javascript
import CategoryBrowse from '../components/CategoryBrowse';

export default function EpisodePage() {
  return (
    <div>
      {/* Episode content */}

      {/* Footer discovery */}
      <CategoryBrowse title="Explore More Movies" compact={true} />
    </div>
  );
}
```

### Ask Pages

```javascript
import CategoryBrowse from '../components/CategoryBrowse';

export default function AskPage() {
  return (
    <div>
      {/* Ask content */}

      {/* Compact discovery footer */}
      <CategoryBrowse
        title="Browse Movies by Genre"
        compact={true}
        style={{
          marginTop: '24px',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '24px',
        }}
      />
    </div>
  );
}
```

### Search Results Page

```javascript
import CategoryBrowse from '../components/CategoryBrowse';

export default function SearchResultsPage() {
  return (
    <div>
      {/* Search results */}

      {/* Related categories footer */}
      <CategoryBrowse title="More Categories" />
    </div>
  );
}
```

## Styling

The component includes hover effects and responsive design:

- **Regular**: 2-column grid, 16px padding buttons
- **Compact**: 3-column grid, 12px padding buttons
- **Hover**: Background color and border color changes
- **Transition**: Smooth 0.2s ease transitions

## Dependencies

- Next.js Router (`useRouter` for navigation)
- No external styling dependencies (uses inline styles)

## Implementation Notes

- Uses TMDB-first search system via `/search` page
- All category searches return movies with proper TMDB IDs
- Consistent navigation throughout the app
- Mobile-optimized responsive grid layout
