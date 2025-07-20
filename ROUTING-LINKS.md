# Routing & Links Documentation

**Last Updated:** July 18, 2025  
**Status:** Production Ready - Expert-Reviewed Navigation Implementation

## 🎯 Executive Summary

This document provides comprehensive guidance for implementing and maintaining
navigation in the MovieGenius Next.js application. The navigation system has
been rebuilt following expert code reviews to eliminate hydration mismatches and
restore proper Next.js client-side routing.

## 🚨 Critical Navigation Fixes Applied

### The Problem (Before Expert Review)

- **Hydration Mismatches**: Server and client rendered different content
- **Broken Link Components**: URL changes but page content didn't update
- **Workaround Pattern**: `e.preventDefault()` + `router.push()` overrode
  Next.js routing
- **Performance Issues**: Prefetching disabled, accessibility broken

### The Solution (Expert-Reviewed)

- **Proper Link Usage**: `passHref` + `legacyBehavior` + `<a>` wrapper
- **Hydration Fix**: Move active state to `useState` + `useEffect`
- **Remove Workarounds**: Let Next.js handle navigation natively
- **Restore Performance**: Prefetching, accessibility, and SEO working

## 🏗️ Correct Navigation Patterns

### ✅ Proper Link Component Usage

```javascript
// CORRECT: Standard Next.js Link with proper wrapper
<Link href="/themes/film-noir" passHref legacyBehavior>
  <a style={{textDecoration: 'none'}}>
    <div>Film Noir</div>
  </a>
</Link>

// CORRECT: With route helpers
<Link
  href={routeHelpers.getEpisodeRoute(theme, episodeId)}
  passHref
  legacyBehavior
>
  <a style={styles.episodeButton}>
    <div>Episode Title</div>
  </a>
</Link>
```

### ❌ Incorrect Patterns (Now Fixed)

```javascript
// WRONG: onClick workaround (removed from codebase)
<Link
  href="/themes/film-noir"
  onClick={(e) => {
    e.preventDefault();
    router.push('/themes/film-noir');
  }}
>
  <div>Film Noir</div>
</Link>

// WRONG: Direct div with onClick (avoid)
<div onClick={() => router.push('/themes/film-noir')}>
  Film Noir
</div>
```

## 🔧 Component Implementation Examples

### NavBar Component (Fixed)

```javascript
// components/NavBar.js - Expert-reviewed implementation
export default function NavBar() {
  const router = useRouter();
  const [showFrame, setShowFrame] = useState(true);
  const [activeLabel, setActiveLabel] = useState(null); // Start with null to match server render

  useEffect(() => {
    setShowFrame(shouldShowPhoneFrame());
  }, []);

  useEffect(() => {
    // Client-side active state calculation
    if (router.isReady) {
      try {
        const active = navItems.find(item => {
          if (item.route === router.pathname) return true;
          if (item.route === '/genius') {
            return routeValidation.shouldShowGeniusActive(router.pathname);
          }
          return false;
        })?.label;
        setActiveLabel(active);
      } catch (error) {
        console.warn('NavBar: Error determining active state:', error);
        setActiveLabel(null);
      }
    }
  }, [router.isReady, router.pathname]);

  return (
    <nav>
      {navItems.map(item => (
        <Link key={item.label} href={item.route} passHref legacyBehavior>
          <a style={{ textDecoration: 'none' }}>
            <div
              style={{
                opacity: activeLabel === item.label ? 1 : 0.6,
                transform:
                  activeLabel === item.label ? 'translateY(-2px)' : 'none',
              }}
            >
              <Icon size={28} />
              <span>{item.label}</span>
            </div>
          </a>
        </Link>
      ))}
    </nav>
  );
}
```

### Episode Links (Fixed)

```javascript
// components/EssentialMovies.js - Expert-reviewed implementation
export default function EssentialMovies({ theme }) {
  // No useRouter import needed - removed

  return (
    <div>
      {themeEpisodes.map(episode => (
        <Link
          key={episode.id}
          href={routeHelpers.getEpisodeRoute(theme, episode.id)}
          passHref
          legacyBehavior
        >
          <a style={{ textDecoration: 'none' }}>
            <div style={styles.episodeButton}>
              <div>{episode.title}</div>
            </div>
          </a>
        </Link>
      ))}
    </div>
  );
}
```

