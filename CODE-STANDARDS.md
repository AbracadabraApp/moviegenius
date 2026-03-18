# Code Standards
*Daily-use reference for consistent MovieGenius development*

## 🎯 Code Style Rules

### JavaScript/React Standards

**Use these patterns consistently:**

```javascript
// ✅ Component naming (PascalCase)
export default function MovieCard({ tmdb_id, title }) {
  // Component logic
}

// ✅ Variable naming (camelCase) 
const movieData = fetchMovieData();
const isLoading = true;

// ✅ Constants (SCREAMING_SNAKE_CASE)
const API_BASE_URL = 'https://api.themoviedb.org/3';
const MAX_RETRY_ATTEMPTS = 3;

// ✅ File naming (kebab-case for pages, PascalCase for components)
// pages/movie-details.js
// components/MovieCard.js
```

### Code Organization

**Import order (enforced by ESLint):**
```javascript
// 1. React imports
import React, { useState, useEffect } from 'react';

// 2. Third-party libraries  
import axios from 'axios';
import { useRouter } from 'next/router';

// 3. Internal utilities
import { fetchMovieData } from '../lib/api';

// 4. Components
import MovieCard from '../components/MovieCard';

// 5. Styles (last)
import styles from './Movie.module.css';
```

### JSX Standards

**Component structure:**
```jsx
export default function MoviePage({ movieId }) {
  // 1. State declarations
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 2. Effects
  useEffect(() => {
    fetchMovieDetails();
  }, [movieId]);
  
  // 3. Handler functions
  const handleClick = () => {
    // Handler logic
  };
  
  // 4. Early returns
  if (isLoading) return <div>Loading...</div>;
  if (!movie) return <div>Movie not found</div>;
  
  // 5. Main render
  return (
    <div className={styles.container}>
      <h1>{movie.title}</h1>
      {/* Rest of component */}
    </div>
  );
}
```

## 📏 Formatting Rules (Prettier)

**Automatically enforced settings:**

- **Line length:** 100 characters (80 for JSON/Markdown)
- **Quotes:** Single quotes for JS, double for JSX attributes
- **Semicolons:** Always required
- **Trailing commas:** ES5 style (objects/arrays only)
- **Indentation:** 2 spaces (no tabs)

**Example:**
```javascript
const movieConfig = {
  title: 'The Matrix',
  year: 1999,
  genres: ['Action', 'Sci-Fi'], // ← Trailing comma
};

const element = <MovieCard title="The Matrix" year={1999} />; // ← Double quotes in JSX
```

## 🚨 Error Prevention Rules

### Critical Error Patterns to Avoid

**❌ Never do these:**
```javascript
// Undefined variable usage
console.log(undefinedVariable); // ESLint: no-undef

// Unreachable code
return result;
console.log('This will never run'); // ESLint: no-unreachable

// Duplicate object keys
const config = {
  apiKey: 'key1',
  apiKey: 'key2', // ESLint: no-dupe-keys
};

// Function reassignment
function fetchData() {}
fetchData = 'not a function'; // ESLint: no-func-assign
```

**✅ Do these instead:**
```javascript
// Declare variables before use
const movieData = fetchMovieData();
console.log(movieData);

// Handle early returns properly  
if (!movie) {
  return <div>No movie found</div>;
}
console.log('Movie loaded:', movie.title);

// Use unique object keys
const config = {
  tmdbApiKey: 'key1',
  omdbApiKey: 'key2',
};

// Don't reassign functions
const fetchData = () => {
  // Function logic
};
```

## 🧪 JSX Fragment Rules

**Critical for build stability:**

```jsx
// ✅ Properly matched fragments
return (
  <>
    <div>Content 1</div>
    <div>Content 2</div>
  </>
);

// ✅ Conditional rendering with fragments
{isLoggedIn ? (
  <>
    <UserProfile />
    <Dashboard />
  </>
) : (
  <LoginForm />
)}

// ❌ Never leave orphaned closing tags
{someCondition && (
  <div>Content</div>
  // </> ← This breaks the build!
)}
```

