# 🔒 MovieGenius Git Hooks

This directory contains Git hooks that protect critical components from
unauthorized modifications.

## Pre-commit Hook

The `pre-commit` hook automatically runs the component integrity checker before
allowing commits.

### What it protects:

- **MediaCard.js** - Core movie card component used site-wide
- **Movie detail pages** - Critical navigation and content display logic
- **Other locked components** - As defined in
  `scripts/check-locked-components.js`

### How it works:

1. Runs `node scripts/check-locked-components.js` before each commit
2. Blocks commit if locked component violations are detected
3. Shows clear error messages with remediation steps

### Setup:

```bash
# Enable hooks (already done for this repo)
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

### Emergency Override:

```bash
# Only use in genuine emergencies
git commit --no-verify
```

### Adding New Protected Components:

1. Edit `scripts/check-locked-components.js`
2. Add component path and critical sections
3. Test with `node scripts/check-locked-components.js`
4. Document protection rationale

## Maintenance

The hooks are automatically activated for all developers when they clone the
repository and run the setup commands.