### Theme Footer (Fixed)

```javascript
// components/ThemeFooter.js - Expert-reviewed implementation
export default function ThemeFooter() {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  // No useRouter import needed - removed

  return (
    <div>
      {themeLinks.map((theme, index) => (
        <Link key={theme.href} href={theme.href} passHref legacyBehavior>
          <a style={{ textDecoration: 'none' }}>
            <div
              style={{
                ...styles.themeButton,
                ...(hoveredIndex === index ? styles.themeButtonHover : {}),
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {theme.label}
            </div>
          </a>
        </Link>
      ))}
    </div>
  );
}
```

## 🏗️ Centralized Route Configuration

All routes are managed through `/lib/routes.js`:

```javascript
// Theme Links (10 themes)
export const themeLinks = [
  { href: '/themes/film-noir', label: 'Film Noir', slug: 'film-noir' },
  {
    href: '/themes/horror-suspense',
    label: 'Horror & Suspense',
    slug: 'horror-suspense',
  },
  // ... 8 more themes
];

// Static Routes
export const staticRoutes = {
  home: '/',
  movies: '/movies',
  genius: '/genius',
  you: '/you',
};

// Navigation Items for NavBar
export const navItems = [
  { label: 'Movies', icon: 'Clapperboard', route: staticRoutes.movies },
  { label: 'Genius', icon: 'Sparkles', route: staticRoutes.genius },
  { label: 'You', icon: 'User', route: staticRoutes.you },
];

// Episode Routes (126+ pre-defined)
export const episodes = [
  {
    theme: 'film-noir',
    id: 'german-expressionism',
    title: 'German Expressionism',
    slug: '/film-noir/german-expressionism',
  },
  // ... complete episode mapping
];

// Route Generation Helpers
export const routeHelpers = {
  getEpisodeRoute: (theme, episodeId) => {
    try {
      const episode = episodes.find(
        ep => ep.theme === theme && ep.id === episodeId
      );
      return episode ? episode.slug : staticRoutes.home;
    } catch (error) {
      console.error('getEpisodeRoute error:', error);
      return staticRoutes.home;
    }
  },

  getThemeRoute: slug => {
    try {
      const theme = themeLinks.find(t => t.slug === slug);
      return theme ? theme.href : staticRoutes.home;
    } catch (error) {
      console.error('getThemeRoute error:', error);
      return staticRoutes.home;
    }
  },

  getMovieRoute: tmdbId => {
    try {
      const id = String(tmdbId);
      if (!/^\d+$/.test(id)) return staticRoutes.home;
      return `/movie/${id}`;
    } catch (error) {
      console.error('getMovieRoute error:', error);
      return staticRoutes.home;
    }
  },
};

// Active State Detection
export const routeValidation = {
  shouldShowGeniusActive: pathname => {
    try {
      // Theme pages show Genius as active
      if (routeHelpers.isThemeRoute(pathname)) {
        const themeSlug = routeHelpers.getThemeFromRoute(pathname);
        return routeValidation.isValidTheme(themeSlug);
      }

      // Episode pages show Genius as active
      if (routeHelpers.isEpisodeRoute(pathname)) {
        return true;
      }

      // Genius page itself
      return pathname === staticRoutes.genius;
    } catch (error) {
      console.error('shouldShowGeniusActive error:', error);
      return false;
    }
  },
};
```

## 📋 Fixed Components Summary

### Components Updated (Expert-Reviewed)

1. **NavBar.js**
   - ✅ Fixed hydration mismatch with `useState(null)` + `useEffect`
   - ✅ Removed `onClick` workaround
   - ✅ Proper Link with `passHref` + `legacyBehavior`

2. **EssentialMovies.js**
   - ✅ Removed `useRouter` import
   - ✅ Removed `onClick` workaround
   - ✅ Proper Link with `passHref` + `legacyBehavior`

