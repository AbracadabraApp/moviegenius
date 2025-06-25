# MovieHeaderLarge Component API Documentation

## Overview

The `MovieHeaderLarge` component is the production header component for movie detail pages, featuring a modern vertical layout with prominent poster display and interactive floating action bar.

## Component Features

- **Large Vertical Poster Layout**: Prominent poster display with 30px bottom cropping
- **Floating Action Bar**: Right-positioned action buttons for favorites and list management
- **Interactive Poster**: Double-click functionality for quick list addition
- **Responsive Design**: Optimized spacing and visual hierarchy
- **Error Handling**: Graceful degradation for localStorage and API failures
- **Browser Compatibility**: Fallbacks for modern CSS features

## Props Interface

```typescript
interface MovieHeaderLargeProps {
  /** Movie title */
  title: string;
  
  /** Movie release year */
  year: number;
  
  /** Movie description/tagline */
  initialSlug: string;
  
  /** Movie poster URL */
  initialPoster: string;
  
  /** Initial streaming data (currently unused) */
  initialStreaming?: string;
  
  /** TMDB movie ID for API calls */
  tmdbId: number;
}
```

## Usage Example

```jsx
import MovieHeaderLarge from '../components/MovieHeaderLarge';

function MoviePage({ movie }) {
  return (
    <MovieHeaderLarge
      title={movie.title}
      year={movie.year}
      initialSlug={movie.slug}
      initialPoster={movie.posterUrl}
      tmdbId={movie.tmdbId}
    />
  );
}
```

## Interactive Features

### Floating Action Bar

Located on the right side of the component with two primary actions:

1. **Add to List Button** (CirclePlus icon)
   - Click to toggle movie in user's personal list
   - Visual feedback with icon fill state change
   - Persistent state across navigation

2. **Favorites Button** (Heart icon)
   - Click to toggle movie in favorites collection
   - Integrates with `FavoritesManager` for persistence
   - Color changes: gray (unfavorited) → red (favorited)

### Poster Interactions

- **Double-click**: Toggles add-to-list state with "added" animation overlay
- **Animation**: 1.5-second fade-in-out animation for user feedback
- **Cropping**: Bottom 30px cropped using CSS `clipPath` for better visual composition

## State Management

The component manages several internal states:

```javascript
const [hearted, setHearted] = useState(false);        // Favorites state
const [bookmarked, setBookmarked] = useState(false);  // Currently unused
const [addedToList, setAddedToList] = useState(false); // Personal list state
const [showAddedAnimation, setShowAddedAnimation] = useState(false); // Animation state
```

## Error Handling

The component includes comprehensive error handling for:

- **localStorage failures**: Safe defaults when FavoritesManager throws errors
- **Missing props**: Fallback to placeholder images and empty strings
- **Event listener errors**: Graceful degradation for cross-component communication
- **Browser compatibility**: Fallbacks for unsupported CSS features

## Styling Architecture

### Layout Structure

```
movieHeader (container)
├── actionBarContainer (floating right)
│   ├── Add to List Button
│   └── Favorites Button
├── posterContainer
│   ├── Large Poster Image (with clipPath cropping)
│   └── Animation Overlay (when active)
├── titleContainer
│   ├── Movie Title
│   └── Release Year
└── streamingInfo
    └── Streaming Availability Text
```

### Key Spacing Values

- **Input to Poster**: 9px total spacing
- **Poster to Title**: 10px total spacing  
- **Action Bar Position**: `bottom: 130px` from container
- **Container Padding**: `0px 16px 8px 16px`

### Browser Compatibility

The component includes fallbacks for:

- **clipPath**: Uses `marginBottom: -30px` for older browsers
- **backdrop-filter**: Graceful degradation for action bar glass effect
- **CSS Grid**: Uses flexbox for better compatibility

## Integration Requirements

### Dependencies

```javascript
import { Heart, CirclePlus } from 'lucide-react';
import { FavoritesManager } from './FavoritesManager';
```

### External Dependencies

- **FavoritesManager**: Handles localStorage persistence and cross-component synchronization
- **Lucide React**: Icon library for action buttons

### Environment Requirements

- React 18+
- Next.js 15+ (for CSS-in-JS support)
- Modern browser with ES6+ support

## Performance Considerations

### Optimization Features

- Event listener cleanup prevents memory leaks
- Debounced state updates through FavoritesManager
- Minimal re-renders through targeted state management

### Potential Improvements

- Consider `React.memo` for expensive re-renders
- Implement `useCallback` for event handlers if parent re-renders frequently
- Add image lazy loading for poster URLs

## Testing

The component includes comprehensive test coverage:

- **Unit Tests**: Component rendering, user interactions, state management
- **Integration Tests**: FavoritesManager integration, complete user workflows
- **Error Handling Tests**: localStorage failures, missing props, API errors
- **Accessibility Tests**: ARIA labels, keyboard navigation, screen reader support

Run tests with:
```bash
npm test -- __tests__/components/MovieHeaderLarge.test.js
```

## Migration Notes

### From MovieHeader

Key differences when migrating from the old `MovieHeader` component:

1. **Layout Change**: Horizontal → Vertical poster layout
2. **New Features**: Floating action bar, poster interactions
3. **Props**: Same interface, no breaking changes
4. **Styling**: Completely different CSS architecture
5. **Dependencies**: Requires FavoritesManager integration

### Breaking Changes

- None - props interface remains compatible
- Visual layout is completely different (expected)
- Action bar introduces new user interaction patterns

## Future Enhancements

Planned improvements for future releases:

1. **Streaming Integration**: Replace "TBD" with real streaming data
2. **Animation Polish**: Smoother transitions and micro-interactions
3. **Accessibility**: Enhanced keyboard navigation and screen reader support
4. **Performance**: React.memo optimization and bundle size reduction
5. **Internationalization**: Multi-language support for action labels

## Support

For issues, feature requests, or questions about this component:

1. Check existing tests for usage examples
2. Review error handling patterns for edge cases
3. Consult FavoritesManager documentation for state management
4. Test component in isolation using the provided test suite