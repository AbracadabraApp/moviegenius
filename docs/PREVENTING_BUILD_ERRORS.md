# Preventing Build Errors - JSX Syntax Validation

## Overview

This document describes the automated system we've implemented to prevent JSX
syntax errors (like the "Unterminated regexp literal" error) from breaking the
build.

## The Problem

JSX syntax errors, particularly orphaned closing tags like `</>` without
matching opening tags, cause build failures with cryptic error messages like:

```
Error: × Unterminated regexp literal
./pages/movie/[id].js

Error: × Unterminated regexp literal
     ╭─[/Users/josh.petersen/moviegenius/pages/movie/[id].js:179:1]
 176 │                         router={router}
 177 │                       />
 178 │                     </div>
 179 │                   </>
     ·                    ──
```

## The Solution

We've implemented a comprehensive JSX validation system with three components:

### 1. JSX Syntax Validator Script

**File**: `scripts/validate-jsx-syntax.js`

**What it does**:

- Scans all JSX/React files in the codebase
- Detects orphaned JSX closing tags (`</>` without matching `<>`)
- Identifies unmatched JSX fragments in return statements
- Flags invalid JSX structures

**How to run**:

```bash
# Basic validation
npm run validate:jsx

# Verbose output (shows warnings too)
npm run validate:jsx -- --verbose
```

### 2. Automated Integration

**Pre-commit Hook**:

```json
"pre-commit": "npm run validate:jsx && npm run check-locks && npm run lint && npm run typecheck"
```

**Build Process**:

```json
"build": "npm run validate:jsx && rm -rf .next && next build"
```

### 3. Continuous Integration

The JSX validator runs automatically:

- ✅ **Before every commit** (via pre-commit hook)
- ✅ **Before every build** (via build script)
- ✅ **In CI/CD pipelines** (as part of build process)

## Common JSX Errors Detected

### 1. Orphaned Closing Tags

```jsx
// ❌ BAD - Will break build
{isNuclear && sections.length > 0 ? (
  <div style={styles.claudeContent}>
    <MovieContent />
  </div>
  </> // ← Orphaned closing tag!
) : (
  <ISRPlaceholder />
)}
```

```jsx
// ✅ GOOD - Properly matched
{
  isNuclear && sections.length > 0 ? (
    <>
      <div style={styles.claudeContent}>
        <MovieContent />
      </div>
    </>
  ) : (
    <ISRPlaceholder />
  );
}
```

### 2. Unmatched JSX Fragments

```jsx
// ❌ BAD - Unmatched fragments
return (
  <>
    <div>Content</div>
    <>
      <div>More content</div>
    // Missing closing tag
);
```

```jsx
// ✅ GOOD - Properly matched
return (
  <>
    <div>Content</div>
    <>
      <div>More content</div>
    </>
  </>
);
```

## How to Fix JSX Errors

When the validator finds errors, follow these steps:

1. **Identify the issue**: Look at the line number and error message
2. **Find the matching opening tag**: Search backwards for the corresponding
   `<>`
3. **Fix the structure**: Either add the missing opening tag or remove the
   orphaned closing tag
4. **Re-run validation**: `npm run validate:jsx`
5. **Test the build**: `npm run build`

## Manual Testing

To manually test for the specific error we fixed:

```bash
# This should fail if there are JSX syntax errors
npm run build

# This should pass if JSX is valid
npm run validate:jsx
```

## Best Practices

1. **Use your editor's JSX syntax highlighting** - Most editors will highlight
   unmatched tags
2. **Run validation frequently** during development
3. **Fix JSX errors immediately** - Don't let them accumulate
4. **Use consistent indentation** - Makes it easier to spot unmatched tags
5. **Use React Fragment shorthand carefully** - `<>` and `</>` must always be
   paired

## File Exclusions

The validator skips these directories:

- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- `.git/`
- `coverage/`
- `public/`
- `data/episodes/backups/`

## Troubleshooting

### False Positives

If the validator reports false positives:

1. Check if it's a legitimate JSX structure
2. Update the validator logic in `scripts/validate-jsx-syntax.js`
3. Add exclusion patterns if needed

### Validator Fails to Run

```bash
# Check if Node.js modules are installed
npm install

# Run validator directly
node scripts/validate-jsx-syntax.js
```

### Build Still Fails After Validation Passes

1. Clear Next.js cache: `rm -rf .next`
2. Re-run validation: `npm run validate:jsx`
3. Try building again: `npm run build`

## Future Improvements

- **IDE Integration**: Add validation to VS Code/other editors
- **Real-time Validation**: Run validation on file save
- **More Error Types**: Detect other common JSX/React errors
- **Performance Optimization**: Cache validation results for unchanged files

## Summary

This JSX validation system ensures that syntax errors like orphaned JSX closing
tags are caught before they break the build, providing:

- ✅ **Early detection** of JSX syntax errors
- ✅ **Automated prevention** via pre-commit hooks and build integration
- ✅ **Clear error messages** with line numbers and context
- ✅ **Fast feedback** for developers during development

The system has successfully prevented the "Unterminated regexp literal" error
and will catch similar issues in the future.