3. **EpisodeFooter.js**
   - ✅ Removed `onClick` workarounds from episode and theme links
   - ✅ Proper Link with `passHref` + `legacyBehavior`

4. **ThemeFooter.js**
   - ✅ Removed `useRouter` import and `onClick` workaround
   - ✅ Preserved hover state functionality
   - ✅ Proper Link with `passHref` + `legacyBehavior`

### Components Not Changed (No Issues)

- **lib/routes.js** - Solid centralized configuration
- **pages/[theme]/[episode].js** - Correct dynamic routing
- **pages/themes/[theme].js** - Clean theme page structure

## 🔧 Debugging Navigation Issues

### Browser Console Checks

```javascript
// Check if hydration errors are resolved
// Look for these in browser console (should be gone):
// ❌ "Text content did not match. Server: ... Client: ..."
// ❌ "Expected server HTML to contain a matching..."

// Verify navigation is working
// These should work without errors:
console.log('Router pathname:', router.pathname);
console.log('Active label:', activeLabel);
console.log('Router ready:', router.isReady);
```

### Testing Navigation

```bash
# Test navigation in development
npm run dev

# Test navigation in production build
npm run build
npm run start

# Navigation should work properly in both modes
```

## 🚨 Common Issues & Solutions

### Issue: "URL Changes But Page Content Doesn't Update"

**Status**: ✅ **FIXED** by expert review

- **Root Cause**: Hydration mismatch and improper Link usage
- **Solution**: Proper `passHref` + `legacyBehavior` + `<a>` wrapper
- **Prevention**: Always use centralized route helpers

### Issue: "Double-Click Required for Navigation"

**Status**: ✅ **FIXED** by expert review

- **Root Cause**: `onClick` workarounds preventing default Next.js behavior
- **Solution**: Removed all `e.preventDefault()` + `router.push()` workarounds
- **Prevention**: Never override Next.js Link default behavior

### Issue: "Active State Not Updating"

**Status**: ✅ **FIXED** by expert review

- **Root Cause**: Server/client render mismatch in NavBar
- **Solution**: Move active state to `useState(null)` + `useEffect`
- **Prevention**: Always start with server-matching initial state

## 💡 Best Practices

### 1. Always Use Centralized Routes

```javascript
// ✅ CORRECT: Use centralized route helpers
import { routeHelpers } from '../lib/routes';
const episodeRoute = routeHelpers.getEpisodeRoute(theme, episodeId);

// ❌ WRONG: Manual route construction
const episodeRoute = `/${theme}/${episodeId}`;
```

### 2. Proper Link Component Structure

```javascript
// ✅ CORRECT: Next.js Link with proper wrapper
<Link href={route} passHref legacyBehavior>
  <a style={{textDecoration: 'none'}}>
    <div>Content</div>
  </a>
</Link>

// ❌ WRONG: Direct div without Link wrapper
<div onClick={() => router.push(route)}>Content</div>
```

### 3. Handle Hydration Correctly

```javascript
// ✅ CORRECT: Start with server-matching state
const [activeLabel, setActiveLabel] = useState(null);

useEffect(() => {
  if (router.isReady) {
    // Calculate active state client-side only
    setActiveLabel(calculateActiveState());
  }
}, [router.isReady, router.pathname]);

// ❌ WRONG: Calculate during render
const activeLabel = calculateActiveState(); // Can cause hydration mismatch
```

### 4. Error Handling in Route Generation

```javascript
// ✅ CORRECT: Always include error handling
export const getEpisodeRoute = (theme, episodeId) => {
  try {
    if (!theme || !episodeId) return staticRoutes.home;
    const episode = episodes.find(
      ep => ep.theme === theme && ep.id === episodeId
    );
    return episode ? episode.slug : staticRoutes.home;
  } catch (error) {
    console.error('getEpisodeRoute error:', error);
    return staticRoutes.home;
  }
};
```

## 🧪 Testing Navigation

### Manual Testing Checklist

**✅ Navigation Flow Testing:**

- [ ] Home page → Theme selection → Episode page
- [ ] Episode page → NavBar items (Movies, Genius, You)
- [ ] Theme page → Other themes via footer
- [ ] Rapid navigation (5+ clicks in succession)
- [ ] Browser back/forward buttons
- [ ] Direct URL access to episodes