## 🎨 CSS/Styling Standards

### CSS Modules (Preferred)
```javascript
// MovieCard.module.css
import styles from './MovieCard.module.css';

<div className={styles.container}>
  <h2 className={styles.title}>{title}</h2>
</div>
```

### Class naming (BEM-inspired)
```css
/* ✅ Good class names */
.movie-card { }
.movie-card__title { }
.movie-card__image { }
.movie-card--featured { }

/* ❌ Avoid generic names */
.container { } /* Too generic */
.item { } /* Too vague */
```

## 🔒 Security Standards

### Environment Variables
```javascript
// ✅ Always use environment variables for secrets
const apiKey = process.env.TMDB_API_KEY;

// ✅ Provide fallbacks for non-critical config
const cacheTimeout = process.env.CACHE_TIMEOUT || 300000;

// ❌ Never hardcode API keys
const apiKey = 'sk-1234567890abcdef'; // NEVER DO THIS
```

### Data Sanitization  
```javascript
// ✅ Sanitize user input
const safeTitle = title?.toString().trim().slice(0, 100);

// ✅ Validate required fields
if (!tmdb_id || typeof tmdb_id !== 'number') {
  throw new Error('Valid TMDB ID required');
}
```

## 📝 Comment Standards

### When to Comment

**✅ Good comments:**
```javascript
// Workaround for TMDB API rate limiting
await delay(100);

// CRITICAL: This tmdb_id is required for navigation
const movieObj = { tmdb_id: movie.id };

// TODO: Replace with proper error boundary
catch (error) {
  console.error('Failed to load movie:', error);
}
```

**❌ Bad comments:**
```javascript
// Set loading to true
setIsLoading(true); // Obvious from code

// Loop through movies
movies.forEach(movie => { // Comment adds no value
```

### Locked Component Comments
```javascript
/**
 * MediaCard Component - 🔒 LOCKED COMPONENT 🔒
 * @locked true
 * @version STABLE-2025-07-23
 * 
 * CRITICAL: Do not modify without checking LOCKED_COMPONENTS.md
 */
```

## 🚀 Performance Standards

### Image Optimization
```jsx
// ✅ Use Next.js Image component
import Image from 'next/image';

<Image
  src={posterUrl}
  alt={movieTitle}
  width={300}
  height={450}
  sizes="(max-width: 768px) 100vw, 300px"
/>

// ❌ Don't use raw img tags for dynamic content
<img src={posterUrl} alt={movieTitle} /> // Missing optimization
```

### API Call Patterns
```javascript
// ✅ Handle loading states
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

try {
  setIsLoading(true);
  const data = await fetchMovieData(id);
  setMovie(data);
} catch (err) {
  setError(err.message);
} finally {
  setIsLoading(false);
}
```

## 🛠️ Automated Enforcement

### Pre-commit Hooks
```bash
# Runs automatically on git commit
npm run validate:jsx    # JSX syntax validation
npm run check-locks     # Component lock verification  
npm run lint           # ESLint code quality
npm run typecheck      # TypeScript validation
```

### Build Process
```bash
# Runs on every build
npm run build
# Includes: JSX validation → ESLint → TypeScript → Next.js build
```

## ⚡ Quick Reference

### Daily Checklist
- [ ] **JSX fragments properly matched** (`<>` and `</>`)
- [ ] **No console.logs in production code** (dev only)
- [ ] **Environment variables for all secrets**
- [ ] **Proper TypeScript types** (when using TS)
- [ ] **Import statements organized** (React → 3rd party → internal)
- [ ] **Component names in PascalCase** 
- [ ] **File names follow convention** (kebab-case or PascalCase)

### Emergency Fixes
```bash
# Auto-fix many ESLint issues
npm run lint -- --fix

# Check specific file
npx eslint pages/movie/[id].js

# Validate JSX syntax
npm run validate:jsx -- --verbose
```

---

**🎯 Goal: Code that works reliably, reads clearly, and maintains easily**

**Last Updated:** March 17, 2026
**Review:** Monthly or when adding new developers