**✅ Hydration Testing:**

- [ ] No console errors about server/client mismatch
- [ ] Active states update correctly on first load
- [ ] Navigation works immediately (no double-click required)

**✅ Performance Testing:**

- [ ] Link prefetching is working
- [ ] Navigation feels instant
- [ ] No JavaScript errors in console

### Automated Testing

```bash
# Run navigation tests
npm test __tests__/navigation.test.js
npm test __tests__/routes.test.js
npm test __tests__/navbar.test.js

# All tests should pass with expert-reviewed fixes
```

## 🔄 Maintenance

### Adding New Routes

1. **Update Central Configuration:**

```javascript
// Add to lib/routes.js
export const themeLinks = [
  // ... existing themes
  { href: '/themes/new-theme', label: 'New Theme', slug: 'new-theme' },
];

export const episodes = [
  // ... existing episodes
  {
    theme: 'new-theme',
    id: 'new-episode',
    title: 'New Episode',
    slug: '/new-theme/new-episode',
  },
];
```

2. **Create Theme Page:**

```javascript
// pages/themes/new-theme.js
import ThemePage from '../../components/ThemePage';

export default function NewThemePage() {
  return <ThemePage themeId="new-theme" />;
}
```

3. **Test New Routes:**

```bash
npm run build  # Regenerates static paths
npm test       # Verify navigation tests pass
```

### Regular Maintenance

**Monthly:**

- [ ] Verify all navigation links work correctly
- [ ] Check for hydration warnings in browser console
- [ ] Test navigation on different devices/browsers
- [ ] Review navigation performance metrics

**Quarterly:**

- [ ] Update this documentation
- [ ] Review route structure for optimization opportunities
- [ ] Test with latest Next.js version
- [ ] Audit for accessibility compliance

## 📊 Performance Monitoring

### Key Metrics to Watch

```javascript
// Navigation Performance (targets)
Route generation time: < 5ms
Component render time: < 50ms
Total navigation time: < 200ms
Hydration errors: 0

// Memory Usage
Router event listeners: Minimal
Navigation history: Reasonable size
Component cleanup: Complete
```

### Monitoring Tools

1. **Browser DevTools**: Check Network tab for prefetching
2. **React DevTools**: Monitor component re-renders
3. **Console**: Watch for hydration warnings
4. **Performance Tab**: Measure navigation timing

## 🚨 Emergency Procedures

### Navigation Completely Broken

```bash
# If navigation completely fails after deployment
git revert HEAD~1  # Revert last commit
git push origin main
```

### Partial Navigation Issues

```bash
# Check specific component
git diff HEAD~1 components/NavBar.js

# Test specific route
curl -I https://moviegenius.ai/themes/film-noir
```

## 📚 Related Documentation

- [Next.js Link Documentation](https://nextjs.org/docs/api-reference/next/link)
- [Next.js Router Documentation](https://nextjs.org/docs/api-reference/next/router)
- [React Hydration Documentation](https://react.dev/reference/react-dom/hydrate)

## 🔗 Quick Reference

**Key Files:**

- `/lib/routes.js` - Centralized route configuration
- `/components/NavBar.js` - Main navigation (expert-reviewed)
- `/components/EssentialMovies.js` - Episode links (expert-reviewed)
- `/components/EpisodeFooter.js` - Episode navigation (expert-reviewed)
- `/components/ThemeFooter.js` - Theme navigation (expert-reviewed)

**Link Pattern:**

```javascript
<Link href={route} passHref legacyBehavior>
  <a>
    <div>Content</div>
  </a>
</Link>
```

**Hydration Pattern:**

```javascript
const [state, setState] = useState(null); // Match server
useEffect(() => {
  if (router.isReady) setState(calculateClientState());
}, [router.isReady, router.pathname]);
```

---

**Document Version:** 3.0 (Expert-Reviewed)  
**Last Updated:** July 18, 2025  
**Status:** Production Ready  
**Owner:** Development Team  
**Expert Review:** Two Senior Developers (Applied)
